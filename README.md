# ABRAND — Exhaustive Project Memo

**Date:** April 4, 2026
**Event:** ETHGlobal Cannes 2026
**Repo:** https://github.com/julesfoa/ABRAND

---

## 1. WHAT IS ABRAND

ABRAND is an **onchain hedge fund marketplace** built on Base. Retail investors browse real hedge funds, read their strategy docs, and invest in seconds — no prime broker, no feeder fund, no lockup. The core primitive is an **ERC4626 vault** where deposits mint shares priced at a Chainlink-attested NAV, and redemptions settle to USDC (or USD wire via Bridge.xyz).

**One-liner pitch:** *"Hedge funds. For everyone."*

**Two-layer product:**
1. **Discovery** — A curated fund marketplace (Bloomberg meets Robinhood, but darker). Users browse funds, read strategy docs, see track records.
2. **Trading** — Deposit USDC, receive vault shares at NAV. Redeem anytime, get USDC or a bank wire.

---

## 2. ARCHITECTURE OVERVIEW

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

## 3. SMART CONTRACTS — DETAILED

### 3.1 FundVault.sol (Core — ERC4626)

The main contract. An OpenZeppelin ERC4626 vault with custom NAV-based pricing and a queue-based redemption model.

**Roles:**
| Role | Who | Can Do |
|------|-----|--------|
| `DEFAULT_ADMIN_ROLE` | Deployer | Oracle migration, force NAV, capital withdrawal, dispute resolution, exit cap config |
| `INVESTOR_ROLE` | Whitelisted addresses | Deposit USDC, request redemptions |
| `NAV_UPDATER_ROLE` | NAVOracle / NAVConsumer | Update NAV, fulfill redemptions |
| `PAUSER_ROLE` | Deployer | Emergency pause/unpause |

**Key flows:**
- **Deposit:** `approve(USDC) → deposit(assets, receiver)` — requires INVESTOR_ROLE on both caller and receiver, requires fresh NAV
- **Redeem:** `requestRedeem(shares)` → shares escrowed, NAV locked at request time → `fulfillRedemption(investor)` by manager after 5min cooldown → USDC paid out
- **Cancel:** `cancelRedemption()` — investor cancels, shares returned
- **Auto-release:** `claimRedemption()` — investor claims after 7 days if manager unresponsive
- **Dispute:** `disputeRedemption(investor)` → `resolveDispute(investor, approved)` (AML/fraud)
- **Capital deployment:** `withdrawCapital(amount, to)` — admin deploys USDC off-chain to trade

**Share math:**
- Shares: 18 decimals, USDC: 6 decimals, `_decimalsOffset() = 12` (inflation attack prevention)
- NAV: 1e6 = $1.00/share
- At NAV 1e6: deposit 100 USDC (100e6) → 100e18 shares
- Payout: `usdcOut = (shares * navAtRequest) / 1e18`
- ERC4626 `totalAssets()` overridden: excludes pending redemption amounts

**Safety guards:**
- `navFresh()` modifier — blocks deposits/redeems if NAV older than `maxNavStaleness`
- NAV change cap: max 10% per `updateNAV()` call
- `adminForceUpdateNAV()` — emergency bypass (no cap, no staleness check)
- Oracle timelock: 24h delay before new oracle gains NAV_UPDATER_ROLE
- Exit cap: max 10% of total supply can be redeemed per cycle (configurable: 10/25/50/100%)

### 3.2 NAVOracle.sol (Chainlink Functions Path)

Fetches auditor-signed NAV from an off-chain API via Chainlink Functions, verifies EIP-712 signature, and pushes to FundVault.

**Two update paths:**
1. **Automated:** Chainlink Automation (hourly) → `performUpkeep()` → sends JS source to DON → DON calls auditor API → `fulfillRequest()` callback → verify sig → `vault.updateNAV()`
2. **Direct:** Anyone calls `submitSignedNAV(nav, timestamp, nonce, sig)` → same verification → `vault.updateNAV()`

