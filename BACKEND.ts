// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      ABRAND — Backend (Complete)                            ║
// ║              ETHGlobal Cannes Hackathon · TypeScript + Node.js              ║
// ║                                                                            ║
// ║  Stack: viem · EIP-712 · Coinbase Prime API · Binance API · Bridge.xyz    ║
// ║  Chains: Base Sepolia (84532) · Arc Testnet (5042002)                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// TABLE OF CONTENTS
// ─────────────────
// 1. NAV Keeper (keeper.ts)             — Polls exchange equity, signs EIP-712, pushes on-chain
// 2. EIP-712 Signer (sign-nav.ts)       — Signs NAV payloads for NAVOracle.fulfillRequest()
// 3. Coinbase Prime Client              — Fetches portfolio equity from Coinbase Prime
// 4. Binance Client                     — Fetches sub-account equity from Binance
// 5. API: /api/bridge (route.ts)        — Bridge.xyz USDC→USD wire transfer endpoint
// 6. API: /api/nav-attestation          — Mock auditor EIP-712 NAV signing endpoint


// ═══════════════════════════════════════════════════════════════════════════════
// 1. NAV Keeper — keeper.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Polls exchange subaccount equity → signs EIP-712 NAV payload → pushes on-chain.
//
// Chains:
//   Arc testnet  — calls MockFunctionsRouter.fulfillRequest() directly (no Chainlink)
//   Base Sepolia — Chainlink Automation triggers the DON which fetches /api/nav-attestation
//
// Exchange sources (priority order):
//   1. Coinbase Prime portfolio equity (COINBASE_PRIME_API_KEY set)
//   2. Binance sub-account equity      (BINANCE_API_KEY set)
//   3. DEMO_NAV_OVERRIDE env var        (hardcoded fallback)
//
// Run:
//   npm run keeper          # loop forever at KEEPER_INTERVAL_MS
//   npm run keeper:once     # single run, exit

import { createPublicClient, createWalletClient, http, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
// import { fetchCoinbasePrimeNAV } from "./exchange/coinbase-prime.js";
// import { fetchBinanceSubAccountNAV } from "./exchange/binance.js";
// import { signNAVPayload, type SignerConfig } from "./sign-nav.js";

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

const MOCK_ROUTER_ABI = [
  parseAbiItem("function fulfillRequest(address client, bytes32 requestId, bytes calldata response, bytes calldata err) external"),
] as const;

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

async function fetchNAV(): Promise<bigint> {
  if (process.env.DEMO_NAV_OVERRIDE) {
    const nav = BigInt(process.env.DEMO_NAV_OVERRIDE);
    console.log(`[nav] Using DEMO_NAV_OVERRIDE: $${(Number(nav) / 1e6).toFixed(6)}`);
    return nav;
  }
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
  if (process.env.BINANCE_API_KEY) {
    const nav = await fetchBinanceSubAccountNAV({
      apiKey: requireEnv("BINANCE_API_KEY"),
      apiSecret: requireEnv("BINANCE_API_SECRET"),
      subAccountEmail: requireEnv("BINANCE_SUBACCOUNT_EMAIL"),
    });
    console.log(`[nav] Binance sub-account equity: $${(Number(nav) / 1e6).toFixed(2)}`);
    return nav;
  }
  throw new Error("No NAV source configured. Set COINBASE_PRIME_API_KEY, BINANCE_API_KEY, or DEMO_NAV_OVERRIDE.");
}

// In-memory nonce. For production: persist to DB or KV store.
const nonces: Record<number, bigint> = {};
function nextNonce(chainId: number): bigint {
  const n = (nonces[chainId] ?? BigInt(0)) + BigInt(1);
  nonces[chainId] = n;
  return n;
}

async function pushToArc(nav: bigint): Promise<void> {
  const auditorPrivateKey = requireEnv("AUDITOR_PRIVATE_KEY") as `0x${string}`;
  const vaultAddress = requireEnv("ARC_VAULT_ADDRESS") as `0x${string}`;
  const oracleAddress = requireEnv("ARC_ORACLE_ADDRESS") as `0x${string}`;
  const routerAddress = requireEnv("ARC_MOCK_ROUTER_ADDRESS") as `0x${string}`;

  const signerConfig = { auditorPrivateKey, vaultAddress, oracleAddress, chainId: arcTestnet.id };
  const { encoded } = await signNAVPayload(signerConfig, nav, nextNonce(arcTestnet.id));

  const account = privateKeyToAccount(auditorPrivateKey);
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() });

  const hash = await walletClient.writeContract({
    address: routerAddress,
    abi: MOCK_ROUTER_ABI,
    functionName: "fulfillRequest",
    args: [oracleAddress, "0x0000000000000000000000000000000000000000000000000000000000000001", encoded, "0x"],
  });
  console.log(`[arc] NAV pushed — tx: ${hash}`);
}

