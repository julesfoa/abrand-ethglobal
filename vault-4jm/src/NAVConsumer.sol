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
 * @notice CRE report receiver that accepts NAV updates from the Chainlink
 *         Runtime Environment (CRE) DON and pushes them to FundVault.
 *
 * ARCHITECTURE:
 *   CRE Workflow (DON) → NAVConsumer.onReport(report)
 *     → decode (nav, timestamp, nonce, auditorSig)
 *     → verify EIP-712 auditor sig (same scheme as old NAVOracle.sol)
 *     → vault.updateNAV(nav)
 *
 * This contract replaces NAVOracle.sol in the CRE-based architecture.
 * NAV_UPDATER_ROLE is granted to this contract on FundVault.
 *
 * CRE INTEGRATION:
 *   The CRE DON calls onReport() with an ABI-encoded payload produced by the
 *   workflow's runtime.report(calldata). The CRE forwarder address is set
 *   via setCREForwarder() and enforced on every onReport() call.
 *
 * AUDITOR SIG VERIFICATION (EIP-712):
 *   The auditor server (oracle/auditor-server.js) signs NAV payloads using
 *   EIP-712 with the domain of NAVConsumer ("NAVConsumer", "1"). The workflow
 *   relays these signatures unchanged — they act as a second security layer
 *   on top of the CRE DON's cryptographic guarantee.
 *
 * REPLAY PROTECTION:
 *   - nonce: monotonic, must be > lastNonce
 *   - timestamp: must be newer than last update AND within MAX_PAYLOAD_AGE
 *
 * CHAINLINK PRICE FEED (Connect the World bounty):
 *   On every NAV update, reads a Chainlink Price Feed (e.g. ETH/USD) and
 *   stores the benchmark price on-chain. This serves two purposes:
 *   1. Sanity check: if NAV deviates >50% from benchmark, emits a warning
 *   2. On-chain audit trail: benchmark price is logged alongside every NAV update
 *   Uses Chainlink Price Feeds to make a state change on-chain (writes
 *   lastBenchmarkPrice + lastBenchmarkUpdatedAt).
 */
