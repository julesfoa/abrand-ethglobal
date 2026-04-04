// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FundVault.sol";
import "../src/NAVOracle.sol";
import "../src/NAVConsumer.sol";
import "../src/VaultFactory.sol";
import "../src/MockFunctionsRouter.sol";
import "../test/FundVault.t.sol"; // re-uses MockUSDC

contract Deploy is Script {
    // ── Chain IDs ────────────────────────────────────────────────────────────
    uint256 constant BASE_SEPOLIA_ID = 84532;
    uint256 constant ARC_TESTNET_ID  = 5042002;

    // ── Base Sepolia: real Chainlink Functions ────────────────────────────────
    address constant FUNCTIONS_ROUTER_BASE = 0xf9B8fc078197181C841c296C876945aaa425B278;
    bytes32 constant DON_ID_BASE = 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000; // "fun-base-sepolia-1"

    // ── Arc: native USDC (ERC-20 interface at precompile address) ─────────────
    address constant USDC_ARC = 0x3600000000000000000000000000000000000000;

    // ── Chainlink Price Feeds (Connect the World bounty) ─────────────────────
    // ETH/USD on Base Sepolia — used as benchmark for NAV deviation checks
    address constant ETH_USD_FEED_BASE_SEPOLIA = 0x4ADC67d868ec68B90e2aD49f6cc4A8455E9c4fd4;

    // ── Chainlink Functions JS source ─────────────────────────────────────────
    // Fetches auditor-signed NAV from the mock attestation API.
    // In production: replace URL with your hosted endpoint.
    string constant JS_SOURCE =
        "const res = await Functions.makeHttpRequest({"
        "  url: secrets.NAV_API_URL || 'https://your-frontend.vercel.app/api/nav-attestation',"
        "  method: 'GET'"
        "});"
        "if (res.error) throw new Error('API request failed');"
        "const { nav, timestamp, nonce, sig } = res.data;"
        "return Functions.encodeAbiParameters("
        "  ['uint256','uint256','uint256','bytes'],"
        "  [BigInt(nav), BigInt(timestamp), BigInt(nonce), sig]"
        ");";

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        uint256 chainId     = block.chainid;

        uint256 maxStaleness   = vm.envOr("MAX_NAV_STALENESS",    uint256(7 days));
        uint64  subscriptionId = uint64(vm.envOr("CHAINLINK_SUB_ID",    uint256(0)));
        uint32  gasLimit       = uint32(vm.envOr("CHAINLINK_GAS_LIMIT", uint256(300_000)));
        uint256 reqInterval    = vm.envOr("NAV_REQUEST_INTERVAL",  uint256(1 hours));

        vm.startBroadcast(deployerKey);

        // ── 1. USDC ───────────────────────────────────────────────────────────
        address usdcAddr;
        if (chainId == ARC_TESTNET_ID) {
            // Arc has native USDC as a precompile — use the ERC-20 interface
            usdcAddr = USDC_ARC;
            console.log("Using Arc native USDC:", USDC_ARC);
        } else {
            // Base Sepolia (and local anvil): deploy MockUSDC
            MockUSDC usdc = new MockUSDC();
            usdc.mint(deployer, 1_000_000 * 1e6);
            usdcAddr = address(usdc);
            console.log("Deployed MockUSDC:    ", usdcAddr);
        }

        // ── 2. Vault ──────────────────────────────────────────────────────────
        VaultFactory factory = new VaultFactory();
        address vaultAddr = factory.deployVault(
            usdcAddr,
            "ABRAND Fund1 Vehicle1",
            "ABR-F1V1",
            1e6,          // initialNav = $1.00
            maxStaleness
        );
        FundVault vault = FundVault(vaultAddr);

        // ── 3. Functions router ───────────────────────────────────────────────
        address functionsRouter;
        bytes32 donId;

        if (chainId == ARC_TESTNET_ID) {
            // Arc: deploy stub router — admin fulfills requests manually
            MockFunctionsRouter mockRouter = new MockFunctionsRouter();
            functionsRouter = address(mockRouter);
            donId = bytes32(0);
            console.log("Deployed MockFunctionsRouter:", functionsRouter);
            console.log("  -> use MockFunctionsRouter.fulfillRequest() to push NAV updates");
        } else {
            // Base Sepolia: real Chainlink Functions
            functionsRouter = FUNCTIONS_ROUTER_BASE;
            donId = DON_ID_BASE;
            console.log("Using Chainlink Functions router:", functionsRouter);
        }

        // ── 4. NAVOracle ──────────────────────────────────────────────────────
        NAVOracle oracle = new NAVOracle(
            functionsRouter,
            vaultAddr,
            subscriptionId,
            gasLimit,
            donId,
            reqInterval,
            JS_SOURCE
        );

        // ── 5. NAVConsumer (CRE path) ─────────────────────────────────────────
        // NAVConsumer replaces NAVOracle in the CRE-based architecture.
        // The CRE forwarder address is set to address(0) at deploy time and
        // updated via setCREForwarder() once the Chainlink team provides it.
        // During simulation/demo the forwarder check is skipped (addr(0) = open).
        // Price feed: use ETH/USD on Base Sepolia, none on Arc (no feeds yet)
        address priceFeed = chainId == BASE_SEPOLIA_ID
            ? ETH_USD_FEED_BASE_SEPOLIA
            : address(0);
        NAVConsumer consumer = new NAVConsumer(vaultAddr, address(0), priceFeed);
        consumer.addAuditor(deployer); // demo auditor = deployer; replace in prod

        // ── 6. Wire up roles ──────────────────────────────────────────────────
        // Legacy Functions/Automation path
        vault.grantRole(vault.NAV_UPDATER_ROLE(), address(oracle));
        oracle.addAuditor(deployer);

        // CRE path: NAVConsumer holds NAV_UPDATER_ROLE
        vault.grantRole(vault.NAV_UPDATER_ROLE(), address(consumer));

        vm.stopBroadcast();

        // ── Summary ───────────────────────────────────────────────────────────
        string memory chainName = chainId == ARC_TESTNET_ID ? "Arc Testnet" :
                                  chainId == BASE_SEPOLIA_ID ? "Base Sepolia" : "Unknown";

        console.log("=== ABRAND Deployment ===");
        console.log("Chain:            ", chainName);
        console.log("Chain ID:         ", chainId);
        console.log("Deployer:         ", deployer);
        console.log("USDC:             ", usdcAddr);
        console.log("Factory:          ", address(factory));
        console.log("Vault (F1V1):     ", vaultAddr);
        console.log("NAVOracle:        ", address(oracle));
        console.log("NAVConsumer (CRE):", address(consumer));
        console.log("FunctionsRouter:  ", functionsRouter);
        console.log("Max staleness:    ", maxStaleness, "seconds");
        console.log("==========================");
        console.log("CRE Workflow setup:");
        console.log("  1. Update cre-nav-workflow/src/workflows/nav-updater/config.json:");
        console.log("     fundVaultAddress  =", vaultAddr);
        console.log("     navConsumerAddress=", address(consumer));
        console.log("  2. Start auditor server: node oracle/auditor-server.js");
        console.log("  3. Simulate: cd cre-nav-workflow && npm run simulate");
        console.log("  4. Show Chainlink team the simulation - they deploy to live CRE");
        console.log("==========================");
        console.log("Next steps:");
        if (chainId == ARC_TESTNET_ID) {
            console.log("  1. Copy vault + consumer addresses to .env.local (ARC_ prefix)");
            console.log("  2. To update NAV: run CRE simulation or call NAVConsumer.onReport()");
        } else {
            console.log("  1. Copy vault address to .env.local NEXT_PUBLIC_VAULT_ADDRESS");
            console.log("  2. Run CRE simulation to test NAV update pipeline");
            console.log("  3. Grant Chainlink team CRE forwarder: consumer.setCREForwarder(addr)");
        }
        console.log("==========================");
    }
}
