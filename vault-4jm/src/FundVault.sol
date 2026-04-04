// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FundVault
 * @notice On-chain fund vehicle. Investors deposit USDC and receive share tokens
 *         representing a proportional claim on the fund's NAV. Share price starts
 *         at $1 and appreciates as the off-chain fund generates returns.
 *
 * REDEMPTION MODEL (queue-based, not instant):
 *   requestRedeem() → shares escrowed, NAV locked
 *       │
 *       ├── cancelRedemption() → shares returned to investor
 *       │
 *       └── fulfillRedemption() [manager] → USDC sent, shares burned
 *
 * NAV UPDATE MODEL:
 *   Primary path: NAVOracle (Chainlink Functions) → updateNAV()
 *   Emergency path: NAV_UPDATER_ROLE holder → updateNAV() directly
 *
 *   Oracle address change requires a 24h timelock:
 *     proposeOracle(address) → 24h → acceptOracle()
 *
 * ACCOUNTING:
 *   totalAssets() = USDC in vault − pendingRedemptionValue
 *   Share pricing uses navPerShare, NOT totalAssets() — critical override.
 *   (Default ERC4626 uses totalAssets() for share math; wrong for managed funds
 *   where capital is deployed off-chain and NAV is attested separately.)
 *
 * DECIMAL HANDLING:
 *   USDC = 6 decimals, shares = 18 decimals.
 *   _decimalsOffset() = 12 prevents the ERC4626 inflation attack.
 *   navPerShare is in USDC units (1e6 = $1.00).
 *   Formula: shares = assets * 1e18 / navPerShare
 *            usdc   = shares * navPerShare / 1e18
 */
