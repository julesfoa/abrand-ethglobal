// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FundVault.sol";

/**
 * @title VaultFactory
 * @notice Deploys new FundVault instances. Only the owner can deploy vaults —
 *         this prevents phishing via fake vaults that share the factory address.
 */
contract VaultFactory is Ownable {
    address[] public vaults;
    /// @notice O(1) legitimacy check — prevents phishing via fake vaults that
    ///         share the factory address but weren't deployed through it.
    mapping(address => bool) public isVault;

    event VaultDeployed(
        address indexed vault,
        address indexed usdc,
        string name,
        string symbol
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Deploy a new FundVault. Only callable by owner.
     * @param usdc           USDC token address
     * @param name           Share token name (e.g. "Fund1 Vehicle1")
     * @param symbol         Share token symbol (e.g. "F1V1")
     * @param initialNav     Initial NAV per share, scaled 1e18 (use 1e18 for $1.00)
     * @param maxStaleness   Max seconds NAV can go without update before ops are blocked
     */
    function deployVault(
        address usdc,
        string calldata name,
        string calldata symbol,
        uint256 initialNav,
        uint256 maxStaleness
    ) external onlyOwner returns (address vault) {
        FundVault v = new FundVault(usdc, name, symbol, initialNav, maxStaleness);

        // Transfer all roles to deployer, factory renounces everything
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

    function vaultCount() external view returns (uint256) {
        return vaults.length;
    }
}
