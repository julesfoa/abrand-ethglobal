// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    ABRAND — Smart Contracts (Complete)                      ║
// ║              ETHGlobal Cannes Hackathon · Solidity + Foundry               ║
// ║                                                                            ║
// ║  Stack: Solidity 0.8.20+ · OpenZeppelin · Chainlink Functions/CRE/Feeds   ║
// ║  Chains: Base Sepolia (84532) · Arc Testnet (5042002)                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// TABLE OF CONTENTS
// ─────────────────
// 1. FundVault.sol         — ERC4626 vault with NAV-based pricing, queue-based
//                            redemptions, conditional escrow, dispute mechanism,
//                            oracle timelock, and exit caps.
//
// 2. NAVOracle.sol         — Chainlink Functions + Automation integration.
//                            Fetches auditor-signed NAV via EIP-712 and pushes
//                            to FundVault.
//
// 3. NAVConsumer.sol       — CRE (Chainlink Runtime Environment) report receiver.
//                            Replaces NAVOracle in CRE architecture. Includes
//                            Chainlink Price Feed benchmark checks.
//
// 4. VaultFactory.sol      — Factory for deploying FundVault instances.
//
// 5. MockFunctionsRouter.sol — Stub Chainlink Functions router for chains
//                              without Chainlink support (Arc testnet).
//
// 6. ABRANDPool.sol        — Retail liquidity pool. Depositors get 1:1 shares,
//                            whitelisted hedge funds redeem USDC.
//
// 7. AccessRegistry.sol    — Hedge fund whitelist.
//
// 8. Deploy.s.sol          — Full deployment script (Base Sepolia + Arc).


