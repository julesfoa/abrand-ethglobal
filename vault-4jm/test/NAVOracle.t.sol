// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/FundVault.sol";
import "../src/NAVOracle.sol";
import "./FundVault.t.sol"; // MockUSDC

/**
 * @dev Minimal mock of the Chainlink Functions router.
 *      Lets us call handleOracleFulfillment directly in tests
 *      without needing a real DON.
 */
contract MockFunctionsRouter {
    NAVOracle public oracle;

    function setOracle(address _oracle) external {
        oracle = NAVOracle(_oracle);
    }

    function fulfillWithResponse(
        bytes32 requestId,
        bytes calldata response,
        bytes calldata err
    ) external {
        oracle.handleOracleFulfillment(requestId, response, err);
    }

    // Stub: NAVOracle calls _sendRequest which calls this router
    function sendRequest(
        uint64,
        bytes calldata,
        uint16,
        uint32,
        bytes32
    ) external returns (bytes32) {
        return keccak256(abi.encodePacked(block.timestamp, msg.sender));
    }
}

contract NAVOracleTest is Test {
    FundVault vault;
    MockUSDC usdc;
    NAVOracle oracle;
    MockFunctionsRouter router;

    // Auditor key pair (deterministic for tests)
    uint256 auditorKey = 0xA11CE;
    address auditor;

    address admin    = address(this);
    address investor = makeAddr("investor");

    uint256 constant INITIAL_NAV   = 1e6;
    uint256 constant MAX_STALENESS = 30 minutes;
    uint256 constant REQ_INTERVAL  = 1 hours;

    function setUp() public {
        // Warp to a realistic timestamp so MAX_PAYLOAD_AGE subtraction doesn't underflow
        vm.warp(1_700_000_000);

        auditor = vm.addr(auditorKey);

        // Deploy mock USDC and vault
        usdc = new MockUSDC();
        vault = new FundVault(
            address(usdc),
            "Fund1",
            "F1",
            INITIAL_NAV,
            MAX_STALENESS
        );

        // Deploy mock router + oracle
        router = new MockFunctionsRouter();
        oracle = new NAVOracle(
            address(router),
            address(vault),
            1,          // subscriptionId
            300_000,    // gasLimit
            bytes32(0), // donId
            REQ_INTERVAL,
            "// js source"
        );
        router.setOracle(address(oracle));

        // Grant oracle NAV_UPDATER_ROLE on vault
        vault.grantRole(vault.NAV_UPDATER_ROLE(), address(oracle));

        // Register auditor
        oracle.addAuditor(auditor);

        // Setup investor
        vault.grantRole(vault.INVESTOR_ROLE(), investor);
        usdc.mint(investor, 1000 * 1e6);
        vm.prank(investor);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// @dev Signs a NAV payload. timestamp must be > vault.navUpdatedAt().
    ///      Callers should pass block.timestamp + some offset to satisfy this.
    function _signedPayload(
        uint256 nav,
        uint256 timestamp,
        uint256 nonce
    ) internal view returns (bytes memory response) {
        bytes32 structHash = keccak256(abi.encode(
            oracle.NAV_UPDATE_TYPEHASH(),
            address(vault),
            nav,
            timestamp,
            nonce
        ));
        // Reconstruct the domain separator the same way EIP712 does
        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("NAVOracle"),
            keccak256("1"),
            block.chainid,
            address(oracle)
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(auditorKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        response = abi.encode(nav, timestamp, nonce, sig);
    }

    function _fulfill(bytes memory response) internal {
        bytes32 reqId = bytes32(uint256(1));
        router.fulfillWithResponse(reqId, response, "");
    }

    // ── Auditor management ────────────────────────────────────────────────────

    function test_addAuditor() public {
        address newAuditor = makeAddr("auditor2");
        oracle.addAuditor(newAuditor);
        assertTrue(oracle.isAuditor(newAuditor));
    }

    function test_addAuditor_nonOwner_reverts() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert();
        oracle.addAuditor(makeAddr("anyone"));
    }

    function test_removeAuditor() public {
        oracle.removeAuditor(auditor);
        assertFalse(oracle.isAuditor(auditor));
    }

    // ── Automation ────────────────────────────────────────────────────────────

    function test_checkUpkeep_trueAfterInterval() public {
        skip(REQ_INTERVAL + 1);
        (bool needed,) = oracle.checkUpkeep("");
        assertTrue(needed);
    }

    function test_checkUpkeep_falseBeforeInterval() public {
        (bool needed,) = oracle.checkUpkeep("");
        assertFalse(needed);
    }

    function test_requestNAVUpdate_tooSoon_reverts() public {
        // lastRequestedAt starts at 0, but interval hasn't passed yet
        // after first request, second one should revert
        skip(REQ_INTERVAL + 1);
        oracle.requestNAVUpdate();
        vm.expectRevert("NAVOracle: too soon");
        oracle.requestNAVUpdate();
    }

    function test_requestNAVUpdate_setsLastRequestedAt() public {
        skip(REQ_INTERVAL + 1);
        oracle.requestNAVUpdate();
        assertEq(oracle.lastRequestedAt(), block.timestamp);
    }

    // ── fulfillRequest — valid cases ──────────────────────────────────────────

    function test_fulfill_validSig_updatesVault() public {
        uint256 newNav = (INITIAL_NAV * 105) / 100; // +5%
        uint256 ts = block.timestamp + 1; // must be > navUpdatedAt (set at warp time)
        uint256 nonce = 1;

        bytes memory response = _signedPayload(newNav, ts, nonce);
        _fulfill(response);

        assertEq(vault.navPerShare(), newNav, "vault nav updated");
        assertEq(oracle.lastNonce(), nonce, "nonce advanced");
    }

    function test_fulfill_emitsEvent() public {
        uint256 newNav = (INITIAL_NAV * 105) / 100;
        uint256 ts = block.timestamp + 1;
        bytes memory response = _signedPayload(newNav, ts, 1);

        vm.expectEmit(false, false, false, true);
        emit NAVOracle.NAVUpdatedViaOracle(newNav, ts, auditor);
        _fulfill(response);
    }

    // ── fulfillRequest — rejection cases ─────────────────────────────────────

    function test_fulfill_errorBytes_noUpdate() public {
        uint256 navBefore = vault.navPerShare();
        bytes32 reqId = bytes32(uint256(1));
        router.fulfillWithResponse(reqId, "", "API error");
        assertEq(vault.navPerShare(), navBefore, "nav unchanged on error");
    }

    function test_fulfill_invalidSig_reverts() public {
        uint256 newNav = (INITIAL_NAV * 105) / 100;
        uint256 ts = block.timestamp + 1;
        // Sign with a non-auditor key
        uint256 strangerKey = 0xBAD;
        bytes32 structHash = keccak256(abi.encode(
            oracle.NAV_UPDATE_TYPEHASH(),
            address(vault),
            newNav,
            ts,
            uint256(1)
        ));
        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("NAVOracle"),
            keccak256("1"),
            block.chainid,
            address(oracle)
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(strangerKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        bytes memory response = abi.encode(newNav, ts, uint256(1), sig);

        vm.expectRevert("NAVOracle: invalid signer");
        _fulfill(response);
    }

    function test_fulfill_staleTimestamp_reverts() public {
        uint256 newNav = (INITIAL_NAV * 105) / 100;
        // Payload timestamp is 3 hours old (beyond MAX_PAYLOAD_AGE = 2h)
        uint256 staleTs = block.timestamp - 3 hours;
        bytes memory response = _signedPayload(newNav, staleTs, 1);

        vm.expectRevert("NAVOracle: payload too old");
        _fulfill(response);
    }

    function test_fulfill_timestampNotNewer_reverts() public {
        // First update succeeds
        uint256 ts1 = block.timestamp + 1;
        bytes memory r1 = _signedPayload((INITIAL_NAV * 105) / 100, ts1, 1);
        _fulfill(r1);

        // vault.navUpdatedAt is now set to the block.timestamp of the fulfill call
        uint256 navUpdatedAt = vault.navUpdatedAt();

        skip(1 hours);
        // Second payload uses navUpdatedAt exactly — not strictly greater, so should revert
        bytes memory r2 = _signedPayload((INITIAL_NAV * 104) / 100, navUpdatedAt, 2);
        vm.expectRevert("NAVOracle: timestamp not newer");
        _fulfill(r2);
    }

    function test_fulfill_nonceReplay_reverts() public {
        bytes memory r1 = _signedPayload((INITIAL_NAV * 105) / 100, block.timestamp + 1, 1);
        _fulfill(r1);

        // Try to replay nonce 1
        skip(1 minutes);
        bytes memory r2 = _signedPayload((INITIAL_NAV * 104) / 100, block.timestamp + 1, 1);
        vm.expectRevert("NAVOracle: nonce replay");
        _fulfill(r2);
    }

    function test_fulfill_wrongVault_reverts() public {
        // Sign for a different vault address — ecrecover gives a different signer
        uint256 newNav = (INITIAL_NAV * 105) / 100;
        uint256 ts = block.timestamp + 1;
        address wrongVault = makeAddr("otherVault");
        bytes32 structHash = keccak256(abi.encode(
            oracle.NAV_UPDATE_TYPEHASH(),
            wrongVault, // wrong vault
            newNav,
            ts,
            uint256(1)
        ));
        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("NAVOracle"),
            keccak256("1"),
            block.chainid,
            address(oracle)
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(auditorKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        bytes memory response = abi.encode(newNav, ts, uint256(1), sig);

        vm.expectRevert("NAVOracle: invalid signer");
        _fulfill(response);
    }

    function test_fulfill_navZero_reverts() public {
        bytes memory response = _signedPayload(0, block.timestamp + 1, 1);
        vm.expectRevert("NAVOracle: nav must be > 0");
        _fulfill(response);
    }
}