async function pushToBaseSepolia(_nav: bigint): Promise<void> {
  console.log("[base-sepolia] Chainlink Automation + Functions manages this chain.");
}

async function tick(): Promise<void> {
  console.log(`\n[keeper] ${new Date().toISOString()} — fetching NAV...`);
  let nav: bigint;
  try { nav = await fetchNAV(); } catch (err) { console.error("[keeper] NAV fetch failed:", err); return; }

  const tasks: Promise<void>[] = [];
  if (process.env.ARC_VAULT_ADDRESS && process.env.ARC_MOCK_ROUTER_ADDRESS) {
    tasks.push(pushToArc(nav).catch((e) => console.error("[arc] push failed:", e)));
  }
  if (process.env.BASE_VAULT_ADDRESS) { tasks.push(pushToBaseSepolia(nav)); }
  if (tasks.length === 0) { console.warn("[keeper] No chains configured."); return; }

  await Promise.all(tasks);
  console.log(`[keeper] Done. NAV = $${(Number(nav) / 1e6).toFixed(6)}`);
}


// ═══════════════════════════════════════════════════════════════════════════════
// 2. EIP-712 NAV Signer — sign-nav.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { encodeAbiParameters, parseAbiParameters } from "viem";

export interface NAVPayload {
  nav: bigint;
  timestamp: bigint;
  nonce: bigint;
  sig: `0x${string}`;
}

export interface SignerConfig {
  auditorPrivateKey: `0x${string}`;
  vaultAddress: `0x${string}`;
  oracleAddress: `0x${string}`;
  chainId: number;
}

/**
 * Sign a NAV update with EIP-712. Returns the ABI-encoded bytes that
 * MockFunctionsRouter.fulfillRequest() passes to NAVOracle.fulfillRequest().
 */