// ═══════════════════════════════════════════════════════════════════════════════
// 1. FundVault.sol
// ═══════════════════════════════════════════════════════════════════════════════

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
    uint256 public constant MIN_DEPOSIT    = 0;   // no minimum ticket
    uint256 public constant LOCKUP_PERIOD  = 0;   // no lockup

    // ── NAV state ────────────────────────────────────────────────────────────
    uint256 public navPerShare;
    uint256 public navUpdatedAt;
    uint256 public immutable maxNavStaleness;
    uint256 public constant MAX_NAV_CHANGE_BPS = 1000; // 10% per update

    // ── Oracle timelock ──────────────────────────────────────────────────────
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
        uint256 navAtRequest;
        uint256 requestedAt;
        bool disputed;
    }

    mapping(address => RedemptionRequest) public redemptionRequests;
    uint256 public pendingRedemptionValue;

    uint256 public constant REDEMPTION_COOLDOWN = 5 minutes;
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;
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

    modifier navFresh() {
        require(block.timestamp - navUpdatedAt <= maxNavStaleness, "FundVault: NAV stale");
        _;
    }

    // ── ERC4626 overrides ────────────────────────────────────────────────────

    function _decimalsOffset() internal pure override returns (uint8) { return 12; }

    function totalAssets() public view override returns (uint256) {
        uint256 balance = IERC20(asset()).balanceOf(address(this));
        return balance > pendingRedemptionValue ? balance - pendingRedemptionValue : 0;
    }

    function convertToShares(uint256 assets) public view override returns (uint256) {
        uint256 nav = navPerShare;
        require(nav > 0, "FundVault: nav not set");
        return (assets * 1e18) / nav;
    }

    function convertToAssets(uint256 shares) public view override returns (uint256) {
        uint256 nav = navPerShare;
        require(nav > 0, "FundVault: nav not set");
        return (shares * nav) / 1e18;
    }

    function previewDeposit(uint256 assets) public view override returns (uint256) { return convertToShares(assets); }
    function previewMint(uint256 shares) public view override returns (uint256) { return convertToAssets(shares); }
    function previewRedeem(uint256 shares) public view override returns (uint256) { return convertToAssets(shares); }
    function previewWithdraw(uint256 assets) public view override returns (uint256) { return convertToShares(assets); }

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal override whenNotPaused navFresh
    {
        require(assets > 0, "FundVault: amount must be > 0");
        require(hasRole(INVESTOR_ROLE, caller), "FundVault: caller not whitelisted");
        require(hasRole(INVESTOR_ROLE, receiver), "FundVault: receiver not whitelisted");
        super._deposit(caller, receiver, assets, shares);
    }

    function _withdraw(address, address, address, uint256, uint256) internal pure override {
        revert("FundVault: use requestRedeem");
    }

    // ── Oracle timelock ──────────────────────────────────────────────────────

    function proposeOracle(address newOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newOracle != address(0), "FundVault: zero address");
        pendingOracle = newOracle;
        oracleChangeAt = block.timestamp + ORACLE_TIMELOCK;
        emit OracleChangeProposed(newOracle, oracleChangeAt);
    }

    function acceptOracle() external {
        require(pendingOracle != address(0), "FundVault: no pending oracle");
        require(block.timestamp >= oracleChangeAt, "FundVault: timelock active");
        address oracle = pendingOracle;
        pendingOracle = address(0);
        if (currentOracle != address(0)) { _revokeRole(NAV_UPDATER_ROLE, currentOracle); }
        currentOracle = oracle;
        _grantRole(NAV_UPDATER_ROLE, oracle);
        emit OracleAccepted(oracle);
    }

    // ── NAV management ───────────────────────────────────────────────────────

    function updateNAV(uint256 newNav) external onlyRole(NAV_UPDATER_ROLE) { _applyNAV(newNav); }

    function adminForceUpdateNAV(uint256 newNav) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newNav > 0, "FundVault: nav must be > 0");
        navPerShare = newNav;
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

    function setMaxExitBps(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps > 0 && bps <= 10000, "FundVault: bps out of range");
        maxExitBps = bps;
        emit MaxExitBpsUpdated(bps);
    }

    // ── Redemption queue ─────────────────────────────────────────────────────

    function requestRedeem(uint256 shares) external whenNotPaused navFresh {
        require(shares > 0, "FundVault: shares must be > 0");
        require(redemptionRequests[msg.sender].shares == 0, "FundVault: request pending");
        require(balanceOf(msg.sender) >= shares, "FundVault: insufficient shares");
        uint256 supply = totalSupply();
        require(supply == 0 || shares <= (supply * maxExitBps) / 10000, "FundVault: exceeds max exit size");
        uint256 owed = (shares * navPerShare) / 1e18;
        pendingRedemptionValue += owed;
        _transfer(msg.sender, address(this), shares);
        redemptionRequests[msg.sender] = RedemptionRequest({ shares: shares, navAtRequest: navPerShare, requestedAt: block.timestamp, disputed: false });
        emit RedemptionRequested(msg.sender, shares, navPerShare);
    }

    function cancelRedemption() external {
        RedemptionRequest memory r = redemptionRequests[msg.sender];
        require(r.shares > 0, "FundVault: no pending request");
        uint256 owed = (r.shares * r.navAtRequest) / 1e18;
        pendingRedemptionValue -= owed;
        delete redemptionRequests[msg.sender];
        _transfer(address(this), msg.sender, r.shares);
        emit RedemptionCancelled(msg.sender, r.shares);
    }

    function fulfillRedemption(address investor) external onlyRole(NAV_UPDATER_ROLE) {
        RedemptionRequest memory r = redemptionRequests[investor];
        require(r.shares > 0, "FundVault: no pending request");
        require(block.timestamp >= r.requestedAt + REDEMPTION_COOLDOWN, "FundVault: cooldown not elapsed");
        uint256 usdcOut = (r.shares * r.navAtRequest) / 1e18;
        require(usdcOut > 0, "FundVault: dust redemption");
        pendingRedemptionValue -= usdcOut;
        delete redemptionRequests[investor];
        _burn(address(this), r.shares);
        IERC20(asset()).safeTransfer(investor, usdcOut);
        emit RedemptionFulfilled(investor, r.shares, usdcOut);
    }

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

    // ── Dispute mechanism (Circle bounty) ─────────────────────────────────

    function disputeRedemption(address investor) external onlyRole(NAV_UPDATER_ROLE) {
        RedemptionRequest storage r = redemptionRequests[investor];
        require(r.shares > 0, "FundVault: no pending request");
        require(!r.disputed, "FundVault: already disputed");
        r.disputed = true;
        emit RedemptionDisputed(investor, r.shares);
    }

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
            _transfer(address(this), investor, r.shares);
            emit RedemptionCancelled(investor, r.shares);
        }
        emit DisputeResolved(investor, approve, r.shares);
    }

    // ── Auto-release (Circle bounty) ─────────────────────────────────────

    function claimRedemption() external {
        RedemptionRequest memory r = redemptionRequests[msg.sender];
        require(r.shares > 0, "FundVault: no pending request");
        require(!r.disputed, "FundVault: redemption disputed");
        require(block.timestamp >= r.requestedAt + AUTO_RELEASE_DELAY, "FundVault: auto-release delay not elapsed");
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

    function withdrawCapital(uint256 amount, address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount > 0, "FundVault: amount must be > 0");
        require(to != address(0), "FundVault: zero address");
        require(amount <= IERC20(asset()).balanceOf(address(this)) - pendingRedemptionValue, "FundVault: insufficient free capital");
        IERC20(asset()).safeTransfer(to, amount);
        emit CapitalDeployed(to, amount);
    }

    // ── Pause ────────────────────────────────────────────────────────────────

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 2. NAVOracle.sol
// ═══════════════════════════════════════════════════════════════════════════════

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