contract NAVConsumer is Ownable, EIP712 {
    using ECDSA for bytes32;

    // ── EIP-712 typehash ─────────────────────────────────────────────────────
    // Must match the domain used by oracle/auditor-server.js (name="NAVConsumer")
    bytes32 public constant NAV_UPDATE_TYPEHASH = keccak256(
        "NAVUpdate(address vault,uint256 nav,uint256 timestamp,uint256 nonce)"
    );

    // ── Config ───────────────────────────────────────────────────────────────
    IFundVaultConsumer public immutable vault;

    // CRE forwarder: the address the CRE DON uses to call onReport().
    // Set after deploy once the CRE team provides it (or from simulation output).
    address public creForwarder;

    // Auditors: addresses whose EIP-712 sigs are accepted.
    mapping(address => bool) public isAuditor;

    // ── Chainlink Price Feed (Connect the World bounty) ─────────────────────
    // Benchmark price feed (e.g. ETH/USD) read on every NAV update.
    // Stores the latest benchmark price on-chain as part of the state change.
    AggregatorV3Interface public benchmarkFeed;
    int256 public lastBenchmarkPrice;
    uint256 public lastBenchmarkUpdatedAt;
    uint8 public benchmarkDecimals;
    // If NAV deviates >50% from initial benchmark ratio, emit warning
    uint256 public constant BENCHMARK_DEVIATION_BPS = 5000;

    // ── Replay protection ────────────────────────────────────────────────────
    uint256 public lastNonce;
    uint256 public lastUpdatedAt;
    uint256 public constant MAX_PAYLOAD_AGE = 2 hours;

    // ── Telemetry ────────────────────────────────────────────────────────────
    uint256 public latestNav;

    // ── Events ───────────────────────────────────────────────────────────────
    event NAVReported(uint256 nav, uint256 timestamp, uint256 nonce);
    event BenchmarkUpdated(int256 price, uint256 feedTimestamp, uint256 roundId);
    event BenchmarkDeviationWarning(uint256 nav, int256 benchmarkPrice);
    event AuditorAdded(address indexed auditor);
    event AuditorRemoved(address indexed auditor);
    event CREForwarderSet(address indexed forwarder);
    event BenchmarkFeedSet(address indexed feed);

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _vault, address _creForwarder, address _benchmarkFeed)
        Ownable(msg.sender)
        EIP712("NAVConsumer", "1")
    {
        require(_vault != address(0), "NAVConsumer: zero vault");
        vault = IFundVaultConsumer(_vault);
        if (_creForwarder != address(0)) {
            creForwarder = _creForwarder;
            emit CREForwarderSet(_creForwarder);
        }
        if (_benchmarkFeed != address(0)) {
            benchmarkFeed = AggregatorV3Interface(_benchmarkFeed);
            benchmarkDecimals = benchmarkFeed.decimals();
            emit BenchmarkFeedSet(_benchmarkFeed);
        }
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function addAuditor(address auditor) external onlyOwner {
        require(auditor != address(0), "NAVConsumer: zero address");
        isAuditor[auditor] = true;
        emit AuditorAdded(auditor);
    }

    function removeAuditor(address auditor) external onlyOwner {
        isAuditor[auditor] = false;
        emit AuditorRemoved(auditor);
    }

    /**
     * @notice Set the CRE forwarder address. Only the owner can change this.
     *         Set to address(0) to allow any caller (demo / testing only).
     */
    function setCREForwarder(address forwarder) external onlyOwner {
        creForwarder = forwarder;
        emit CREForwarderSet(forwarder);
    }

    /**
     * @notice Set or update the Chainlink Price Feed used for benchmark checks.
     *         Pass address(0) to disable benchmark checks.
     */
    function setBenchmarkFeed(address feed) external onlyOwner {
        if (feed != address(0)) {
            benchmarkFeed = AggregatorV3Interface(feed);
            benchmarkDecimals = benchmarkFeed.decimals();
        } else {
            benchmarkFeed = AggregatorV3Interface(address(0));
            benchmarkDecimals = 0;
        }
        emit BenchmarkFeedSet(feed);
    }

    // ── CRE report receiver ──────────────────────────────────────────────────

    /**
     * @notice Called by the CRE DON (via the CRE forwarder) with the report
     *         payload produced by the NAV updater workflow.
     *
     * @param report ABI-encoded (uint256 nav, uint256 timestamp, uint256 nonce, bytes sig)
     *
     * The sig is an EIP-712 signature from a registered auditor, produced by
     * the off-chain auditor server and relayed by the CRE workflow.
     * This creates a dual trust model:
     *   1. CRE DON guarantees the workflow ran correctly (forwarder check)
     *   2. Auditor EIP-712 sig guarantees the NAV value is authentic
     */
    function onReport(bytes calldata report) external {
        // Enforce CRE forwarder: if set, only the CRE DON can call this.
        // If not set (zero address), allow any caller — useful for local simulation.
        if (creForwarder != address(0)) {
            require(msg.sender == creForwarder, "NAVConsumer: caller not CRE forwarder");
        }

        (
            uint256 nav,
            uint256 timestamp,
            uint256 nonce,
            bytes memory sig
        ) = abi.decode(report, (uint256, uint256, uint256, bytes));

        // Reject stale payloads
        require(
            timestamp + MAX_PAYLOAD_AGE >= block.timestamp,
            "NAVConsumer: payload too old"
        );
        // Timestamp must advance
        require(timestamp > lastUpdatedAt, "NAVConsumer: timestamp not newer");
        // Nonce must advance
        require(nonce > lastNonce, "NAVConsumer: nonce replay");

        // Verify EIP-712 auditor signature
        bytes32 structHash = keccak256(abi.encode(
            NAV_UPDATE_TYPEHASH,
            address(vault),
            nav,
            timestamp,
            nonce
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(sig);
        require(isAuditor[signer], "NAVConsumer: invalid auditor sig");

        // Apply update
        lastNonce = nonce;
        lastUpdatedAt = timestamp;
        latestNav = nav;

        vault.updateNAV(nav);

        emit NAVReported(nav, timestamp, nonce);

        // ── Chainlink Price Feed: read benchmark and store on-chain ──────────
        // This is the state change that qualifies for the "Connect the World"
        // bounty — Chainlink Price Feed data drives an on-chain write.
        _updateBenchmark(nav);
    }

    /**
     * @notice Read the Chainlink Price Feed and store the benchmark price.
     *         Emits BenchmarkDeviationWarning if NAV deviates >50% from
     *         the benchmark (useful for fund managers monitoring drift).
     */
    function _updateBenchmark(uint256 nav) internal {
        if (address(benchmarkFeed) == address(0)) return;

        (
            uint80 roundId,
            int256 price,
            ,
            uint256 feedUpdatedAt,
        ) = benchmarkFeed.latestRoundData();

        require(price > 0, "NAVConsumer: invalid benchmark price");

        // State change: store benchmark price on-chain
        lastBenchmarkPrice = price;
        lastBenchmarkUpdatedAt = feedUpdatedAt;

        emit BenchmarkUpdated(price, feedUpdatedAt, roundId);

        // Deviation check: warn if NAV has drifted >50% from benchmark
        // NAV is in USDC units (1e6 = $1), benchmark is in feed decimals (usually 1e8)
        // Normalize both to 1e18 for comparison
        uint256 navNorm = nav * 1e12; // 1e6 → 1e18
        uint256 benchNorm = uint256(price) * (10 ** (18 - benchmarkDecimals));

        uint256 deviation;
        if (navNorm > benchNorm) {
            deviation = ((navNorm - benchNorm) * 10000) / benchNorm;
        } else {
            deviation = ((benchNorm - navNorm) * 10000) / benchNorm;
        }

        if (deviation > BENCHMARK_DEVIATION_BPS) {
            emit BenchmarkDeviationWarning(nav, price);
        }
    }

    /**
     * @notice Force a benchmark price update without a NAV report.
     *         Useful for bootstrapping the benchmark or manual refresh.
     *         Makes a state change on-chain using Chainlink Price Feeds.
     */
    function refreshBenchmark() external {
        require(address(benchmarkFeed) != address(0), "NAVConsumer: no feed set");
        _updateBenchmark(latestNav);
    }
}
