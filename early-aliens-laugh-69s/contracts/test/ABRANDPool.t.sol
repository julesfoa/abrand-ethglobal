// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessRegistry} from "../src/AccessRegistry.sol";
import {ABRANDPool} from "../src/ABRANDPool.sol";

/// @dev Minimal mock USDC for testing.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ABRANDPoolTest is Test {
    MockUSDC usdc;
    AccessRegistry registry;
    ABRANDPool pool;

    address admin = address(0xA);
    address retail = address(0xB);
    address hedgeFund = address(0xC);
    address stranger = address(0xD);

    function setUp() public {
        usdc = new MockUSDC();
        registry = new AccessRegistry(admin);
        pool = new ABRANDPool(address(usdc), address(registry), admin);

        // Fund retail depositor
        usdc.mint(retail, 1000e6);
        vm.prank(retail);
        usdc.approve(address(pool), type(uint256).max);

        // Whitelist hedge fund and give them some shares to redeem
        vm.prank(admin);
        registry.addHedgeFund(hedgeFund);
    }

    function test_deposit_mintsShares() public {
        vm.prank(retail);
        pool.deposit(500e6);

        assertEq(pool.balanceOf(retail), 500e6);
        assertEq(pool.totalLiquidity(), 500e6);
    }

    function test_deposit_zeroReverts() public {
        vm.prank(retail);
        vm.expectRevert(ABRANDPool.ZeroAmount.selector);
        pool.deposit(0);
    }

    function test_redeem_sendsUSDC() public {
        // Retail deposits first
        vm.prank(retail);
        pool.deposit(1000e6);

        // Transfer shares to hedge fund so it can redeem
        vm.prank(retail);
        pool.transfer(hedgeFund, 1000e6);

        uint256 before = usdc.balanceOf(hedgeFund);
        vm.prank(hedgeFund);
        pool.redeem(1000e6);

        assertEq(usdc.balanceOf(hedgeFund) - before, 1000e6);
        assertEq(pool.balanceOf(hedgeFund), 0);
    }

    function test_redeem_notWhitelistedReverts() public {
        vm.prank(retail);
        pool.deposit(100e6);

        vm.prank(retail);
        pool.transfer(stranger, 100e6);

        vm.prank(stranger);
        vm.expectRevert(ABRANDPool.NotHedgeFund.selector);
        pool.redeem(100e6);
    }

    function test_redeem_insufficientSharesReverts() public {
        vm.prank(hedgeFund);
        vm.expectRevert(ABRANDPool.InsufficientShares.selector);
        pool.redeem(1e6);
    }

    function test_removeHedgeFund_blocksRedeem() public {
        vm.prank(retail);
        pool.deposit(100e6);
        vm.prank(retail);
        pool.transfer(hedgeFund, 100e6);

        vm.prank(admin);
        registry.removeHedgeFund(hedgeFund);

        vm.prank(hedgeFund);
        vm.expectRevert(ABRANDPool.NotHedgeFund.selector);
        pool.redeem(100e6);
    }
}
