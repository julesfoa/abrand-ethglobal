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
        ERC20("ABRAND Share", "ABR")
        Ownable(_admin)
    {
        usdc = IERC20(_usdc);
        registry = AccessRegistry(_registry);
    }

    /// @notice Anyone can deposit USDC and receive an equal number of ABR shares.
    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        emit Deposited(msg.sender, amount);
    }

    /// @notice Whitelisted hedge funds burn ABR shares and receive USDC 1:1.
    function redeem(uint256 amount) external {
        if (!registry.isHedgeFund(msg.sender)) revert NotHedgeFund();
        if (amount == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < amount) revert InsufficientShares();
        _burn(msg.sender, amount);
        usdc.safeTransfer(msg.sender, amount);
        emit Redeemed(msg.sender, amount);
    }

    /// @notice Total USDC held in the pool.
    function totalLiquidity() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