interface IFundVault {
    function updateNAV(uint256 newNav) external;
    function navPerShare() external view returns (uint256);
    function navUpdatedAt() external view returns (uint256);
}

/**
 * @title NAVOracle
 * @notice Fetches auditor-signed NAV updates from an off-chain API via
 *         Chainlink Functions and pushes them to FundVault.
 *
 * FLOW:
 *   Chainlink Automation (hourly) → requestNAVUpdate()
 *     → Chainlink Functions DON fetches {nav, timestamp, nonce, sig} from API
 *     → fulfillRequest() verifies EIP-712 sig from registered auditor
 *     → calls vault.updateNAV(nav)
 *
 * REPLAY PROTECTION:
 *   - nonce: monotonic counter, must be > lastNonce
 *   - timestamp: must be newer than last NAV update AND within MAX_PAYLOAD_AGE
 *   - vault: bound in EIP-712 struct — sig for vault A cannot be used on vault B
 */
contract NAVOracle is FunctionsClient, AutomationCompatibleInterface, EIP712, Ownable {
    using FunctionsRequest for FunctionsRequest.Request;
    using ECDSA for bytes32;

    bytes32 public constant NAV_UPDATE_TYPEHASH = keccak256(
        "NAVUpdate(address vault,uint256 nav,uint256 timestamp,uint256 nonce)"
    );

    IFundVault public immutable vault;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    bytes32 public donId;
    string public jsSource;

    mapping(address => bool) public isAuditor;
    uint256 public lastNonce;
    uint256 public lastRequestedAt;
    uint256 public requestInterval;
    uint256 public constant MAX_PAYLOAD_AGE = 2 hours;
    bytes32 public lastRequestId;

    event AuditorAdded(address indexed auditor);
    event AuditorRemoved(address indexed auditor);
    event NAVRequestSent(bytes32 indexed requestId);
    event NAVUpdatedViaOracle(uint256 nav, uint256 timestamp, address auditor);
    event FulfillError(bytes32 indexed requestId, bytes err);

    constructor(
        address functionsRouter, address _vault, uint64 _subscriptionId,
        uint32 _gasLimit, bytes32 _donId, uint256 _requestInterval, string memory _jsSource
    ) FunctionsClient(functionsRouter) EIP712("NAVOracle", "1") Ownable(msg.sender) {
        vault = IFundVault(_vault);
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donId = _donId;
        requestInterval = _requestInterval;
        jsSource = _jsSource;
        lastRequestedAt = block.timestamp;
    }

    function addAuditor(address auditor) external onlyOwner { require(auditor != address(0)); isAuditor[auditor] = true; emit AuditorAdded(auditor); }
    function removeAuditor(address auditor) external onlyOwner { isAuditor[auditor] = false; emit AuditorRemoved(auditor); }

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded = block.timestamp >= lastRequestedAt + requestInterval;
    }

    function performUpkeep(bytes calldata) external override {
        require(block.timestamp >= lastRequestedAt + requestInterval, "NAVOracle: too soon");
        _sendNAVRequest();
    }

    function requestNAVUpdate() external {
        require(block.timestamp >= lastRequestedAt + requestInterval, "NAVOracle: too soon");
        _sendNAVRequest();
    }

    function _sendNAVRequest() internal {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(jsSource);
        bytes32 requestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
        lastRequestId = requestId;
        lastRequestedAt = block.timestamp;
        emit NAVRequestSent(requestId);
    }

    function _applySignedNAV(uint256 nav, uint256 timestamp, uint256 nonce, bytes memory sig) internal {
        require(timestamp + MAX_PAYLOAD_AGE >= block.timestamp, "NAVOracle: payload too old");
        require(timestamp > vault.navUpdatedAt(), "NAVOracle: timestamp not newer");
        require(nonce > lastNonce, "NAVOracle: nonce replay");
        bytes32 structHash = keccak256(abi.encode(NAV_UPDATE_TYPEHASH, address(vault), nav, timestamp, nonce));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(sig);
        require(isAuditor[signer], "NAVOracle: invalid signer");
        require(nav > 0, "NAVOracle: nav must be > 0");
        lastNonce = nonce;
        vault.updateNAV(nav);
        emit NAVUpdatedViaOracle(nav, timestamp, signer);
    }

    function submitSignedNAV(uint256 nav, uint256 timestamp, uint256 nonce, bytes calldata sig) external {
        _applySignedNAV(nav, timestamp, nonce, sig);
    }

    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        if (err.length > 0) { emit FulfillError(requestId, err); return; }
        (uint256 nav, uint256 timestamp, uint256 nonce, bytes memory sig) = abi.decode(response, (uint256, uint256, uint256, bytes));
        _applySignedNAV(nav, timestamp, nonce, sig);
    }

    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner { subscriptionId = _subscriptionId; }
    function setGasLimit(uint32 _gasLimit) external onlyOwner { gasLimit = _gasLimit; }
    function setJsSource(string calldata _jsSource) external onlyOwner { jsSource = _jsSource; }
    function setRequestInterval(uint256 _interval) external onlyOwner { requestInterval = _interval; }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. NAVConsumer.sol — CRE Report Receiver + Chainlink Price Feed Benchmark
