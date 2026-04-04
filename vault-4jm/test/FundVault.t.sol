// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/FundVault.sol";
import "../src/VaultFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal USDC mock (6 decimals)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract FundVaultTest is Test {
    FundVault vault;
    MockUSDC usdc;

    address admin      = address(this);
    address investor   = makeAddr("investor");
    address bgInvestor = makeAddr("bgInvestor"); // holds 900 USDC so test investor is ~10% of supply
    address stranger   = makeAddr("stranger");
    address manager    = makeAddr("manager");

    uint256 constant INITIAL_NAV    = 1e6;
    uint256 constant MAX_STALENESS  = 7 days;
    uint256 constant ONE_USDC       = 1e6;
    uint256 constant ONE_SHARE      = 1e18;
    uint256 constant COOLDOWN       = 5 minutes;

    function setUp() public {
        usdc = new MockUSDC();
        vault = new FundVault(
            address(usdc),
            "Fund1 Vehicle1",
            "F1V1",
            INITIAL_NAV,
            MAX_STALENESS
        );

        vault.grantRole(vault.INVESTOR_ROLE(), investor);
        vault.grantRole(vault.INVESTOR_ROLE(), bgInvestor);
        vault.grantRole(vault.NAV_UPDATER_ROLE(), manager);

        // bgInvestor deposits 900 USDC so test investor's 100 USDC = 10% of total supply
        usdc.mint(bgInvestor, 900 * ONE_USDC);
        vm.startPrank(bgInvestor);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(900 * ONE_USDC, bgInvestor);
        vm.stopPrank();

        usdc.mint(investor, 1000 * ONE_USDC);
        vm.prank(investor);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ── Deposit ───────────────────────────────────────────────────────────────

    function test_deposit_whitelisted() public {
        uint256 depositAmount = 100 * ONE_USDC;
        uint256 vaultUsdcBefore = usdc.balanceOf(address(vault));

        vm.prank(investor);
        uint256 shares = vault.deposit(depositAmount, investor);

        assertGt(shares, 0, "should receive shares");
        assertEq(usdc.balanceOf(address(vault)) - vaultUsdcBefore, depositAmount, "vault received USDC");
        assertEq(vault.balanceOf(investor), shares, "investor holds shares");
    }

    function test_deposit_notWhitelisted_reverts() public {
        usdc.mint(stranger, 100 * ONE_USDC);
        vm.startPrank(stranger);
        usdc.approve(address(vault), type(uint256).max);
        vm.expectRevert("FundVault: caller not whitelisted");
        vault.deposit(100 * ONE_USDC, stranger);
        vm.stopPrank();
    }

    // Non-whitelisted caller cannot deposit to a whitelisted receiver.
    function test_deposit_callerNotWhitelisted_reverts() public {
        usdc.mint(stranger, 100 * ONE_USDC);
        vm.startPrank(stranger);
        usdc.approve(address(vault), type(uint256).max);
        vm.expectRevert("FundVault: caller not whitelisted");
        vault.deposit(100 * ONE_USDC, investor); // receiver is whitelisted, caller is not
        vm.stopPrank();
    }

    // Whitelisted caller cannot deposit to a non-whitelisted receiver.
    function test_deposit_receiverNotWhitelisted_reverts() public {
        vm.prank(investor);
        vm.expectRevert("FundVault: receiver not whitelisted");
        vault.deposit(100 * ONE_USDC, stranger);
    }

    // Entry rule constants are publicly readable.
    function test_entryRules_constants() public view {
        assertEq(vault.MIN_DEPOSIT(),   0);
        assertEq(vault.LOCKUP_PERIOD(), 0);
    }

    function test_deposit_zeroAmount_reverts() public {
        vm.prank(investor);
        vm.expectRevert();
        vault.deposit(0, investor);
    }

    function test_deposit_staleNav_reverts() public {
        skip(MAX_STALENESS + 1);
        vm.prank(investor);
        vm.expectRevert("FundVault: NAV stale");
        vault.deposit(100 * ONE_USDC, investor);
    }

    function test_deposit_paused_reverts() public {
        vault.pause();
        vm.prank(investor);
        vm.expectRevert();
        vault.deposit(100 * ONE_USDC, investor);
    }

    function test_inflationAttack_decimalsOffset() public {
        address attacker = makeAddr("attacker");
        usdc.mint(attacker, ONE_USDC);
        vm.prank(attacker);
        usdc.transfer(address(vault), ONE_USDC);

        vm.prank(investor);
        uint256 shares = vault.deposit(100 * ONE_USDC, investor);

        assertGt(shares, 0, "inflation attack failed: investor received 0 shares");
    }

    // ── ERC4626 NAV override ──────────────────────────────────────────────────

    function test_convertToShares_atInitialNav() public view {
        // 100 USDC at $1/share → 100e18 shares
        uint256 shares = vault.convertToShares(100 * ONE_USDC);
        assertEq(shares, 100 * ONE_SHARE, "1:1 at initial NAV");
    }

    function test_convertToShares_atHigherNav() public {
        uint256 newNav = (INITIAL_NAV * 105) / 100; // $1.05
        vm.prank(manager);
        vault.updateNAV(newNav);

        uint256 shares = vault.convertToShares(100 * ONE_USDC);
        // 100e6 * 1e18 / 1.05e6 ≈ 95.238...e18
        assertLt(shares, 100 * ONE_SHARE, "fewer shares when NAV > 1");
        uint256 expected = (100 * ONE_USDC * 1e18) / newNav;
        assertEq(shares, expected);
    }

    function test_convertToAssets_atHigherNav() public {
        uint256 newNav = (INITIAL_NAV * 105) / 100; // $1.05
        vm.prank(manager);
        vault.updateNAV(newNav);

        // 100e18 shares at $1.05 → 105 USDC
        uint256 assets = vault.convertToAssets(100 * ONE_SHARE);
        assertEq(assets, (100 * ONE_SHARE * newNav) / 1e18);
    }

    function test_deposit_atHigherNav_correctShareCount() public {
        uint256 newNav = (INITIAL_NAV * 105) / 100; // $1.05
        vm.prank(manager);
        vault.updateNAV(newNav);

        vm.prank(investor);
        uint256 shares = vault.deposit(100 * ONE_USDC, investor);

        uint256 expected = (100 * ONE_USDC * 1e18) / newNav;
        assertEq(shares, expected, "shares diluted correctly at higher NAV");
    }

    // ── NAV update ────────────────────────────────────────────────────────────

    function test_updateNav_withinCap() public {
        uint256 newNav = (INITIAL_NAV * 105) / 100;
        vm.prank(manager);
        vault.updateNAV(newNav);
        assertEq(vault.navPerShare(), newNav);
    }

    function test_updateNav_exceedsCap_reverts() public {
        uint256 newNav = (INITIAL_NAV * 115) / 100;
        vm.prank(manager);
        vm.expectRevert("FundVault: NAV change too large");
        vault.updateNAV(newNav);
    }

    function test_updateNav_decreaseExceedsCap_reverts() public {
        uint256 newNav = (INITIAL_NAV * 84) / 100;
        vm.prank(manager);
        vm.expectRevert("FundVault: NAV change too large");
        vault.updateNAV(newNav);
    }

    function test_updateNav_nonManager_reverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        vault.updateNAV(INITIAL_NAV + 1);
    }

    function test_updateNav_zero_reverts() public {
        vm.prank(manager);
        vm.expectRevert("FundVault: nav must be > 0");
        vault.updateNAV(0);
    }

    // ── Oracle timelock ───────────────────────────────────────────────────────

    function test_proposeOracle_setsState() public {
        address oracle = makeAddr("oracle");
        vault.proposeOracle(oracle);
        assertEq(vault.pendingOracle(), oracle);
        assertEq(vault.oracleChangeAt(), block.timestamp + vault.ORACLE_TIMELOCK());
    }

    function test_proposeOracle_emitsEvent() public {
        address oracle = makeAddr("oracle");
        uint256 effectiveAt = block.timestamp + vault.ORACLE_TIMELOCK();
        vm.expectEmit(true, false, false, true);
        emit FundVault.OracleChangeProposed(oracle, effectiveAt);
        vault.proposeOracle(oracle);
    }

    function test_proposeOracle_nonAdmin_reverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        vault.proposeOracle(makeAddr("oracle"));
    }

    function test_proposeOracle_zeroAddress_reverts() public {
        vm.expectRevert("FundVault: zero address");
        vault.proposeOracle(address(0));
    }

    function test_acceptOracle_beforeTimelock_reverts() public {
        vault.proposeOracle(makeAddr("oracle"));
        vm.expectRevert("FundVault: timelock active");
        vault.acceptOracle();
    }

    function test_acceptOracle_afterTimelock_grantsRole() public {
        address oracle = makeAddr("oracle");
        vault.proposeOracle(oracle);
        skip(vault.ORACLE_TIMELOCK() + 1);
        vault.acceptOracle();

        assertTrue(vault.hasRole(vault.NAV_UPDATER_ROLE(), oracle));
        assertEq(vault.pendingOracle(), address(0));
    }

    function test_acceptOracle_noPending_reverts() public {
        vm.expectRevert("FundVault: no pending oracle");
        vault.acceptOracle();
    }

    // ── Request redeem ────────────────────────────────────────────────────────

    function _depositAndGetShares(uint256 usdcAmount) internal returns (uint256 shares) {
        vm.prank(investor);
        shares = vault.deposit(usdcAmount, investor);
    }

    function test_requestRedeem_escrowed() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);

        vm.prank(investor);
        vault.requestRedeem(shares);

        (uint256 reqShares, uint256 navLocked,,) = vault.redemptionRequests(investor);
        assertEq(reqShares, shares, "shares in queue");
        assertEq(navLocked, INITIAL_NAV, "NAV locked at request time");
        assertEq(vault.balanceOf(investor), 0, "shares moved to escrow");
        assertEq(vault.balanceOf(address(vault)), shares, "vault holds escrowed shares");
    }

    function test_requestRedeem_staleNav_reverts() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);
        skip(MAX_STALENESS + 1);
        vm.prank(investor);
        vm.expectRevert("FundVault: NAV stale");
        vault.requestRedeem(shares);
    }

    function test_requestRedeem_doublePending_reverts() public {
        uint256 shares = _depositAndGetShares(200 * ONE_USDC);
        vm.startPrank(investor);
        vault.requestRedeem(shares / 2);
        vm.expectRevert("FundVault: request pending");
        vault.requestRedeem(shares / 2);
        vm.stopPrank();
    }

    function test_requestRedeem_pendingRedemptionValue() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);
        uint256 totalBefore = vault.totalAssets();

        vm.prank(investor);
        vault.requestRedeem(shares);

        uint256 owed = (shares * INITIAL_NAV) / 1e18;
        assertEq(vault.totalAssets(), totalBefore - owed, "totalAssets excludes pending");
    }

    // ── Cancel redemption ─────────────────────────────────────────────────────

    function test_cancelRedemption_sharesReturned() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);
        vm.prank(investor);
        vault.requestRedeem(shares);

        vm.prank(investor);
        vault.cancelRedemption();

        assertEq(vault.balanceOf(investor), shares, "shares returned");
        assertEq(vault.pendingRedemptionValue(), 0, "pending cleared");
        (uint256 reqShares,,,) = vault.redemptionRequests(investor);
        assertEq(reqShares, 0, "request deleted");
    }

    function test_cancelRedemption_noPending_reverts() public {
        vm.prank(investor);
        vm.expectRevert("FundVault: no pending request");
        vault.cancelRedemption();
    }

    // ── Fulfill redemption ────────────────────────────────────────────────────

    function test_fulfillRedemption_correctPayout() public {
        uint256 depositAmount = 100 * ONE_USDC;
        uint256 shares = _depositAndGetShares(depositAmount);

        vm.prank(investor);
        vault.requestRedeem(shares);

        skip(COOLDOWN + 1);

        uint256 investorUsdcBefore = usdc.balanceOf(investor);

        vm.prank(manager);
        vault.fulfillRedemption(investor);

        uint256 payout = usdc.balanceOf(investor) - investorUsdcBefore;
        assertApproxEqAbs(payout, depositAmount, 1, "payout approx equals deposit");
        assertEq(vault.balanceOf(address(vault)), 0, "escrowed shares burned");
        assertEq(vault.pendingRedemptionValue(), 0, "pending cleared");
    }

    function test_fulfillRedemption_navLockedAtRequest() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);

        vm.prank(investor);
        vault.requestRedeem(shares);

        uint256 newNav = (INITIAL_NAV * 105) / 100;
        vm.prank(manager);
        vault.updateNAV(newNav);

        skip(COOLDOWN + 1);

        uint256 investorUsdcBefore = usdc.balanceOf(investor);
        vm.prank(manager);
        vault.fulfillRedemption(investor);
        uint256 payout = usdc.balanceOf(investor) - investorUsdcBefore;

        uint256 expectedPayout = (shares * INITIAL_NAV) / 1e18;
        assertEq(payout, expectedPayout, "payout uses NAV at request, not current");
    }

    function test_fulfillRedemption_noPending_reverts() public {
        vm.prank(manager);
        vm.expectRevert("FundVault: no pending request");
        vault.fulfillRedemption(investor);
    }

    function test_fulfillRedemption_cooldownNotElapsed_reverts() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);
        vm.prank(investor);
        vault.requestRedeem(shares);

        // 1 second before cooldown expires
        skip(COOLDOWN - 1);
        vm.prank(manager);
        vm.expectRevert("FundVault: cooldown not elapsed");
        vault.fulfillRedemption(investor);
    }

    function test_forceFulfillRedemption_skips_cooldown() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);
        vm.prank(investor);
        vault.requestRedeem(shares);

        // Do NOT skip time — cooldown has not elapsed
        uint256 usdcBefore = usdc.balanceOf(investor);
        // admin (address(this)) can bypass cooldown
        vault.forceFulfillRedemption(investor);
        assertGt(usdc.balanceOf(investor), usdcBefore, "investor received USDC");
        (uint256 pendingShares,,,) = vault.redemptionRequests(investor);
        assertEq(pendingShares, 0, "request cleared");
    }

    function test_forceFulfillRedemption_nonAdmin_reverts() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);
        vm.prank(investor);
        vault.requestRedeem(shares);

        vm.prank(stranger);
        vm.expectRevert();
        vault.forceFulfillRedemption(investor);
    }

    function test_standardRedeem_reverts() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);
        vm.prank(investor);
        vm.expectRevert("FundVault: use requestRedeem");
        vault.redeem(shares, investor, investor);
    }

    // ── Exit rules ────────────────────────────────────────────────────────────

    function test_requestRedeem_exceedsMaxExit_reverts() public {
        // Deposit so investor holds ~10% of supply; try to redeem 11%
        uint256 shares = _depositAndGetShares(100 * ONE_USDC); // investor = 100/(900+100) = 10%
        uint256 overLimit = (vault.totalSupply() * vault.maxExitBps()) / 10000 + 1;
        // Give investor enough shares to hit the limit
        usdc.mint(investor, 1000 * ONE_USDC);
        vm.prank(investor);
        vault.deposit(1000 * ONE_USDC, investor); // now investor has plenty of shares
        uint256 tooMany = (vault.totalSupply() * vault.maxExitBps()) / 10000 + 1;

        vm.prank(investor);
        vm.expectRevert("FundVault: exceeds max exit size");
        vault.requestRedeem(tooMany);
    }

    function test_setMaxExitBps_admin() public {
        vault.setMaxExitBps(500); // 5%
        assertEq(vault.maxExitBps(), 500);
    }

    function test_setMaxExitBps_nonAdmin_reverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        vault.setMaxExitBps(500);
    }

    function test_setMaxExitBps_outOfRange_reverts() public {
        vm.expectRevert("FundVault: bps out of range");
        vault.setMaxExitBps(0);
        vm.expectRevert("FundVault: bps out of range");
        vault.setMaxExitBps(10001);
    }

    // ── Access control ────────────────────────────────────────────────────────

    function test_pause_blocksDeposit() public {
        vault.pause();
        vm.prank(investor);
        vm.expectRevert();
        vault.deposit(100 * ONE_USDC, investor);
    }

    function test_pause_blocksRequestRedeem() public {
        uint256 shares = _depositAndGetShares(100 * ONE_USDC);
        vault.pause();
        vm.prank(investor);
        vm.expectRevert();
        vault.requestRedeem(shares);
    }

    function test_unpause_resumesOperations() public {
        vault.pause();
        vault.unpause();
        vm.prank(investor);
        uint256 shares = vault.deposit(100 * ONE_USDC, investor);
        assertGt(shares, 0);
    }

    function test_navUpdaterCannotDeposit() public {
        usdc.mint(manager, 100 * ONE_USDC);
        vm.startPrank(manager);
        usdc.approve(address(vault), type(uint256).max);
        vm.expectRevert("FundVault: caller not whitelisted");
        vault.deposit(100 * ONE_USDC, manager);
        vm.stopPrank();
    }
}

// ── VaultFactory tests ────────────────────────────────────────────────────────

contract VaultFactoryTest is Test {
    VaultFactory factory;
    MockUSDC usdc;
    address stranger = makeAddr("stranger");

    function setUp() public {
        usdc = new MockUSDC();
        factory = new VaultFactory();
    }

    function test_deployVault_registersInMapping() public {
        address v = factory.deployVault(address(usdc), "Test Fund", "TF", 1e6, 1 hours);
        assertTrue(factory.isVault(v), "vault should be registered");
        assertEq(factory.vaultCount(), 1);
        assertEq(factory.vaults(0), v);
    }

    function test_deployVault_transfersAdminToDeployer() public {
        address v = factory.deployVault(address(usdc), "Test Fund", "TF", 1e6, 1 hours);
        FundVault vault = FundVault(v);
        assertTrue(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), address(this)));
        assertFalse(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), address(factory)),
            "factory should not retain admin");
    }

    function test_deployVault_nonOwner_reverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        factory.deployVault(address(usdc), "Fake Fund", "FF", 1e6, 1 hours);
    }

    function test_isVault_returnsFalseForArbitraryAddress() public view {
        assertFalse(factory.isVault(address(0xdead)));
    }
}
