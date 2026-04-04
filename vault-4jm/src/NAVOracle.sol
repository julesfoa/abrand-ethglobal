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
 *
 * EMERGENCY:
 *   If Chainlink is down, admin retains NAV_UPDATER_ROLE on FundVault and
 *   can call vault.updateNAV() directly.
 */
contract NAVOracle is FunctionsClient, AutomationCompatibleInterface, EIP712, Ownable {
    using FunctionsRequest for FunctionsRequest.Request;
    using ECDSA for bytes32;

    // ── EIP-712 ──────────────────────────────────────────────────────────────
    bytes32 public constant NAV_UPDATE_TYPEHASH = keccak256(
        "NAVUpdate(address vault,uint256 nav,uint256 timestamp,uint256 nonce)"
    );

    // ── Config ───────────────────────────────────────────────────────────────
    IFundVault public immutable vault;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    bytes32 public donId;
    string public jsSource; // Chainlink Functions JS source

    // ── Auditor registry ─────────────────────────────────────────────────────
    mapping(address => bool) public isAuditor;

    // ── Nonce & timing ───────────────────────────────────────────────────────
    uint256 public lastNonce;
    uint256 public lastRequestedAt;
    uint256 public requestInterval;          // Automation cadence (e.g. 1 hour)
    uint256 public constant MAX_PAYLOAD_AGE = 2 hours; // reject stale deliveries

    // ── Inflight request tracking ────────────────────────────────────────────
    bytes32 public lastRequestId;

    // ── Events ───────────────────────────────────────────────────────────────
    event AuditorAdded(address indexed auditor);
    event AuditorRemoved(address indexed auditor);
    event NAVRequestSent(bytes32 indexed requestId);
    event NAVUpdatedViaOracle(uint256 nav, uint256 timestamp, address auditor);
    event FulfillError(bytes32 indexed requestId, bytes err);

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address functionsRouter,
        address _vault,
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donId,
        uint256 _requestInterval,
        string memory _jsSource
    )
        FunctionsClient(functionsRouter)
        EIP712("NAVOracle", "1")
        Ownable(msg.sender)
    {
        vault = IFundVault(_vault);
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donId = _donId;
        requestInterval = _requestInterval;
        jsSource = _jsSource;
        // Initialize so checkUpkeep doesn't return true immediately at deployment
        lastRequestedAt = block.timestamp;
    }

    // ── Auditor management ───────────────────────────────────────────────────

    function addAuditor(address auditor) external onlyOwner {
        require(auditor != address(0), "NAVOracle: zero address");
        isAuditor[auditor] = true;
        emit AuditorAdded(auditor);
    }

    function removeAuditor(address auditor) external onlyOwner {
        isAuditor[auditor] = false;
        emit AuditorRemoved(auditor);
    }

    // ── Chainlink Automation ─────────────────────────────────────────────────

    /**
     * @notice Called by Chainlink Automation nodes to check if upkeep is needed.
     *         Returns true once per requestInterval to prevent double-fire.
     */
    function checkUpkeep(bytes calldata)
        external view override
        returns (bool upkeepNeeded, bytes memory)
    {
        upkeepNeeded = block.timestamp >= lastRequestedAt + requestInterval;
    }

    function performUpkeep(bytes calldata) external override {
        // Re-check to prevent griefing (Automation calls this after checkUpkeep)
        require(block.timestamp >= lastRequestedAt + requestInterval, "NAVOracle: too soon");
        _sendNAVRequest();
    }

    // ── Manual trigger ───────────────────────────────────────────────────────

    /**
     * @notice Anyone can trigger a NAV request (permissionless — sig is the auth).
     *         Respects the cooldown to avoid duplicate in-flight requests.
     */
    function requestNAVUpdate() external {
        require(block.timestamp >= lastRequestedAt + requestInterval, "NAVOracle: too soon");
        _sendNAVRequest();
    }

    function _sendNAVRequest() internal {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(jsSource);

        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        lastRequestId = requestId;
        lastRequestedAt = block.timestamp;
        emit NAVRequestSent(requestId);
    }

    // ── Shared NAV verification & application ────────────────────────────────

    /**
     * @notice Verify an auditor-signed NAV payload and push it to the vault.
     *         Shared by both fulfillRequest (Chainlink path) and submitSignedNAV
     *         (direct path). Extracted to avoid code duplication.
     */
    function _applySignedNAV(
        uint256 nav,
        uint256 timestamp,
        uint256 nonce,
        bytes memory sig
    ) internal {
        // Reject stale payloads.
        require(
            timestamp + MAX_PAYLOAD_AGE >= block.timestamp,
            "NAVOracle: payload too old"
        );
        // Timestamp must be newer than last NAV update.
        require(
            timestamp > vault.navUpdatedAt(),
            "NAVOracle: timestamp not newer"
        );
        // Replay protection: nonce must advance monotonically.
        require(nonce > lastNonce, "NAVOracle: nonce replay");

        // EIP-712 signature verification.
        bytes32 structHash = keccak256(abi.encode(
            NAV_UPDATE_TYPEHASH,
            address(vault),
            nav,
            timestamp,
            nonce
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(sig);

        require(isAuditor[signer], "NAVOracle: invalid signer");
        require(nav > 0, "NAVOracle: nav must be > 0");

        lastNonce = nonce;
        vault.updateNAV(nav);

        emit NAVUpdatedViaOracle(nav, timestamp, signer);
    }

    // ── Direct signed-NAV submission (demo / Chainlink-free path) ────────────

    /**
     * @notice Submit a pre-signed NAV update directly, without going through
     *         Chainlink Functions. Useful for demos and emergency manual updates.
     *
     *         Anyone can call this — the EIP-712 signature is the only auth.
     *         The auditor server's GET /nav endpoint produces compatible payloads.
     */
    function submitSignedNAV(
        uint256 nav,
        uint256 timestamp,
        uint256 nonce,
        bytes calldata sig
    ) external {
        _applySignedNAV(nav, timestamp, nonce, sig);
    }

    // ── Chainlink Functions callback ─────────────────────────────────────────

    /**
     * @notice Called by the Chainlink DON after executing the JS source.
     *         Response: ABI-encoded (uint256 nav, uint256 timestamp, uint256 nonce, bytes sig)
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (err.length > 0) {
            emit FulfillError(requestId, err);
            return;
        }

        (uint256 nav, uint256 timestamp, uint256 nonce, bytes memory sig) =
            abi.decode(response, (uint256, uint256, uint256, bytes));

        _applySignedNAV(nav, timestamp, nonce, sig);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }

    function setGasLimit(uint32 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
    }

    function setJsSource(string calldata _jsSource) external onlyOwner {
        jsSource = _jsSource;
    }

    function setRequestInterval(uint256 _interval) external onlyOwner {
        requestInterval = _interval;
    }
}