// ═══════════════════════════════════════════════════════════════════════════════

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

interface IFundVaultConsumer {
    function updateNAV(uint256 newNav) external;
    function navPerShare() external view returns (uint256);
}

/**
 * @title NAVConsumer
 * @notice CRE report receiver. Accepts NAV updates from the Chainlink Runtime
 *         Environment (CRE) DON and pushes them to FundVault.
 *
 * DUAL TRUST MODEL:
 *   1. CRE DON guarantees the workflow ran correctly (forwarder check)
 *   2. Auditor EIP-712 sig guarantees the NAV value is authentic
 *
 * CHAINLINK PRICE FEED (Connect the World bounty):
 *   On every NAV update, reads ETH/USD price feed and stores the benchmark
 *   price on-chain. Emits warning if NAV deviates >50% from benchmark.
 */
contract NAVConsumer is Ownable, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant NAV_UPDATE_TYPEHASH = keccak256("NAVUpdate(address vault,uint256 nav,uint256 timestamp,uint256 nonce)");

    IFundVaultConsumer public immutable vault;
    address public creForwarder;
    mapping(address => bool) public isAuditor;

    AggregatorV3Interface public benchmarkFeed;
    int256 public lastBenchmarkPrice;
    uint256 public lastBenchmarkUpdatedAt;
    uint8 public benchmarkDecimals;
    uint256 public constant BENCHMARK_DEVIATION_BPS = 5000;

    uint256 public lastNonce;
    uint256 public lastUpdatedAt;
    uint256 public constant MAX_PAYLOAD_AGE = 2 hours;
    uint256 public latestNav;

    event NAVReported(uint256 nav, uint256 timestamp, uint256 nonce);
    event BenchmarkUpdated(int256 price, uint256 feedTimestamp, uint256 roundId);
    event BenchmarkDeviationWarning(uint256 nav, int256 benchmarkPrice);
    event AuditorAdded(address indexed auditor);
    event AuditorRemoved(address indexed auditor);
    event CREForwarderSet(address indexed forwarder);
    event BenchmarkFeedSet(address indexed feed);

    constructor(address _vault, address _creForwarder, address _benchmarkFeed)
        Ownable(msg.sender) EIP712("NAVConsumer", "1")
    {
        require(_vault != address(0), "NAVConsumer: zero vault");
        vault = IFundVaultConsumer(_vault);
        if (_creForwarder != address(0)) { creForwarder = _creForwarder; emit CREForwarderSet(_creForwarder); }
        if (_benchmarkFeed != address(0)) {
            benchmarkFeed = AggregatorV3Interface(_benchmarkFeed);
            benchmarkDecimals = benchmarkFeed.decimals();
            emit BenchmarkFeedSet(_benchmarkFeed);
        }
    }

    function addAuditor(address auditor) external onlyOwner { require(auditor != address(0)); isAuditor[auditor] = true; emit AuditorAdded(auditor); }
    function removeAuditor(address auditor) external onlyOwner { isAuditor[auditor] = false; emit AuditorRemoved(auditor); }
    function setCREForwarder(address forwarder) external onlyOwner { creForwarder = forwarder; emit CREForwarderSet(forwarder); }

    function setBenchmarkFeed(address feed) external onlyOwner {
        if (feed != address(0)) { benchmarkFeed = AggregatorV3Interface(feed); benchmarkDecimals = benchmarkFeed.decimals(); }
        else { benchmarkFeed = AggregatorV3Interface(address(0)); benchmarkDecimals = 0; }
        emit BenchmarkFeedSet(feed);
    }

    function onReport(bytes calldata report) external {
        if (creForwarder != address(0)) { require(msg.sender == creForwarder, "NAVConsumer: caller not CRE forwarder"); }
        (uint256 nav, uint256 timestamp, uint256 nonce, bytes memory sig) = abi.decode(report, (uint256, uint256, uint256, bytes));
        require(timestamp + MAX_PAYLOAD_AGE >= block.timestamp, "NAVConsumer: payload too old");
        require(timestamp > lastUpdatedAt, "NAVConsumer: timestamp not newer");
        require(nonce > lastNonce, "NAVConsumer: nonce replay");
        bytes32 structHash = keccak256(abi.encode(NAV_UPDATE_TYPEHASH, address(vault), nav, timestamp, nonce));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(sig);
        require(isAuditor[signer], "NAVConsumer: invalid auditor sig");
        lastNonce = nonce;
        lastUpdatedAt = timestamp;
        latestNav = nav;
        vault.updateNAV(nav);
        emit NAVReported(nav, timestamp, nonce);
        _updateBenchmark(nav);
    }

    function _updateBenchmark(uint256 nav) internal {
        if (address(benchmarkFeed) == address(0)) return;
        (uint80 roundId, int256 price, , uint256 feedUpdatedAt, ) = benchmarkFeed.latestRoundData();
        require(price > 0, "NAVConsumer: invalid benchmark price");
        lastBenchmarkPrice = price;
        lastBenchmarkUpdatedAt = feedUpdatedAt;
        emit BenchmarkUpdated(price, feedUpdatedAt, roundId);
        uint256 navNorm = nav * 1e12;
        uint256 benchNorm = uint256(price) * (10 ** (18 - benchmarkDecimals));
        uint256 deviation;
        if (navNorm > benchNorm) { deviation = ((navNorm - benchNorm) * 10000) / benchNorm; }
        else { deviation = ((benchNorm - navNorm) * 10000) / benchNorm; }
        if (deviation > BENCHMARK_DEVIATION_BPS) { emit BenchmarkDeviationWarning(nav, price); }
    }

    function refreshBenchmark() external {
        require(address(benchmarkFeed) != address(0), "NAVConsumer: no feed set");
        _updateBenchmark(latestNav);
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 4. VaultFactory.sol
// ═══════════════════════════════════════════════════════════════════════════════

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract VaultFactory is Ownable {
    address[] public vaults;
    mapping(address => bool) public isVault;

    event VaultDeployed(address indexed vault, address indexed usdc, string name, string symbol);

    constructor() Ownable(msg.sender) {}

    function deployVault(
        address usdc, string calldata name, string calldata symbol,
        uint256 initialNav, uint256 maxStaleness
    ) external onlyOwner returns (address vault) {
        FundVault v = new FundVault(usdc, name, symbol, initialNav, maxStaleness);
        v.grantRole(v.DEFAULT_ADMIN_ROLE(), msg.sender);
        v.grantRole(v.NAV_UPDATER_ROLE(), msg.sender);
        v.grantRole(v.PAUSER_ROLE(), msg.sender);
        v.renounceRole(v.NAV_UPDATER_ROLE(), address(this));
        v.renounceRole(v.PAUSER_ROLE(), address(this));
        v.renounceRole(v.DEFAULT_ADMIN_ROLE(), address(this));
        vaults.push(address(v));
        isVault[address(v)] = true;
        emit VaultDeployed(address(v), usdc, name, symbol);
        return address(v);
    }

    function vaultCount() external view returns (uint256) { return vaults.length; }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 5. MockFunctionsRouter.sol
// ═══════════════════════════════════════════════════════════════════════════════

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IHandlesOracleFulfillment {
    function handleOracleFulfillment(bytes32 requestId, bytes memory response, bytes memory err) external;
}

/**
 * @title MockFunctionsRouter
 * @notice Stub Chainlink Functions router for chains without Functions support
 *         (e.g. Arc testnet). Admin calls fulfillRequest() to push NAV updates.
 */
contract MockFunctionsRouter is Ownable {
    uint256 private _nonce;
    event RequestSent(bytes32 indexed requestId, address indexed client);
    event RequestFulfilled(bytes32 indexed requestId, address indexed client);

    constructor() Ownable(msg.sender) {}

    function sendRequest(uint64, bytes calldata, uint16, uint32, bytes32) external returns (bytes32 requestId) {
        requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender, _nonce++));
        emit RequestSent(requestId, msg.sender);
    }

    function fulfillRequest(address client, bytes32 requestId, bytes calldata response, bytes calldata err) external onlyOwner {
        IHandlesOracleFulfillment(client).handleOracleFulfillment(requestId, response, err);
        emit RequestFulfilled(requestId, client);
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 6. ABRANDPool.sol — Retail Liquidity Pool
// ═══════════════════════════════════════════════════════════════════════════════

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessRegistry} from "./AccessRegistry.sol";

/// @notice Pool where retail/entrepreneurs/clubs deposit USDC and
///         whitelisted hedge funds redeem USDC at 1:1.
///         Depositors receive ABR shares (1 share = 1 USDC).
contract ABRANDPool is ERC20, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    AccessRegistry public immutable registry;

    event Deposited(address indexed depositor, uint256 amount);
    event Redeemed(address indexed hedgeFund, uint256 amount);

    error NotHedgeFund();
    error ZeroAmount();
    error InsufficientShares();

    constructor(address _usdc, address _registry, address _admin)
        ERC20("ABRAND Share", "ABR") Ownable(_admin)
    {
        usdc = IERC20(_usdc);
        registry = AccessRegistry(_registry);
    }

    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        emit Deposited(msg.sender, amount);
    }

    function redeem(uint256 amount) external {
        if (!registry.isHedgeFund(msg.sender)) revert NotHedgeFund();
        if (amount == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < amount) revert InsufficientShares();
        _burn(msg.sender, amount);
        usdc.safeTransfer(msg.sender, amount);
        emit Redeemed(msg.sender, amount);
    }

    function totalLiquidity() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 7. AccessRegistry.sol