**EIP-712 domain:** `{ name: "NAVOracle", version: "1", chainId, verifyingContract: oracleAddress }`
**Struct:** `NAVUpdate(address vault, uint256 nav, uint256 timestamp, uint256 nonce)`

**Replay protection:**
- Nonce must be strictly monotonic (`nonce > lastNonce`)
- Timestamp must be newer than previous update
- Max payload age: 2 hours
- Vault address bound in signature (cross-vault replay impossible)
- Chain ID in domain separator (cross-chain replay impossible)

### 3.3 NAVConsumer.sol (Chainlink CRE Path)

Newer architecture using Chainlink Runtime Environment (CRE) instead of legacy Functions.

**Entry point:** `onReport(bytes calldata)` — called by CRE DON forwarder
**Same EIP-712 verification** as NAVOracle (domain name = "NAVConsumer")
**Added feature:** Chainlink Price Feed benchmark — reads ETH/USD on every NAV update, stores `lastBenchmarkPrice`, emits `BenchmarkDeviationWarning` if NAV deviates >50% from market benchmark.

**CRE forwarder:** Set to `address(0)` for demo mode (anyone can call), or a specific address once Chainlink provisions it.

### 3.4 VaultFactory.sol

Deploys FundVault instances. Provides `isVault(address)` mapping for phishing prevention. Owner-only deployment. Auto-transfers all roles from factory to deployer.

### 3.5 MockFunctionsRouter.sol

Stub for chains without Chainlink Functions (Arc testnet). Admin manually calls `fulfillRequest()` with a signed NAV payload. Functionally identical for demos.

### 3.6 Tests

- **FundVault.t.sol** — 40+ tests: deposits, NAV overrides, redemption queue, disputes, exit rules, access control, inflation attack, pause
- **NAVOracle.t.sol** — 20+ tests: auditor management, automation timing, EIP-712 verification, replay protection, error handling
- **All passing** (60/60 at last check)

---

## 4. ORACLE / OFF-CHAIN INFRASTRUCTURE

### 4.1 Auditor Signing Server (`oracle/auditor-server.js`)

Express.js backend holding the auditor's private key.

| Endpoint | Purpose |
|----------|---------|
| `GET /nav` | Returns EIP-712 signed NAV payload `{ nav, timestamp, nonce, sig }` |
| `POST /nav` | Manager updates current NAV (requires MANAGER_SECRET) |
| `GET /health` | Status: auditor address, vault, oracle, chainId, current NAV, nonce |

Config: `AUDITOR_PRIVATE_KEY`, `VAULT_ADDRESS`, `ORACLE_ADDRESS`, `MANAGER_SECRET`, `CHAIN_ID`, `PORT` (default 3001)

### 4.2 Chainlink Functions Source (`oracle/nav-source.js`)

JavaScript executed inside the Chainlink DON sandbox. Fetches signed NAV from auditor API, manually ABI-encodes the response for Solidity decoding.

### 4.3 Direct Submission CLI (`oracle/sign-nav.js`)

```bash
node oracle/sign-nav.js --nav 1050000              # sign only
node oracle/sign-nav.js --nav 1050000 --submit      # sign + submit tx
node oracle/sign-nav.js --nav 1050000 --nonce 5     # override nonce
```

Bypasses Chainlink entirely. Useful for demos and emergency updates.

### 4.4 Frontend Mock Auditor API (`/api/nav-attestation`)

Next.js API route that signs NAV payloads using `AUDITOR_PRIVATE_KEY` from env. Used by the admin page "Fetch & Push Signed NAV" button. Chain-aware (Arc vs Base Sepolia).

---

## 5. FRONTEND — DETAILED

**Stack:** Next.js 16.2.2 (App Router), React 19, Tailwind 4, wagmi 3.6.0, viem 2.47.6, RainbowKit 2.2.10, TypeScript

### 5.1 Pages

