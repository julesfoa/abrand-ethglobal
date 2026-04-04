// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AccessRegistry} from "../src/AccessRegistry.sol";
import {ABRANDPool} from "../src/ABRANDPool.sol";

contract Deploy is Script {
    // Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        address admin = vm.envAddress("ADMIN_ADDRESS");
        vm.startBroadcast();

        AccessRegistry registry = new AccessRegistry(admin);
        ABRANDPool pool = new ABRANDPool(USDC_BASE_SEPOLIA, address(registry), admin);

        console.log("AccessRegistry:", address(registry));
        console.log("ABRANDPool:    ", address(pool));

        vm.stopBroadcast();
    }
}
