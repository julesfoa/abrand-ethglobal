// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockFunctionsRouter
 * @notice Stub Chainlink Functions router for chains without Chainlink Functions support
 *         (e.g. Arc testnet). Lets NAVOracle deploy and operate on any EVM chain.
 *
 * On chains with real Chainlink Functions, the DON calls handleOracleFulfillment
 * automatically after JS execution. Here, the admin calls fulfillRequest() manually
 * to push a signed NAV payload — functionally identical for demo purposes.
 *
 * Usage:
 *   1. Deploy MockFunctionsRouter
 *   2. Deploy NAVOracle with this address as functionsRouter
 *   3. To update NAV: build a signed payload off-chain, call fulfillRequest()
 */
interface IHandlesOracleFulfillment {
    function handleOracleFulfillment(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external;
}

contract MockFunctionsRouter is Ownable {
    uint256 private _nonce;

    event RequestSent(bytes32 indexed requestId, address indexed client);
    event RequestFulfilled(bytes32 indexed requestId, address indexed client);

    constructor() Ownable(msg.sender) {}

    // ── Called by NAVOracle._sendRequest ─────────────────────────────────────

    function sendRequest(
        uint64,      // subscriptionId — ignored
        bytes calldata,  // data — ignored
        uint16,      // dataVersion — ignored
        uint32,      // callbackGasLimit — ignored
        bytes32      // donId — ignored
    ) external returns (bytes32 requestId) {
        requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender, _nonce++));
        emit RequestSent(requestId, msg.sender);
    }

    // ── Admin push: replaces the Chainlink DON delivery ──────────────────────

    /**
     * @notice Push a signed NAV payload to the oracle. Replaces the Chainlink DON
     *         on chains where Functions is not available.
     * @param client  The NAVOracle contract address
     * @param requestId  Any bytes32 (use bytes32(0) for direct push)
     * @param response   ABI-encoded (uint256 nav, uint256 timestamp, uint256 nonce, bytes sig)
     * @param err        Pass "" for success, non-empty to trigger FulfillError path
     */
    function fulfillRequest(
        address client,
        bytes32 requestId,
        bytes calldata response,
        bytes calldata err
    ) external onlyOwner {
        IHandlesOracleFulfillment(client).handleOracleFulfillment(requestId, response, err);
        emit RequestFulfilled(requestId, client);
    }
}