// ═══════════════════════════════════════════════════════════════════════════════

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Manages the whitelist of approved hedge fund addresses.
contract AccessRegistry is Ownable {
    mapping(address => bool) private _hedgeFunds;

    event HedgeFundAdded(address indexed account);
    event HedgeFundRemoved(address indexed account);

    constructor(address admin) Ownable(admin) {}

    function addHedgeFund(address account) external onlyOwner { _hedgeFunds[account] = true; emit HedgeFundAdded(account); }
    function removeHedgeFund(address account) external onlyOwner { _hedgeFunds[account] = false; emit HedgeFundRemoved(account); }
    function isHedgeFund(address account) external view returns (bool) { return _hedgeFunds[account]; }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 8. Deploy.s.sol — Full Deployment Script
// ═══════════════════════════════════════════════════════════════════════════════

// See vault-4jm/script/Deploy.s.sol for the complete deployment script that:
//   - Deploys MockUSDC (Base Sepolia) or uses native USDC (Arc)
//   - Deploys VaultFactory → FundVault
//   - Deploys MockFunctionsRouter (Arc) or uses Chainlink Functions (Base)
//   - Deploys NAVOracle + NAVConsumer
//   - Wires up all roles (INVESTOR_ROLE, NAV_UPDATER_ROLE)
//   - Registers deployer as demo auditor
//
// Run: forge script script/Deploy.s.sol --rpc-url $RPC --broadcast
