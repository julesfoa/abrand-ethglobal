// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Manages the whitelist of approved hedge fund addresses.
contract AccessRegistry is Ownable {
    mapping(address => bool) private _hedgeFunds;

    event HedgeFundAdded(address indexed account);
    event HedgeFundRemoved(address indexed account);

    constructor(address admin) Ownable(admin) {}

    function addHedgeFund(address account) external onlyOwner {
        _hedgeFunds[account] = true;
        emit HedgeFundAdded(account);
    }

    function removeHedgeFund(address account) external onlyOwner {
        _hedgeFunds[account] = false;
        emit HedgeFundRemoved(account);
    }

    function isHedgeFund(address account) external view returns (bool) {
        return _hedgeFunds[account];
    }
}
