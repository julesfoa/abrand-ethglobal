/**
 * Auditor signing server — off-chain companion to NAVOracle.sol
 *
 * Holds the auditor private key. Chainlink Functions hits GET /nav to get
 * a signed NAV payload. The manager hits POST /nav to update the current NAV.
 *
 * Setup:
 *   cp oracle/.env.example oracle/.env
 *   # fill in values
 *   node oracle/auditor-server.js
 *
 * After deploy, register `wallet.address` as an auditor on NAVOracle:
 *   oracle.addAuditor(auditorAddress)
 */

require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const { ethers } = require("ethers");

// ── Config ────────────────────────────────────────────────────────────────────
const {
  AUDITOR_PRIVATE_KEY,
  VAULT_ADDRESS,
  ORACLE_ADDRESS,  // NAVOracle contract address (for EIP-712 domain)
  MANAGER_SECRET,  // simple shared secret for POST /nav
  CHAIN_ID = "84532", // Base Sepolia default
  PORT = "3001",
} = process.env;

if (!AUDITOR_PRIVATE_KEY) throw new Error("AUDITOR_PRIVATE_KEY required");
if (!VAULT_ADDRESS)        throw new Error("VAULT_ADDRESS required");
if (!ORACLE_ADDRESS)       throw new Error("ORACLE_ADDRESS required");
if (!MANAGER_SECRET)       throw new Error("MANAGER_SECRET required");

const wallet = new ethers.Wallet(AUDITOR_PRIVATE_KEY);

// EIP-712 domain matches NAVOracle constructor: EIP712("NAVOracle", "1")
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

// ── State ─────────────────────────────────────────────────────────────────────
let currentNav = BigInt(1_000_000); // $1.00 — 1e6 USDC units
let nonceCounter = BigInt(0);

// ── Server ────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

/**
 * GET /nav
 * Called by the Chainlink Functions JS source (nav-source.js).
 * Returns a freshly-signed NAV payload.
 */
app.get("/nav", async (req, res) => {
  try {
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    nonceCounter++;

    const value = {
      vault:     VAULT_ADDRESS,
      nav:       currentNav,
      timestamp,
      nonce:     nonceCounter,
    };

    const sig = await wallet.signTypedData(domain, types, value);

    res.json({
      nav:       currentNav.toString(),
      timestamp: timestamp.toString(),
      nonce:     nonceCounter.toString(),
      sig,
    });
  } catch (err) {
    console.error("GET /nav error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /nav   { nav: "1050000", secret: "..." }
 * Manager endpoint to update the current NAV before Chainlink fetches it.
 * nav is in USDC units: 1e6 = $1.00, 1050000 = $1.05
 */
app.post("/nav", (req, res) => {
  if (req.body.secret !== MANAGER_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const nav = req.body.nav;
  if (!nav || isNaN(Number(nav)) || Number(nav) <= 0) {
    return res.status(400).json({ error: "nav must be a positive number" });
  }
  currentNav = BigInt(nav);
  console.log(`NAV updated to ${currentNav} (${Number(currentNav) / 1e6} USDC/share)`);
  res.json({ ok: true, nav: currentNav.toString() });
});

/**
 * GET /health
 */
app.get("/health", (req, res) => {
  res.json({
    auditor: wallet.address,
    vault:   VAULT_ADDRESS,
    oracle:  ORACLE_ADDRESS,
    chainId: parseInt(CHAIN_ID),
    nav:     currentNav.toString(),
    nonce:   nonceCounter.toString(),
  });
});

app.listen(parseInt(PORT), () => {
  console.log(`Auditor server on :${PORT}`);
  console.log(`Auditor address : ${wallet.address}`);
  console.log(`Vault           : ${VAULT_ADDRESS}`);
  console.log(`Oracle          : ${ORACLE_ADDRESS}`);
  console.log(`Chain ID        : ${CHAIN_ID}`);
  console.log(`Current NAV     : ${currentNav} (${Number(currentNav) / 1e6} USDC/share)`);
  console.log(`\nRegister auditor on-chain:\n  oracle.addAuditor("${wallet.address}")`);
});