export async function signNAVPayload(
  config: SignerConfig,
  nav: bigint,
  nonce: bigint
): Promise<{ payload: NAVPayload; encoded: `0x${string}` }> {
  const account = privateKeyToAccount(config.auditorPrivateKey);
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  const domain = {
    name: "NAVOracle",
    version: "1",
    chainId: config.chainId,
    verifyingContract: config.oracleAddress,
  } as const;

  const types = {
    NAVUpdate: [
      { name: "vault", type: "address" },
      { name: "nav", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  } as const;

  const message = { vault: config.vaultAddress, nav, timestamp, nonce };
  const sig = await account.signTypedData({ domain, types, primaryType: "NAVUpdate", message });

  const encoded = encodeAbiParameters(
    parseAbiParameters("uint256, uint256, uint256, bytes"),
    [nav, timestamp, nonce, sig]
  );

  return { payload: { nav, timestamp, nonce, sig }, encoded };
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. Coinbase Prime Client — exchange/coinbase-prime.ts
// ═══════════════════════════════════════════════════════════════════════════════

import crypto from "crypto";

interface CoinbasePrimeConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  portfolioId: string;
  baseUrl?: string;
}

function signCoinbase(secret: string, timestamp: string, method: string, requestPath: string, body: string): string {
  const message = `${timestamp}${method}${requestPath}${body}`;
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

/**
 * Fetch total portfolio equity from Coinbase Prime.
 * Returns value in USDC units (1e6 = $1.00).
 */
export async function fetchCoinbasePrimeNAV(config: CoinbasePrimeConfig): Promise<bigint> {
  const baseUrl = config.baseUrl ?? "https://api.prime.coinbase.com";
  const requestPath = `/v1/portfolios/${config.portfolioId}/balances?balance_type=TOTAL_BALANCE&currency=USD`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = signCoinbase(config.apiSecret, timestamp, "GET", requestPath, "");

  const res = await fetch(`${baseUrl}${requestPath}`, {
    headers: {
      "X-CB-ACCESS-KEY": config.apiKey,
      "X-CB-ACCESS-PASSPHRASE": config.passphrase,
      "X-CB-ACCESS-SIGN": sig,
      "X-CB-ACCESS-TIMESTAMP": timestamp,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) { const text = await res.text(); throw new Error(`Coinbase Prime API error ${res.status}: ${text}`); }
  const data = await res.json();
  const usdValue = parseFloat(data.breakdown.total_balance.value);
  if (!isFinite(usdValue) || usdValue <= 0) throw new Error(`Invalid equity: ${data.breakdown.total_balance.value}`);
  return BigInt(Math.round(usdValue * 1e6));
}


// ═══════════════════════════════════════════════════════════════════════════════
// 4. Binance Client — exchange/binance.ts
// ═══════════════════════════════════════════════════════════════════════════════

interface BinanceConfig {
  apiKey: string;
  apiSecret: string;
  subAccountEmail: string;
  baseUrl?: string;
}

function hmacSign(secret: string, queryString: string): string {
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

function buildQuery(params: Record<string, string | number>): string {
  return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

/**
 * Fetch sub-account equity from Binance.
 * Returns value in USDC units (1e6 = $1.00).
 */
export async function fetchBinanceSubAccountNAV(config: BinanceConfig): Promise<bigint> {
  const baseUrl = config.baseUrl ?? "https://api.binance.com";

  // 1. Fetch sub-account asset balances
  const timestamp = Date.now();
  const assetParams = buildQuery({ email: config.subAccountEmail, timestamp });
  const assetSig = hmacSign(config.apiSecret, assetParams);

  const assetRes = await fetch(
    `${baseUrl}/sapi/v1/sub-account/assets?${assetParams}&signature=${assetSig}`,
    { headers: { "X-MBX-APIKEY": config.apiKey } }
  );
  if (!assetRes.ok) { const text = await assetRes.text(); throw new Error(`Binance error ${assetRes.status}: ${text}`); }

  const { assetList } = await assetRes.json();
  const totalBTC = assetList.reduce((sum: number, a: any) => sum + parseFloat(a.btcValue), 0);
  if (totalBTC <= 0) return BigInt(0);

  // 2. Fetch BTC/USDT spot price
  const priceRes = await fetch(`${baseUrl}/api/v3/ticker/price?symbol=BTCUSDT`);
  if (!priceRes.ok) throw new Error("Failed to fetch BTC/USDT price");
  const { price: btcPriceStr } = await priceRes.json();
  const usdValue = totalBTC * parseFloat(btcPriceStr);

  return BigInt(Math.round(usdValue * 1e6));
}


// ═══════════════════════════════════════════════════════════════════════════════
// 5. API: /api/bridge — Bridge.xyz USDC→USD Wire Transfer
// ═══════════════════════════════════════════════════════════════════════════════
// Next.js API Route (POST)
//
// Flow:
//   1. Validate: amount, address, signature, bank details
//   2. Verify wallet signature via viem
//   3. Optional: on-chain hedge fund whitelist check (ABRANDPool.isHedgeFund)
//   4. Call Bridge.xyz API with wire destination
//   5. Return reference ID

import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient as createClient, verifyMessage } from 'viem'

const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY
const POOL_ADDRESS = process.env.NEXT_PUBLIC_ABRAND_POOL_ADDRESS as `0x${string}`

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { amount, address, signature, message, beneficiary, bank } = body

  if (!amount || !address || !signature || !message) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (!bank?.name) return NextResponse.json({ error: 'Missing bank name' }, { status: 400 })
  if (!bank?.account) return NextResponse.json({ error: 'Missing account number' }, { status: 400 })
  if (!bank?.routing || !/^\d{9}$/.test(bank.routing)) return NextResponse.json({ error: 'Routing number must be 9 digits' }, { status: 400 })

  // Verify wallet signature
  const valid = await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` })
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  // Call Bridge.xyz
  const bridgeRes = await fetch('https://api.bridge.xyz/v0/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': BRIDGE_API_KEY ?? '' },
    body: JSON.stringify({
      amount,
      on_behalf_of: address,
      source: { payment_rail: 'ethereum', currency: 'usdc' },
      destination: {
        payment_rail: 'wire',
        currency: 'usd',
        beneficiary: { name: beneficiary?.name ?? '' },
        bank_account: {
          bank_name: bank.name,
          account_number: bank.account,
          routing_number: bank.routing,
          account_type: 'checking',
          country: bank.country ?? 'US',
        },
      },
    }),
  })

  if (!bridgeRes.ok) {
    const err = await bridgeRes.json().catch(() => ({}))
    return NextResponse.json({ error: err.message ?? 'Bridge.xyz request failed' }, { status: 502 })
  }

  const data = await bridgeRes.json()
  return NextResponse.json({ reference: data.id ?? data.reference })
}


// ═══════════════════════════════════════════════════════════════════════════════
// 6. API: /api/nav-attestation — Mock Auditor NAV Attestation
// ═══════════════════════════════════════════════════════════════════════════════
// Next.js API Route (GET)
//
// Returns EIP-712 signed NAV payload for Chainlink Functions or direct submission.
// Query: ?chainId=5042002 (default: Base Sepolia 84532)
//
// In production: this endpoint would be operated by a licensed fund administrator.

import { createWalletClient as createWallet, toHex } from "viem";
import fs from "fs";
import path from "path";

const AUDITOR_PRIVATE_KEY = process.env.AUDITOR_PRIVATE_KEY as `0x${string}`;
const CURRENT_NAV_USDC = BigInt(process.env.DEMO_NAV_USDC ?? "1050000"); // $1.05

// Nonce persisted per-chain to avoid cross-chain replay.
function nonceFile(chainId: number): string { return path.join(process.cwd(), `.nonce-${chainId}`); }
function readNonce(chainId: number): bigint {
  try { return BigInt(fs.readFileSync(nonceFile(chainId), "utf8").trim()); } catch { return BigInt(1); }
}
function writeNonce(chainId: number, nonce: bigint): void {
  fs.writeFileSync(nonceFile(chainId), nonce.toString(), "utf8");
}

export async function GET(req: NextRequest) {
  const chainId = parseInt(req.nextUrl.searchParams.get("chainId") ?? "84532");
  const vaultAddress = process.env[chainId === 5042002 ? 'NEXT_PUBLIC_ARC_VAULT_ADDRESS' : 'NEXT_PUBLIC_VAULT_ADDRESS'] as `0x${string}`;
  const oracleAddress = process.env[chainId === 5042002 ? 'NEXT_PUBLIC_ARC_ORACLE_ADDRESS' : 'NEXT_PUBLIC_ORACLE_ADDRESS'] as `0x${string}`;

  if (!AUDITOR_PRIVATE_KEY) return NextResponse.json({ error: "AUDITOR_PRIVATE_KEY not set" }, { status: 500 });
  if (!vaultAddress || !oracleAddress) return NextResponse.json({ error: `Addresses not configured for chainId ${chainId}` }, { status: 500 });

  const account = privateKeyToAccount(AUDITOR_PRIVATE_KEY);
  const nav = CURRENT_NAV_USDC;
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const nonce = readNonce(chainId);

  // EIP-712 domain separator (must match NAVOracle constructor)
  const sig = await account.signTypedData({
    domain: { name: "NAVOracle", version: "1", chainId, verifyingContract: oracleAddress },
    types: { NAVUpdate: [
      { name: "vault", type: "address" },
      { name: "nav", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ]},
    primaryType: "NAVUpdate",
    message: { vault: vaultAddress, nav, timestamp, nonce },
  });

  writeNonce(chainId, nonce + BigInt(1));

  return NextResponse.json({
    nav: toHex(nav),
    timestamp: toHex(timestamp),
    nonce: toHex(nonce),
    sig,
  });
}