| Page | URL | Description |
|------|-----|-------------|
| **Homepage** | `/` | Hero ("Hedge funds. For everyone."), live AUM stat, fund marketplace table (3 funds with strategy, AUM, YTD, Sharpe, Max DD, sparklines), "How it works", comparison table (traditional vs ABRAND), "Built on" logos |
| **Fund Detail** | `/funds/[id]` | Fund header + strategy docs (multi-paragraph), deposit form (amount → approve → deposit), performance dashboard (annual bar chart, monthly grid, NAV line chart), oracle dashboard (heartbeat, signed updates) |
| **Redeem** | `/redeem` | Pending redemption card (NAV lock, cooldown countdown, cancel), new request form (share input, exit rules banner, USDC preview) |
| **Portfolio** | `/portfolio` | 4-stat summary (value, P&L, shares, ownership %), open position card, pending redemption card, deposit history table with block explorer links |
| **Convert** | `/convert` | USDC→USD wire form (amount, beneficiary, bank details), wallet signature verification, Bridge.xyz API call, wire reference confirmation |
| **Admin** | `/admin` | Password-gated. NAV staleness banner, oracle NAV push, manual NAV update (max 10%/call), fulfill redemptions, exit cap controls (10/25/50/100%), investor whitelist (grant/revoke INVESTOR_ROLE) |
| **Auditor** | `/auditor` | Password-gated. NAV attestation form (EIP-712 sign + submit to NAVConsumer), dispute management (lookup by address, dispute/approve/reject) |
| **Manage** | `/manage` | Password-gated. Vault stats, capital deployment (send to address or wire via Bridge.xyz), fulfill redemptions, update NAV |

### 5.2 Key Hooks

| Hook | Purpose |
|------|---------|
| `useProtocol()` | 9-call multicall every 15s: totalAssets, navPerShare, shareBalance, usdcBalance, isInvestor, isManager, isAdmin, isPaused, redemptionRequests, totalSupply, maxExitBps |
| `useDepositFlow()` | State machine: IDLE → APPROVING → APPROVE_CONFIRMED → DEPOSITING → DONE |
| `useRedeemFlow()` | State machine: IDLE → REQUESTING → PENDING / CANCELLED |
| `usePortfolio()` | Extends useProtocol with costBasis, P&L, ownership%, deposit event history |

### 5.3 Contract Bindings (`src/lib/contracts.ts`)

Per-chain address maps for FundVault, USDC, NAVOracle, NAVConsumer. Full ABIs for all contracts. Formatting helpers: `formatUSDC()`, `parseUSDC()`, `formatShares()`, `parseShares()`, `formatNAV()`, `truncateAddress()`.

### 5.4 Design System

- **Background:** `#0A0A0A` (near-black)
- **Accent:** `#DC2626` (red)
- **Text:** `#F0F0F0` (white) / `#6B7280` (muted grey)
- **Surface:** `#111111`
- **Font:** Geist Sans / Geist Mono
- **Effects:** Film grain overlay, scanlines, glassmorphism cards, button glow, staggered fade-up animations
- **RainbowKit:** Accent overridden to red

### 5.5 Fund Data (Static)

Three funds listed in the marketplace:

| Fund | Strategy | AUM | YTD | Sharpe | Active |
|------|----------|-----|-----|--------|--------|
| **ABRAND Fund I** | Long/Short Equity | $1.2M | +3.2% | 1.84 | Yes (live vault) |
| **Apex Capital** | Quant Macro | $890M | +6.0% | 2.41 | Coming soon |
| **Fortress Fund III** | Credit Arbitrage | $340M | +2.1% | 3.12 | Coming soon |

Each fund has 5 years of monthly returns, inception returns, volatility, max drawdown, and multi-paragraph strategy descriptions.

---

## 6. MULTI-CHAIN SUPPORT

| Chain | ID | USDC | Chainlink | Status |
|-------|----|------|-----------|--------|
| **Base Sepolia** | 84532 | MockUSDC (deploy) | Real Functions router + ETH/USD feed | Not deployed yet |
| **Arc Testnet** | 5042002 | Native precompile `0x3600...` | MockFunctionsRouter | **Deployed** |

