#!/usr/bin/env node
/**
 * sign-nav.js — CLI tool to sign and submit a NAV update directly to NAVOracle.
 *
 * Bypasses Chainlink Functions — useful for demos and emergency manual updates.
 * Uses NAVOracle.submitSignedNAV() which runs the same EIP-712 verification.
 *
 * Usage:
 *   # Just sign (print payload, don't submit)
 *   node oracle/sign-nav.js --nav 1050000
 *
 *   # Sign and submit on-chain
 *   node oracle/sign-nav.js --nav 1050000 --submit
 *
 *   # Override nonce (default: lastNonce+1 fetched from chain)
 *   node oracle/sign-nav.js --nav 1050000 --nonce 5 --submit
 *
 * nav is in USDC units: 1e6 = $1.00, 1050000 = $1.05
 */

require("dotenv").config({ path: __dirname + "/.env" });
const { ethers } = require("ethers");

const {
  AUDITOR_PRIVATE_KEY,
  VAULT_ADDRESS,
  ORACLE_ADDRESS,
  CHAIN_ID = "84532",
  RPC_URL,
} = process.env;

if (!AUDITOR_PRIVATE_KEY) throw new Error("AUDITOR_PRIVATE_KEY required");
if (!VAULT_ADDRESS)        throw new Error("VAULT_ADDRESS required");
if (!ORACLE_ADDRESS)       throw new Error("ORACLE_ADDRESS required");

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};
const has = (flag) => args.includes(flag);

const navArg = get("--nav");
if (!navArg) {
  console.error("Usage: node sign-nav.js --nav <usdc-units> [--submit] [--nonce <n>]");
  process.exit(1);
}
const nav = BigInt(navArg);
const submit = has("--submit");
const nonceOverride = get("--nonce") ? BigInt(get("--nonce")) : undefined;

// ── EIP-712 setup ─────────────────────────────────────────────────────────────
const wallet = new ethers.Wallet(AUDITOR_PRIVATE_KEY);

const domain = {
  name: "NAVOracle",
  version: "1",
  chainId: parseInt(CHAIN_ID),
  verifyingContract: ORACLE_ADDRESS,
};

const types = {
  NAVUpdate: [
    { name: "vault",     type: "address" },
    { name: "nav",       type: "uint256" },
    { name: "timestamp", type: "uint256" },
    { name: "nonce",     type: "uint256" },
  ],
};

const ORACLE_ABI = [
  "function lastNonce() view returns (uint256)",
  "function submitSignedNAV(uint256 nav, uint256 timestamp, uint256 nonce, bytes calldata sig) external",
];

async function main() {
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  let nonce;
  if (nonceOverride !== undefined) {
    nonce = nonceOverride;
  } else if (submit || true) {
    // Fetch lastNonce from chain when we have RPC_URL
    if (RPC_URL) {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
      const last = await oracle.lastNonce();
      nonce = BigInt(last) + 1n;
      console.log(`Fetched lastNonce=${last} from chain → using nonce=${nonce}`);
    } else {
      nonce = 1n;
      console.warn("RPC_URL not set — using nonce=1. Set RPC_URL or pass --nonce explicitly.");
    }
  }

  const value = {
    vault:     VAULT_ADDRESS,
    nav,
    timestamp,
    nonce,
  };

  const sig = await wallet.signTypedData(domain, types, value);

  console.log("\n── Signed NAV payload ───────────────────────────────────────");
  console.log(`Auditor : ${wallet.address}`);
  console.log(`NAV     : ${nav} (${Number(nav) / 1e6} USDC/share)`);
  console.log(`Time    : ${timestamp} (${new Date(Number(timestamp) * 1000).toISOString()})`);
  console.log(`Nonce   : ${nonce}`);
  console.log(`Sig     : ${sig}`);

  if (!submit) {
    console.log("\nRun with --submit to push on-chain.");
    return;
  }

  if (!RPC_URL) {
    console.error("\nRPC_URL required in .env to submit on-chain.");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = wallet.connect(provider);
  const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, signer);

  console.log("\nSubmitting to NAVOracle.submitSignedNAV()...");
  const tx = await oracle.submitSignedNAV(nav, timestamp, nonce, sig);
  console.log(`Tx sent : ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Mined   : block ${receipt.blockNumber} — NAV updated!`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
