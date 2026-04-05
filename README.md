# ABRAND — The Hedge Fund Marketplace

**Date:** April 4, 2026
**Event:** ETHGlobal Cannes 2026
**Repo:** https://github.com/julesfoa/ABRAND

---<img width="669" height="245" alt="Screenshot 2026-04-05 at 08 47 31" src="https://github.com/user-attachments/assets/8d0f64a3-a3e7-405f-9474-622dfab7a720" />


## 1. HEDGE FUND FOR EVERYONE

ABRAND is a **hedge fund marketplace** built on ARC. Retail investors browse real hedge funds, read their strategy docs, and invest in seconds — no prime broker, no feeder fund, no lockup. The core primitive is an **ERC4626 vault** where deposits mint shares priced at a Chainlink-attested NAV, and redemptions settle to USDC (or USD wire via Bridge.xyz).

**One-liner pitch:** *"Hedge funds. For everyone."*

**Two-layer product:**
1. **Discovery** — A curated fund marketplace (Bloomberg meets Robinhood, but darker). Users browse funds, read strategy docs, see track records.
2. **Trading** — Deposit USDC, receive vault shares at NAV. Redeem anytime, get USDC or a bank wire.


Hedge funds have historically outperformed public markets. They're also gated behind prime brokers, feeder funds, and six-figure minimums.

ABRAND is a marketplace that lets retail investors browse real hedge funds and invest in seconds. 

Under the hood: an ERC4626 vault where share price is a Chainlink-attested NAV, signed by an independent auditor and verified on-chain via EIP-712. Redemptions settle to USDC or USD wire via Bridge.xyz.
No prime broker. No lockup. No bullshit.

**How It Works**
Deposit USDC  →  mint shares at NAV  →  redeem anytime  →  receive USDC or bank wire
<img width="660" height="245" alt="Screenshot 2026-04-05 at 08 47 38" src="https://github.com/user-attachments/assets/02530af4-9000-4f0e-b1a2-740b5e1fd237" />

NAVOracle.sol — Chainlink Functions fetches an EIP-712 signed NAV from the auditor API hourly, verifies it on-chain, pushes to the vault.
NAVConsumer.sol — Same flow via Chainlink CRE (onReport), with an ETH/USD Price Feed benchmark that fires a deviation warning if NAV drifts >50% from market.
FundVault.sol — ERC4626 with NAV-based pricing, redemption queue, 5-min fulfillment cooldown, 7-day auto-release, dispute resolution, and a configurable exit cap.
<img width="286" height="275" alt="Screenshot 2026-04-05 at 08 47 43" src="https://github.com/user-attachments/assets/17a3280d-bc80-45ef-b17b-78827586fc34" />

Security: monotonic nonce + timestamp + vault address + chain ID in every signature. 10% NAV change cap per update. 24-hour oracle migration timelock. Pause circuit breaker.

Deployments — Arc Testnet (live)
ContractAddressFundVault0xd2981651e6172AB1FfEC3E70BdeDe178E9FD5551NAVOracle0xD70d5079C190F4af6F6c9ce216a22f1f7B96A8B5MockFunctionsRouter0x6faB5d0A77D9F5E6AA0b4201FFedCd5276050279

Stack
Solidity + Foundry · Next.js 16 · wagmi · Chainlink Functions / Automation / Price Feeds / CRE · Bridge.xyz · Arc Testnet
60 tests. 60 passing.
---

##  ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ABRAND SYSTEM MAP                          │
└─────────────────────────────────────────────────────────────────────┘

  USERS (MetaMask / RainbowKit)
    │
    ▼
  NEXT.JS FRONTEND (App Router, Tailwind, wagmi v2, viem)
    ├── Homepage ──── Fund marketplace (3 funds listed)
    ├── /funds/[id] ─ Fund detail + deposit form
    ├── /redeem ───── Redemption request + cancel
    ├── /portfolio ── Investor positions, P&L, history
    ├── /convert ──── USDC→USD wire (Bridge.xyz)
    ├── /admin ────── NAV updates, whitelist, fulfillments
    ├── /auditor ──── NAV attestation, dispute management
    └── /manage ───── Capital deployment, wire transfers
    │
    ▼
  SMART CONTRACTS (Solidity, Foundry, Base Sepolia + Arc Testnet)
    ├── FundVault.sol ──── ERC4626 vault (NAV-priced shares)
    ├── VaultFactory.sol ─ Deploys verified vault instances
    ├── NAVOracle.sol ──── Chainlink Functions path
    ├── NAVConsumer.sol ── Chainlink CRE path + Price Feed benchmark
    └── MockFunctionsRouter.sol ── Testnet stub
    │
    ▼
  ORACLE LAYER (Off-chain)
    ├── auditor-server.js ── Express server, EIP-712 signing
    ├── nav-source.js ────── Chainlink Functions JS source
    └── sign-nav.js ──────── CLI for direct NAV submission
```

---


**Arc deployment addresses (live):**
- Vault: `0xd2981651e6172AB1FfEC3E70BdeDe178E9FD5551`
- Oracle: `0xD70d5079C190F4af6F6c9ce216a22f1f7B96A8B5`
- Router: `0x6faB5d0A77D9F5E6AA0b4201FFedCd5276050279`
- Admin: `0x95EF1e0323Dd4025f1b47504b4a6cB4eB5F16Be1`

---

## 7. STACK IMPLEMENTED

◼ Arc
ABRAND is deployed end-to-end on Arc Testnet. We use Arc's native USDC precompile (0x3600…) as the vault's base asset — no wrapped token, no bridging friction. The full user journey runs on 

Arc: wallet connection via RainbowKit, USDC approval, vault deposit, share minting, redemption request, fulfillment, and off-ramp via Bridge.xyz. Since Arc doesn't have a native Chainlink Functions deployment, we built MockFunctionsRouter.sol — a drop-in stub that lets the admin manually push signed NAV payloads, keeping the oracle flow functionally identical for the demo. The vault, oracle, and router are all live and verified on Arc Testnet.

◈ Chainlink

We integrate three Chainlink products across two contracts:
Functions + Automation (NAVOracle.sol) — Chainlink Automation triggers performUpkeep() hourly. This sends a JavaScript source (nav-source.js) to the Chainlink DON, which fetches a signed NAV payload from the auditor API, ABI-encodes the response, and returns it to fulfillRequest(). The contract then verifies the EIP-712 signature on-chain and calls vault.updateNAV(). The auditor's signing key never touches the chain — the DON is the trust bridge.

CRE + Price Feeds (NAVConsumer.sol) — Implements the Chainlink Runtime Environment entry point onReport(bytes calldata), called directly by the CRE DON forwarder. On every NAV update, the contract also reads the ETH/USD Price Feed and stores the benchmark price. If the fund's NAV deviates more than 50% from the market benchmark, it emits a BenchmarkDeviationWarning — a dead-man's switch against managers manipulating their own NAV reporting.

### What's NOT Done YET

- NAV walk-down protection (post-hackathon)
- USDC blacklisting recovery (post-hackathon)
- KYC implementation

---



---