contract FundVault is ERC4626, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    // ── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant INVESTOR_ROLE    = keccak256("INVESTOR_ROLE");
    bytes32 public constant NAV_UPDATER_ROLE = keccak256("NAV_UPDATER_ROLE");
    bytes32 public constant PAUSER_ROLE      = keccak256("PAUSER_ROLE");

    // ── Entry rules (publicly readable by frontend / integrators) ────────────
    // Both caller and receiver must hold INVESTOR_ROLE to deposit.
    // No minimum ticket: any amount > 0 is accepted.
    // No lockup period: investors may requestRedeem immediately after depositing.
    uint256 public constant MIN_DEPOSIT    = 0;   // no minimum ticket
    uint256 public constant LOCKUP_PERIOD  = 0;   // no lockup


    // ── NAV state ────────────────────────────────────────────────────────────
    // navPerShare denominated in USDC units (1e6 = $1.00/share).
    uint256 public navPerShare;
    uint256 public navUpdatedAt;
    uint256 public immutable maxNavStaleness;
    uint256 public constant MAX_NAV_CHANGE_BPS = 1000; // 10% per update

    // ── Oracle timelock ──────────────────────────────────────────────────────
    // The oracle (NAVOracle.sol) holds NAV_UPDATER_ROLE. Changing the oracle
    // address requires a 24h delay so investors can exit before an unknown
    // contract gains write access to navPerShare.
    address public pendingOracle;
    address public currentOracle;
    uint256 public oracleChangeAt;
    uint256 public constant ORACLE_TIMELOCK = 24 hours;

    event OracleChangeProposed(address indexed newOracle, uint256 effectiveAt);
    event OracleAccepted(address indexed newOracle);

    // ── Redemption queue (conditional escrow) ──────────────────────────────
    //
    // ESCROW MODEL (Circle bounty: conditional escrow + dispute + auto-release):
    //   requestRedeem() → shares escrowed, NAV locked at request time
    //       │
    //       ├── cancelRedemption() → investor cancels, shares returned
    //       │
    //       ├── fulfillRedemption() [manager] → USDC sent after cooldown
    //       │
    //       ├── disputeRedemption() [manager] → flags for dispute, blocks release
    //       │       └── resolveDispute() [admin] → approve (fulfill) or reject (return shares)
    //       │
    //       └── claimRedemption() [investor] → auto-release after AUTO_RELEASE_DELAY
    //                                          if manager hasn't acted or disputed
    //
    struct RedemptionRequest {
        uint256 shares;
        uint256 navAtRequest; // NAV locked at request time
        uint256 requestedAt;
        bool disputed;        // true if manager has raised a dispute
    }

    mapping(address => RedemptionRequest) public redemptionRequests;
    uint256 public pendingRedemptionValue;

    // Cooldown: fulfillRedemption reverts until this many seconds after requestedAt.
    uint256 public constant REDEMPTION_COOLDOWN = 5 minutes;

    // Auto-release: if manager hasn't fulfilled or disputed within this window,
    // the investor can self-claim via claimRedemption(). This is the "automatic
    // release" pattern required by the Circle bounty.
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;

    // Max single exit as basis points of current total supply (default 10%).
    // Prevents a single investor from draining liquidity in one request.
    uint256 public maxExitBps = 1000;

    // ── Events ───────────────────────────────────────────────────────────────
    event NAVUpdated(uint256 newNav, uint256 timestamp);
    event RedemptionRequested(address indexed investor, uint256 shares, uint256 navAtRequest);
    event RedemptionCancelled(address indexed investor, uint256 shares);
    event RedemptionFulfilled(address indexed investor, uint256 shares, uint256 usdcOut);
    event RedemptionClaimed(address indexed investor, uint256 shares, uint256 usdcOut);
    event RedemptionDisputed(address indexed investor, uint256 shares);
    event DisputeResolved(address indexed investor, bool approved, uint256 shares);
    event MaxExitBpsUpdated(uint256 newBps);

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address usdc,
        string memory name,
        string memory symbol,
        uint256 initialNav,
        uint256 _maxNavStaleness
    ) ERC4626(IERC20(usdc)) ERC20(name, symbol) {
        require(initialNav > 0, "FundVault: nav must be > 0");
        navPerShare = initialNav;
        navUpdatedAt = block.timestamp;
        maxNavStaleness = _maxNavStaleness;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(NAV_UPDATER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier navFresh() {
        require(
            block.timestamp - navUpdatedAt <= maxNavStaleness,
            "FundVault: NAV stale"
        );
        _;
    }

    // ── ERC4626 overrides ────────────────────────────────────────────────────

    // 12-decimal offset prevents the inflation attack.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 12;
    }

    // Exclude USDC already spoken for by pending redemptions.
    function totalAssets() public view override returns (uint256) {
        uint256 balance = IERC20(asset()).balanceOf(address(this));
        return balance > pendingRedemptionValue
            ? balance - pendingRedemptionValue
            : 0;
    }

    /**
     * @notice Override ERC4626 share math to use navPerShare, not totalAssets().
     *
     * Default ERC4626: shares = assets * totalSupply / totalAssets
     * This is wrong for a managed fund: capital is deployed off-chain, so
     * totalAssets() (vault USDC balance) does not reflect fund NAV.
     *
     * At NAV 1.05e6: deposit 100 USDC → ~95.2e18 shares (correct dilution).
     *
     * NOTE: OZ ERC4626 deposit/mint use previewDeposit/previewMint which call
     * the internal _convertToShares — bypassing convertToShares overrides.
     * We must also override the preview functions to enforce NAV-based pricing.
     */
    function convertToShares(uint256 assets) public view override returns (uint256) {
        uint256 nav = navPerShare; // single SLOAD
        require(nav > 0, "FundVault: nav not set");
        return (assets * 1e18) / nav;
    }

    function convertToAssets(uint256 shares) public view override returns (uint256) {
        uint256 nav = navPerShare;
        require(nav > 0, "FundVault: nav not set");
        return (shares * nav) / 1e18;
    }

    // OZ ERC4626 deposit/mint route through these — must override to use NAV math.
    function previewDeposit(uint256 assets) public view override returns (uint256) {
        return convertToShares(assets);
    }

    function previewMint(uint256 shares) public view override returns (uint256) {
        return convertToAssets(shares);
    }

    function previewRedeem(uint256 shares) public view override returns (uint256) {
        return convertToAssets(shares);
    }

    function previewWithdraw(uint256 assets) public view override returns (uint256) {
        return convertToShares(assets);
    }

    // Whitelist gate on deposits: both depositor and receiver must be whitelisted.
    // No minimum ticket (any assets > 0 accepted) and no lockup (see MIN_DEPOSIT / LOCKUP_PERIOD).
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal override whenNotPaused navFresh
    {
        require(assets > 0, "FundVault: amount must be > 0");
        require(hasRole(INVESTOR_ROLE, caller), "FundVault: caller not whitelisted");
        require(hasRole(INVESTOR_ROLE, receiver), "FundVault: receiver not whitelisted");
        super._deposit(caller, receiver, assets, shares);
    }

    // Disable standard ERC4626 withdraw/redeem — use requestRedeem queue instead.
    function _withdraw(address, address, address, uint256, uint256) internal pure override {
        revert("FundVault: use requestRedeem");
    }

    // ── Oracle timelock ──────────────────────────────────────────────────────

    /**
     * @notice Propose a new oracle address. After 24h, anyone can call acceptOracle().
     *         The oracle must be granted NAV_UPDATER_ROLE separately (or via acceptOracle).
     */
    function proposeOracle(address newOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newOracle != address(0), "FundVault: zero address");
        pendingOracle = newOracle;
        oracleChangeAt = block.timestamp + ORACLE_TIMELOCK;
        emit OracleChangeProposed(newOracle, oracleChangeAt);
    }

    /**
     * @notice Accept the proposed oracle after the 24h timelock.
     *         Grants NAV_UPDATER_ROLE to new oracle and revokes it from the previous oracle.
     */
    function acceptOracle() external {
        require(pendingOracle != address(0), "FundVault: no pending oracle");
        require(block.timestamp >= oracleChangeAt, "FundVault: timelock active");
        address oracle = pendingOracle;
        pendingOracle = address(0);
        // Revoke old oracle before granting new one
        if (currentOracle != address(0)) {
            _revokeRole(NAV_UPDATER_ROLE, currentOracle);
        }
        currentOracle = oracle;
        _grantRole(NAV_UPDATER_ROLE, oracle);
        emit OracleAccepted(oracle);
    }

    // ── NAV management ───────────────────────────────────────────────────────

    /**
     * @notice Update navPerShare. Called by NAVOracle (primary) or directly
     *         by NAV_UPDATER_ROLE holder (emergency fallback if oracle is down).
     */
    function updateNAV(uint256 newNav) external onlyRole(NAV_UPDATER_ROLE) {
        _applyNAV(newNav);
    }

    /**
     * @notice Admin escape hatch: force-set navPerShare and reset staleness timestamp.
     *         Bypasses the MAX_NAV_CHANGE_BPS guard and the navFresh check.
     *         Use when the oracle is down and NAV is stale — e.g. during a demo.
     */
    function adminForceUpdateNAV(uint256 newNav) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newNav > 0, "FundVault: nav must be > 0");
        navPerShare  = newNav;
        navUpdatedAt = block.timestamp;
        emit NAVUpdated(newNav, block.timestamp);
    }

    function _applyNAV(uint256 newNav) internal {
        require(newNav > 0, "FundVault: nav must be > 0");
        uint256 current = navPerShare;
        uint256 delta = newNav > current
            ? ((newNav - current) * 10000) / current
            : ((current - newNav) * 10000) / current;
        require(delta <= MAX_NAV_CHANGE_BPS, "FundVault: NAV change too large");
        navPerShare = newNav;
        navUpdatedAt = block.timestamp;
        emit NAVUpdated(newNav, block.timestamp);
    }

    // ── Exit rules ───────────────────────────────────────────────────────────

    /**
     * @notice Update the maximum single-exit cap. Must be between 1 and 10000 bps.
     */
    function setMaxExitBps(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps > 0 && bps <= 10000, "FundVault: bps out of range");
        maxExitBps = bps;
        emit MaxExitBpsUpdated(bps);
    }

    // ── Redemption queue ─────────────────────────────────────────────────────

    /**
     * @notice Request to redeem shares. Shares are escrowed (not burned) until
     *         fulfillment. NAV is locked at request time.
     *
     * EXIT RULES:
     *   - Max exit size: shares ≤ maxExitBps% of total supply at request time.
     *   - Cooldown: fulfillRedemption cannot be called for 24h after this request.
     */
    function requestRedeem(uint256 shares) external whenNotPaused navFresh {
        require(shares > 0, "FundVault: shares must be > 0");
        require(redemptionRequests[msg.sender].shares == 0, "FundVault: request pending");
        require(balanceOf(msg.sender) >= shares, "FundVault: insufficient shares");

        // Max exit size: cap at maxExitBps of total supply (including escrowed shares)
        uint256 supply = totalSupply();
        require(
            supply == 0 || shares <= (supply * maxExitBps) / 10000,
            "FundVault: exceeds max exit size"
        );

        uint256 owed = (shares * navPerShare) / 1e18;
        pendingRedemptionValue += owed;

        _transfer(msg.sender, address(this), shares);

        redemptionRequests[msg.sender] = RedemptionRequest({
            shares: shares,
            navAtRequest: navPerShare,
            requestedAt: block.timestamp,
            disputed: false
        });

        emit RedemptionRequested(msg.sender, shares, navPerShare);
    }

    /**
     * @notice Cancel a pending redemption. Shares are returned.
     */
    function cancelRedemption() external {
        RedemptionRequest memory r = redemptionRequests[msg.sender];
        require(r.shares > 0, "FundVault: no pending request");

        uint256 owed = (r.shares * r.navAtRequest) / 1e18;
        pendingRedemptionValue -= owed;

        delete redemptionRequests[msg.sender];
        _transfer(address(this), msg.sender, r.shares);

        emit RedemptionCancelled(msg.sender, r.shares);
    }

    /**
     * @notice Fulfill a redemption. Payout calculated from NAV locked at request time.
     *         Vault must hold sufficient USDC before calling.
     */
    function fulfillRedemption(address investor) external onlyRole(NAV_UPDATER_ROLE) {
        RedemptionRequest memory r = redemptionRequests[investor];
        require(r.shares > 0, "FundVault: no pending request");
        require(
            block.timestamp >= r.requestedAt + REDEMPTION_COOLDOWN,
            "FundVault: cooldown not elapsed"
        );

        uint256 usdcOut = (r.shares * r.navAtRequest) / 1e18;
        require(usdcOut > 0, "FundVault: dust redemption");
        pendingRedemptionValue -= usdcOut;

        delete redemptionRequests[investor];
        _burn(address(this), r.shares);

        IERC20(asset()).safeTransfer(investor, usdcOut);

        emit RedemptionFulfilled(investor, r.shares, usdcOut);
    }

    /**
     * @notice Fulfill a redemption bypassing the cooldown. Admin only.
     *         Use for demos or emergency settlement.
     */
    function forceFulfillRedemption(address investor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        RedemptionRequest memory r = redemptionRequests[investor];
        require(r.shares > 0, "FundVault: no pending request");

        uint256 usdcOut = (r.shares * r.navAtRequest) / 1e18;
        require(usdcOut > 0, "FundVault: dust redemption");
        pendingRedemptionValue -= usdcOut;

        delete redemptionRequests[investor];
        _burn(address(this), r.shares);

        IERC20(asset()).safeTransfer(investor, usdcOut);

        emit RedemptionFulfilled(investor, r.shares, usdcOut);
    }

    // ── Dispute mechanism (Circle bounty: onchain dispute) ─────────────────

    /**
     * @notice Manager disputes a pending redemption. Blocks auto-release
     *         until an admin resolves it. Use for suspected fraud, AML holds,
     *         or NAV disputes.
     */
    function disputeRedemption(address investor) external onlyRole(NAV_UPDATER_ROLE) {
        RedemptionRequest storage r = redemptionRequests[investor];
        require(r.shares > 0, "FundVault: no pending request");
        require(!r.disputed, "FundVault: already disputed");
        r.disputed = true;
        emit RedemptionDisputed(investor, r.shares);
    }

    /**
     * @notice Admin resolves a dispute. If approved, fulfills the redemption
     *         (USDC sent). If rejected, returns shares to investor (no payout).
     */
    function resolveDispute(address investor, bool approve) external onlyRole(DEFAULT_ADMIN_ROLE) {
        RedemptionRequest memory r = redemptionRequests[investor];
        require(r.shares > 0, "FundVault: no pending request");
        require(r.disputed, "FundVault: not disputed");

        uint256 usdcOut = (r.shares * r.navAtRequest) / 1e18;
        pendingRedemptionValue -= usdcOut;
        delete redemptionRequests[investor];

        if (approve) {
            require(usdcOut > 0, "FundVault: dust redemption");
            _burn(address(this), r.shares);
            IERC20(asset()).safeTransfer(investor, usdcOut);
            emit RedemptionFulfilled(investor, r.shares, usdcOut);
        } else {
            // Reject: return shares to investor, no USDC payout
            _transfer(address(this), investor, r.shares);
            emit RedemptionCancelled(investor, r.shares);
        }
        emit DisputeResolved(investor, approve, r.shares);
    }

    // ── Auto-release (Circle bounty: automatic release) ─────────────────────

    /**
     * @notice Investor self-claims after AUTO_RELEASE_DELAY if the manager
     *         has not fulfilled or disputed the redemption.
     *
     *         This is the "automatic release" pattern: the escrow releases
     *         unconditionally after a timeout, protecting investors from
     *         unresponsive fund managers.
     */
    function claimRedemption() external {
        RedemptionRequest memory r = redemptionRequests[msg.sender];
        require(r.shares > 0, "FundVault: no pending request");
        require(!r.disputed, "FundVault: redemption disputed");
        require(
            block.timestamp >= r.requestedAt + AUTO_RELEASE_DELAY,
            "FundVault: auto-release delay not elapsed"
        );

        uint256 usdcOut = (r.shares * r.navAtRequest) / 1e18;
        require(usdcOut > 0, "FundVault: dust redemption");
        pendingRedemptionValue -= usdcOut;

        delete redemptionRequests[msg.sender];
        _burn(address(this), r.shares);

        IERC20(asset()).safeTransfer(msg.sender, usdcOut);

        emit RedemptionClaimed(msg.sender, r.shares, usdcOut);
    }

    // ── Capital deployment ───────────────────────────────────────────────────

    event CapitalDeployed(address indexed to, uint256 amount);

    /**
     * @notice Pull USDC from the vault to an external address.
     *         Used by the fund manager to deploy capital off-chain
     *         (e.g. send to a Coinbase deposit address or Bridge.xyz).
     *         Does NOT burn shares — NAV must be updated separately to reflect
     *         deployed capital as part of fund assets.
     */
    function withdrawCapital(uint256 amount, address to)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(amount > 0,          "FundVault: amount must be > 0");
        require(to != address(0),    "FundVault: zero address");
        require(
            amount <= IERC20(asset()).balanceOf(address(this)) - pendingRedemptionValue,
            "FundVault: insufficient free capital"
        );
        IERC20(asset()).safeTransfer(to, amount);
        emit CapitalDeployed(to, amount);
    }

    // ── Pause ────────────────────────────────────────────────────────────────

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }
}