**Arc deployment addresses (live):**
- Vault: `0xd2981651e6172AB1FfEC3E70BdeDe178E9FD5551`
- Oracle: `0xD70d5079C190F4af6F6c9ce216a22f1f7B96A8B5`
- Router: `0x6faB5d0A77D9F5E6AA0b4201FFedCd5276050279`
- Admin: `0x95EF1e0323Dd4025f1b47504b4a6cB4eB5F16Be1`

---

## 7. BOUNTY TARGETS

| Bounty | Prize | Status | What's Needed |
|--------|-------|--------|---------------|
| **Arc** | $15K | Ready once demo works | E2E: deposit → redeem → Bridge.xyz |
| **Uniswap Foundation** | $10K | Not built | Deploy v3 vault-shares/USDC pool, add Sell button |
| **Circle** | TBD | Not built | CCTP V2 multichain deposit (Arbitrum → Base) |
| **Chainlink** | $5K+ | Partially built | NAVConsumer + CRE workflow (contract ready, workflow pending) |
| **Chainlink (CRE)** | $4K | Contract ready | NAVConsumer.onReport() + Price Feed benchmark |
| **Bridge.xyz** | TBD | Stubbed | Get testnet API key at event booth |
| **Base** | TBD | Almost | Just needs deployed contract on Base Sepolia |
| **ETHGlobal Main** | TBD | Needs working demo | Clean E2E on testnet |

---

## 8. DEPLOYMENT STATUS

### What's Done
- All 5 smart contracts written and tested (60+ tests passing)
- Full frontend with 8 pages, 4 custom hooks, per-chain config
- NAVOracle + NAVConsumer with EIP-712 signed attestations
- Auditor server + signing CLI
- Arc testnet deployment live
- Dispute mechanism + auto-release (7-day escrow)
- Oracle timelock (24h migration safety)
- Exit rules (configurable max exit % + cooldown)
- Bridge.xyz wire form (stubbed, needs API key)
- Mock auditor attestation API in frontend

### What's NOT Done
- **Base Sepolia deployment** (blocker for Base + ETHGlobal bounties)
- **Uniswap v3 pool** (vault shares / USDC — needed for Uniswap bounty)
- **CCTP V2 multichain** (needed for Circle bounty)
- **Bridge.xyz API key** (need to get at booth)
- **WalletConnect project ID** (currently `dev-placeholder` — blocks WC wallets)
- **CRE workflow provisioning** (Chainlink team builds this)
- VaultFactory access control (one-line fix, `onlyOwner`)
- NAV walk-down protection (post-hackathon)
- USDC blacklisting recovery (post-hackathon)

---

## 9. DEMO FLOW (FOR JUDGES)

1. **Land on homepage** → See hedge funds listed like a Bloomberg terminal
2. **Click ABRAND Fund I** → Read strategy docs, see performance charts
3. **Connect wallet** → MetaMask / RainbowKit
4. **Deposit USDC** → Approve → Deposit → See shares in portfolio
5. **Show NAV updating** via Chainlink oracle (admin page or auto)
6. **Request redemption** → See queued state, cooldown timer
7. **Manager fulfills** → USDC returned
8. **Bridge.xyz convert** → USDC → USD wire to bank account

**Key gotchas for demo:**
- Call `updateNAV` before demo (maxNavStaleness = 10 min or deposits revert "NAV stale")
- Seed vault with USDC before fulfilling redemptions (or reverts)
- Deploy script mints 1M mock USDC to deployer — transfer some to test wallets
- Admin page tracks investors in React state only (re-enter addresses on refresh)

---

## 10. PRIORITY ORDER (REMAINING WORK)

1. **Deploy to Base Sepolia** — unblocks Base, ETHGlobal, and Chainlink bounties
2. **E2E test** — connect → grant INVESTOR_ROLE → deposit → requestRedeem → fulfillRedemption → Bridge.xyz
3. **Uniswap v3 pool** (~4h) — deploy shares/USDC pool, add Sell button to frontend
4. **Chainlink or Circle bounty** (pick based on bandwidth)
5. **Bridge.xyz API key** from booth
6. **Replace WalletConnect dev-placeholder** with real project ID

