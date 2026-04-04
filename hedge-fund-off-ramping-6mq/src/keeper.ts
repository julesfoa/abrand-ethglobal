/**
 * NAV Keeper
 *
 * Polls exchange subaccount equity → signs EIP-712 NAV payload → pushes on-chain.
 *
 * Chains:
 *   Arc testnet  — calls MockFunctionsRouter.fulfillRequest() directly (no Chainlink)
 *   Base Sepolia — Chainlink Automation triggers the DON which fetches /api/nav-attestation
 *                  autonomously; keeper just updates the nav-attestation cache if needed.
 *
 * Exchange sources (in priority order):
 *   1. Coinbase Prime portfolio equity (COINBASE_PRIME_API_KEY set)
 *   2. Binance sub-account equity      (BINANCE_API_KEY set)
 *   3. DEMO_NAV_OVERRIDE env var        (hardcoded fallback)
 *
 * Run:
 *   npm run keeper          # loop forever at KEEPER_INTERVAL_MS
 *   npm run keeper:once     # single run, exit
 */

import { createPublicClient, createWalletClient, http, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { fetchCoinbasePrimeNAV } from "./exchange/coinbase-prime.js";
import { fetchBinanceSubAccountNAV } from "./exchange/binance.js";
import { signNAVPayload, type SignerConfig } from "./sign-nav.js";

// ── Chain definitions ────────────────────────────────────────────────────────

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_RPC_URL ?? "https://rpc.arcprotocol.xyz"] } },
} as const;

const baseSepolia = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"] } },
} as const;

// ── ABIs (minimal) ───────────────────────────────────────────────────────────

const MOCK_ROUTER_ABI = [
  parseAbiItem(
    "function fulfillRequest(address client, bytes32 requestId, bytes calldata response, bytes calldata err) external"
  ),
] as const;

const VAULT_ABI = [
  parseAbiItem("function navPerShare() external view returns (uint256)"),
  parseAbiItem("function totalSupply() external view returns (uint256)"),
] as const;

// ── Config ───────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

// ── NAV source ───────────────────────────────────────────────────────────────

async function fetchNAV(): Promise<bigint> {
  // Override: hardcoded demo value
  if (process.env.DEMO_NAV_OVERRIDE) {
    const nav = BigInt(process.env.DEMO_NAV_OVERRIDE);
    console.log(`[nav] Using DEMO_NAV_OVERRIDE: $${(Number(nav) / 1e6).toFixed(6)}`);
    return nav;
  }

  // Source 1: Coinbase Prime
  if (process.env.COINBASE_PRIME_API_KEY) {
    const nav = await fetchCoinbasePrimeNAV({
      apiKey: requireEnv("COINBASE_PRIME_API_KEY"),
      apiSecret: requireEnv("COINBASE_PRIME_API_SECRET"),
      passphrase: requireEnv("COINBASE_PRIME_PASSPHRASE"),
      portfolioId: requireEnv("COINBASE_PRIME_PORTFOLIO_ID"),
    });
    console.log(`[nav] Coinbase Prime equity: $${(Number(nav) / 1e6).toFixed(2)}`);
    return nav;
  }

  // Source 2: Binance sub-account
  if (process.env.BINANCE_API_KEY) {
    const nav = await fetchBinanceSubAccountNAV({
      apiKey: requireEnv("BINANCE_API_KEY"),
      apiSecret: requireEnv("BINANCE_API_SECRET"),
      subAccountEmail: requireEnv("BINANCE_SUBACCOUNT_EMAIL"),
    });
    console.log(`[nav] Binance sub-account equity: $${(Number(nav) / 1e6).toFixed(2)}`);
    return nav;
  }

  throw new Error(
    "No NAV source configured. Set COINBASE_PRIME_API_KEY, BINANCE_API_KEY, or DEMO_NAV_OVERRIDE."
  );
}

// ── Nonce management ─────────────────────────────────────────────────────────
// Simple in-memory nonce. For production: persist to DB or KV store.

const nonces: Record<number, bigint> = {};

function nextNonce(chainId: number): bigint {
  const n = (nonces[chainId] ?? BigInt(0)) + BigInt(1);
  nonces[chainId] = n;
  return n;
}

// ── Arc push ─────────────────────────────────────────────────────────────────

async function pushToArc(nav: bigint): Promise<void> {
  const auditorPrivateKey = requireEnv("AUDITOR_PRIVATE_KEY") as `0x${string}`;
  const vaultAddress     = requireEnv("ARC_VAULT_ADDRESS")  as `0x${string}`;
  const oracleAddress    = requireEnv("ARC_ORACLE_ADDRESS") as `0x${string}`;
  const routerAddress    = requireEnv("ARC_MOCK_ROUTER_ADDRESS") as `0x${string}`;

  const signerConfig: SignerConfig = {
    auditorPrivateKey,
    vaultAddress,
    oracleAddress,
    chainId: arcTestnet.id,
  };

  const { encoded } = await signNAVPayload(signerConfig, nav, nextNonce(arcTestnet.id));

  const account = privateKeyToAccount(auditorPrivateKey);
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(),
  });

  const hash = await walletClient.writeContract({
    address: routerAddress,
    abi: MOCK_ROUTER_ABI,
    functionName: "fulfillRequest",
    args: [oracleAddress, "0x0000000000000000000000000000000000000000000000000000000000000001", encoded, "0x"],
  });

  console.log(`[arc] NAV pushed — tx: ${hash}`);
}

// ── Base Sepolia: just log (Chainlink Automation handles it) ─────────────────
// If you want to force-push outside the Automation schedule, you can call
// oracle.requestNAVUpdate() which triggers a new Chainlink Functions request.

async function pushToBaseSepolia(_nav: bigint): Promise<void> {
  console.log("[base-sepolia] Chainlink Automation + Functions manages this chain.");
  console.log("[base-sepolia] Ensure /api/nav-attestation endpoint returns current NAV.");
  console.log("[base-sepolia] Keeper interval must be < maxNavStaleness (default 30 min).");
}

// ── Main loop ────────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  console.log(`\n[keeper] ${new Date().toISOString()} — fetching NAV...`);

  let nav: bigint;
  try {
    nav = await fetchNAV();
  } catch (err) {
    console.error("[keeper] NAV fetch failed:", err);
    return;
  }

  const tasks: Promise<void>[] = [];

  if (process.env.ARC_VAULT_ADDRESS && process.env.ARC_MOCK_ROUTER_ADDRESS) {
    tasks.push(
      pushToArc(nav).catch((e) => console.error("[arc] push failed:", e))
    );
  }

  if (process.env.BASE_VAULT_ADDRESS) {
    tasks.push(pushToBaseSepolia(nav));
  }

  if (tasks.length === 0) {
    console.warn("[keeper] No chains configured. Set ARC_VAULT_ADDRESS or BASE_VAULT_ADDRESS.");
    return;
  }

  await Promise.all(tasks);
  console.log(`[keeper] Done. NAV = $${(Number(nav) / 1e6).toFixed(6)}`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const once = process.argv.includes("--once");
const intervalMs = parseInt(process.env.KEEPER_INTERVAL_MS ?? "600000"); // default 10 min

await tick();

if (!once) {
  setInterval(tick, intervalMs);
  console.log(`\n[keeper] Running every ${intervalMs / 1000}s. Ctrl+C to stop.`);
}
