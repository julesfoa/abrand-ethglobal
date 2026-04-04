/**
 * Mock auditor attestation API.
 *
 * Returns an EIP-712 signed NAV payload. In production, this endpoint would be
 * operated by a licensed third-party fund administrator (the "auditor"). For the
 * hackathon demo, the team signs as the auditor using AUDITOR_PRIVATE_KEY.
 *
 * Chainlink Functions JS source fetches this endpoint on each upkeep cycle.
 * For Arc (MockFunctionsRouter), call this manually and pass the result to fulfillRequest().
 *
 * Response shape:
 *   { nav: string, timestamp: string, nonce: string, sig: string }
 *   All numeric values are stringified BigInt hex (0x-prefixed) for safe JSON transport.
 *
 * Query params:
 *   ?chainId=5042002   — sign for Arc testnet oracle (default: Base Sepolia)
 */

import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, toHex } from "viem";
import fs from "fs";
import path from "path";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { arcTestnet } from "@/lib/chains";
import { BASE_SEPOLIA_ID, ARC_TESTNET_ID } from "@/lib/contracts";

const AUDITOR_PRIVATE_KEY = process.env.AUDITOR_PRIVATE_KEY as `0x${string}`;

// NAV is set here by the fund manager. In production, this would be fetched
// from an authenticated fund admin system (e.g. prime broker API, verified NAV report).
// For demo: read from env or default to $1.05 (5% return).
const CURRENT_NAV_USDC = BigInt(
  process.env.DEMO_NAV_USDC ?? "1050000" // 1.05e6 = $1.05
);

// Per-chain vault + oracle addresses
const VAULT_BY_CHAIN: Record<number, string | undefined> = {
  [BASE_SEPOLIA_ID]: process.env.NEXT_PUBLIC_VAULT_ADDRESS,
  [ARC_TESTNET_ID]:  process.env.NEXT_PUBLIC_ARC_VAULT_ADDRESS,
};

const ORACLE_BY_CHAIN: Record<number, string | undefined> = {
  [BASE_SEPOLIA_ID]: process.env.NEXT_PUBLIC_ORACLE_ADDRESS,
  [ARC_TESTNET_ID]:  process.env.NEXT_PUBLIC_ARC_ORACLE_ADDRESS,
};

// Nonce persisted per-chain to avoid cross-chain replay.
function nonceFile(chainId: number): string {
  return path.join(process.cwd(), `.nonce-${chainId}`);
}

function readNonce(chainId: number): bigint {
  try {
    return BigInt(fs.readFileSync(nonceFile(chainId), "utf8").trim());
  } catch {
    return BigInt(1);
  }
}

function writeNonce(chainId: number, nonce: bigint): void {
  fs.writeFileSync(nonceFile(chainId), nonce.toString(), "utf8");
}

export async function GET(req: NextRequest) {
  const chainId = parseInt(req.nextUrl.searchParams.get("chainId") ?? String(BASE_SEPOLIA_ID));
  const chain = chainId === ARC_TESTNET_ID ? arcTestnet : baseSepolia;

  const vaultAddress = VAULT_BY_CHAIN[chainId] as `0x${string}` | undefined;
  const oracleAddress = ORACLE_BY_CHAIN[chainId] as `0x${string}` | undefined;

  if (!AUDITOR_PRIVATE_KEY) {
    return NextResponse.json({ error: "AUDITOR_PRIVATE_KEY not set" }, { status: 500 });
  }
  if (!vaultAddress || !oracleAddress) {
    return NextResponse.json(
      { error: `VAULT or ORACLE address not configured for chainId ${chainId}` },
      { status: 500 }
    );
  }

  const account = privateKeyToAccount(AUDITOR_PRIVATE_KEY);
  const client = createWalletClient({ account, chain, transport: http() });

  const nav = CURRENT_NAV_USDC;
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const nonce = readNonce(chainId);

  // EIP-712 domain separator (must match NAVOracle constructor)
  const domain = {
    name: "NAVOracle",
    version: "1",
    chainId,
    verifyingContract: oracleAddress,
  } as const;

  const types = {
    NAVUpdate: [
      { name: "vault", type: "address" },
      { name: "nav", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  } as const;

  const message = { vault: vaultAddress, nav, timestamp, nonce };

  const sig = await client.signTypedData({ domain, types, primaryType: "NAVUpdate", message });

  // Persist incremented nonce so server restarts don't allow replay
  writeNonce(chainId, nonce + BigInt(1));

  return NextResponse.json({
    nav: toHex(nav),
    timestamp: toHex(timestamp),
    nonce: toHex(nonce),
    sig,
    _debug: {
      chainId,
      navFormatted: `$${(Number(nav) / 1e6).toFixed(6)}`,
      auditor: account.address,
      vaultAddress,
    },
  });
}