---

## 11. SECURITY MODEL

### Trust boundaries
- **Auditor private key** — held off-chain in auditor-server.js environment
- **Chainlink DON** — trusted to execute nav-source.js honestly
- **CRE forwarder** — trusted to call NAVConsumer.onReport()
- **Fund manager** — trusted to update NAV honestly via auditor API

### Attack prevention
- EIP-712 signature binding (vault + chain + nonce + timestamp)
- Monotonic nonce replay protection
- 2-hour max payload age
- 10% NAV change cap per update
- Oracle migration timelock (24h)
- Exit cap (max % of supply redeemable per cycle)
- Pause/unpause circuit breaker

### Known limitations (post-hackathon hardening)
- NAV walk-down attack: 10% cap prevents instant drain but not repeated small decreases
- USDC blacklisting: no recovery path if Circle blacklists an investor mid-redemption
- Admin page state: investor list stored in React state, lost on refresh
- No KYC beyond INVESTOR_ROLE whitelist
- No minimum deposit / no lockup (by design for hackathon)

---

## 12. GIT HISTORY & BRANCH STRUCTURE

**Main branch:** `emdash/fundvault-integration`

**Evolution (chronological):**
1. Hackathon init + CLAUDE.md
2. AccessRegistry + ABRANDPool (v1 contracts — superseded)
3. Frontend scaffold (Next.js + wagmi + RainbowKit)
4. Switch to FundVault (ERC4626) — NAV, redemption queue, roles
5. NAVOracle + auditor-signed NAV via Chainlink Functions
6. Arc testnet support + MockFunctionsRouter
7. Exit rules, oracle direct-submit, auditor CLI
8. VaultFactory fix + factory tests
9. NAVConsumer + CRE bounty (Chainlink Price Feed benchmark)
10. Dispute mechanism + auto-release escrow
11. Multi-chain frontend (Arc + Base Sepolia)
12. Landing page improvements, password gates
13. Auditor page + NAV attestation UI
14. Oracle NAV push wired into admin page

**Worktrees:**
| Path | Content |
|------|---------|
| `frontend-8fd` | Next.js frontend (active) |
| `vault-4jm` | Smart contracts + oracle (active) |
| `oracle-2zv` | Minimal oracle worktree |
| `early-aliens-laugh-69s` | Old ABRANDPool contracts (IGNORE) |

---

## 13. TECH STACK SUMMARY

| Layer | Technology |
|-------|-----------|
| **Contracts** | Solidity, Foundry, OpenZeppelin (ERC4626, AccessControl, Pausable, ECDSA, EIP712), Chainlink (Functions, Automation, Price Feeds, CRE) |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, wagmi 3.6.0, viem 2.47.6, RainbowKit 2.2.10, TanStack Query 5 |
| **Oracle** | Express.js, ethers.js, EIP-712, Chainlink Functions JS sandbox |
| **Chains** | Base Sepolia (84532), Arc Testnet (5042002), Anvil (local) |
| **Off-ramp** | Bridge.xyz (USDC → USD wire) |
| **Design** | Black/red/white, Geist font, film grain, glassmorphism, institutional feel |

---

## 14. VISUAL IDENTITY

- **Black background** (`#0A0A0A`) — dark, institutional
- **Red accent** (`#DC2626`) — bold, distinctive
- **White text** (`#F0F0F0`) on dark surfaces
- **Film grain + scanlines** — textural depth
- **Glassmorphism cards** — backdrop blur, gradient borders
- **Button glow** — red box-shadow on hover
- **Staggered animations** — fade-up with 0.08s delays
- **Feel:** Bloomberg meets Robinhood, but darker and more minimal

---

*This memo reflects the complete state of ABRAND as of April 4, 2026. The project is feature-complete for the Arc testnet. The primary remaining blocker is Base Sepolia deployment and E2E testing for the judge demo.*
