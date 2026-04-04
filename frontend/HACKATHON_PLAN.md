# ABRAND — Hackathon Master Plan
## ETHGlobal Cannes 2026 | April 3–5

---

## Prize Targets

| Sponsor | Prize | Fit | Priority |
|---|---|---|---|
| **Arc** | $15,000 | Onchain capital markets / lending / payments | **P0** |
| **Uniswap Foundation** | $10,000 | Secondary liquidity for abUSDC shares | **P1** |
| **Circle** | TBD | USDC-native protocol, CCTP multichain deposits | **P1** |
| **Chainlink** | $5,000+ | Functions for off-ramp automation or Data Streams for NAV | **P2** |
| **ETHGlobal Main Prize** | TBD | Best overall project | **P0** |
| **Base** | TBD | Deployed on Base Sepolia / Base mainnet | **P1** |
| **Bridge.xyz** | TBD | Already integrated for USDC→USD off-ramp | **P1** |

**Total addressable prize pool: ~$50K+**

---

## The Pitch (30 seconds)

> ABRAND is an onchain prime brokerage access layer. Retail investors deposit USDC into a shared pool and receive abUSDC shares 1:1. Whitelisted hedge funds acquire those shares and redeem them for USDC, getting instant programmatic access to pooled retail capital — then off-ramp to USD via Bridge.xyz. No prime broker. No feeder fund. No 6-month lockup. Just a smart contract.

The judges will hear "DeFi yield" a hundred times. ABRAND is different: it's not yield, it's access. Real institutional capital needs onchain rails. This is the rails.

---

## Current State Assessment

### What's done

| Component | Status | Quality | Notes |
|---|---|---|---|
| `ABRANDPool.sol` + `AccessRegistry.sol` | ✅ Done | Solid | 5 tests passing, simple 1:1 design |
| `FundVault.sol` (ERC4626) + `VaultFactory.sol` | ✅ Done | Production-grade | NAV, redemption queue, pause, roles |
| Frontend scaffold (5 pages + `/api/bridge`) | ✅ Done | Build passing | Wired for ABRANDPool, not FundVault |
| Contract deployment | ❌ Not deployed | — | No addresses in `.env.local` yet |
| End-to-end demo flow | ❌ Broken | — | No deployed contracts → nothing works |
| Uniswap integration | ❌ Not built | — | Required for P1 bounty |
| Chainlink integration | ❌ Not built | — | Required for P2 bounty |
| Bridge.xyz API | ⚠️ Stubbed | — | Route built, no real API key |
| Demo video | ❌ Not made | — | Required for all bounty submissions |

### Critical gap

The frontend is wired to `ABRANDPool` but `FundVault` is the better contract to demo — it's ERC4626, has NAV, has a redemption queue. Judges and Uniswap/Chainlink integrators care about standards.

**Decision needed: which contract do we demo?**

Recommendation: **FundVault**. Reasons:
- ERC4626 is the standard. Uniswap v4, Chainlink, any future integration just works.
- NAV-based shares are more realistic — hedge funds return >1x, shares should appreciate.
- Redemption queue prevents bank-run race conditions. This is a real product decision.
- Tells a better Arc story: "institutional-grade vault, not a toy."

ABRANDPool stays as the simplified "pure pool" fallback if FundVault integration takes too long.

---

## Architecture Decision: FundVault vs ABRANDPool

### FundVault (recommended)

```
Depositor → deposit(USDC) → mint ERC4626 shares at NAV
Hedge fund → requestRedeem(shares) → shares escrowed, NAV locked
Manager → updateNAV() → share price appreciates
Manager → fulfillRedemption(investor) → USDC sent, shares burned
Uniswap → abUSDC/USDC pool → depositors can exit without waiting
Chainlink → Functions/Data Streams → NAV oracle or off-ramp automation
```

**What the frontend needs to change:**
- `useDepositFlow`: still 2-step (approve + deposit via ERC4626 `deposit()`)
- `useRedeemFlow`: becomes 2-step (approve + `requestRedeem()`) + pending state
- Add `fulfillRedemption` to admin panel
- NAV display in navbar/portfolio
- "Your shares are worth $X" calculation using `convertToAssets()`

### ABRANDPool (fallback)

Already wired. Simpler. Less impressive for judges.

---

## Bounty Integration Plans

### Arc ($15K) — P0

Arc focuses on onchain capital markets, lending, FX, payments.

ABRAND **is** an Arc-native project. The pitch writes itself:
- Onchain capital formation for hedge funds
- Permissioned redemption = real access control
- USDC as unit of account = stablecoin-native
- Bridge.xyz off-ramp = full fiat rails

**What Arc needs to see:**
1. Working demo: deposit USDC → receive shares → hedge fund redeems → sees USDC in wallet
2. Bridge.xyz convert flow (even with mock API key — show the UI, explain the integration)
3. Access control: show the admin adding a hedge fund address
4. Clear institutional narrative in the README and demo video

**No additional code needed for Arc specifically.** Just ship the working E2E demo.

---

### Uniswap Foundation ($10K) — P1

**The integration:** Create a Uniswap v3 abUSDC/USDC pool. Add a "Sell shares" button to the portfolio page that routes through it.

**Why this matters for the product:**
Depositors currently can't exit without a hedge fund redeeming. A Uniswap pool gives them a secondary market. Hedge funds can also buy abUSDC OTC via the pool instead of sourcing from depositors.

**What to build:**

1. Deploy a Uniswap v3 pool: `abUSDC/USDC` at 0.05% fee tier (stablecoin pair)
2. Add liquidity in the deploy script (use some of the minted mock USDC + minted abUSDC)
3. Frontend: add "Sell abUSDC" button on deposit page → opens Uniswap widget or direct swap via `SwapRouter02`
4. Alternatively: Uniswap v4 hook that auto-deploys idle pool USDC as LP position

**Minimum viable integration (hackathon scope):**
- Deploy v3 pool on Base Sepolia
- Show the pool address in the UI
- Link to the Uniswap interface with the token addresses pre-filled
- That's enough for the bounty — judges want to see meaningful integration, not a full AMM

**Code needed:**
```solidity
// In deploy script:
IUniswapV3Factory(UNISWAP_V3_FACTORY).createPool(abusdc, usdc, 500); // 0.05%
// Initialize pool at 1:1 sqrtPriceX96
// Add initial liquidity via NonfungiblePositionManager
```

---

### Chainlink ($5K+) — P2

**Best integration: Chainlink Functions for off-ramp**

Right now, the Bridge.xyz call happens in a Next.js API route. The problem: requires a running server. Replace it with a Chainlink Function that calls Bridge.xyz from a decentralized compute network — the contract verifies the result, no trusted server needed.

```
User calls requestOffRamp(amount, bankDetails) on-chain
    → Chainlink Functions picks up the request
    → Calls Bridge.xyz API off-chain
    → Returns reference ID on-chain
    → Contract emits OffRampInitiated(user, reference, amount)
```

This is a much cleaner story: "the entire flow is onchain, including the fiat settlement request."

**Alternative: Chainlink Data Streams for NAV**

If using FundVault, NAV needs to be updated by someone. Add a Chainlink Data Stream feed for a stablecoin index or treasury rate → the contract reads it automatically rather than relying on a manual `updateNAV()` call.

**Minimum viable integration:**
- Chainlink Functions: write the DON-compatible JS function that POSTs to Bridge.xyz
- Deploy the consumer contract
- Show it working in the demo

---

### Circle / CCTP — P1

ABRAND already uses USDC. To hit the Circle bounty:
- Add CCTP V2 multichain deposit: user on Arbitrum can deposit USDC → it arrives in the Base pool
- One-line change in the deposit page: detect chain → if not Base, use CCTP bridge before depositing

**Scope for hackathon:** Even just showing the CCTP flow in a diagram and having a working Base + one other chain is likely enough.

---

### Bridge.xyz — P1

Already integrated in `/api/bridge`. To maximize this bounty:
- Get a real Bridge.xyz testnet API key (ask at the hackathon — they're usually there)
- Show a complete wire simulation with a real reference ID in the demo video
- That's it.

---

## Execution Plan

### Phase 0: Foundation (first 4 hours)

These are blockers. Nothing else works until these are done.

- [ ] **Deploy FundVault to Base Sepolia** via forge script
  - Get `PRIVATE_KEY` and `BASE_SEPOLIA_RPC_URL` from team
  - `forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast`
  - Copy addresses to `frontend/.env.local`

- [ ] **Re-wire frontend for FundVault** (or decide to keep ABRANDPool and skip this)
  - Update `useProtocol.ts`: replace `poolAbi` calls with ERC4626 ABI
  - Update `useDepositFlow.ts`: same 2-step but call ERC4626 `deposit()`
  - Add `useRedeemFlow.ts`: `requestRedeem()` → pending state → wait for `fulfillRedemption`
  - Update admin page: add NAV update + fulfill redemption

- [ ] **Test E2E on Base Sepolia**
  - Connect MetaMask → Base Sepolia
  - Deposit 10 USDC → see shares
  - Admin: whitelist hedge fund address
  - Hedge fund: request redemption → admin fulfills
  - Convert to USD: fill form → see success (mock Bridge.xyz OK for this step)

### Phase 1: Arc win (hours 4–8)

- [ ] Get Bridge.xyz testnet API key (talk to Bridge.xyz at the event)
- [ ] Test full Bridge.xyz flow end-to-end
- [ ] Polish the UI: no broken states, no "undefined" addresses
- [ ] Write Arc-targeted README section: the institutional pitch
- [ ] Record demo walkthrough (screen + narration, 3–5 min)

### Phase 2: Uniswap bounty (hours 8–16)

- [ ] Deploy Uniswap v3 pool on Base Sepolia (abUSDC/USDC, 0.05% fee)
- [ ] Add "Sell abUSDC" to deposit page → links to Uniswap with pre-filled tokens
- [ ] Update README with Uniswap section
- [ ] Add pool address to UI (show liquidity, current price)

### Phase 3: Chainlink or Circle (hours 16–28)

**Pick one, not both, based on team bandwidth.**

Option A (Chainlink Functions):
- [ ] Write Bridge.xyz DON function (JS, ~50 lines)
- [ ] Deploy consumer contract
- [ ] Wire up on-chain request trigger
- [ ] Show it in demo: no server needed for off-ramp

Option B (Circle CCTP):
- [ ] Add CCTP multichain deposit UI
- [ ] Show Arbitrum → Base deposit flow

### Phase 4: Polish + submit (final 8 hours)

- [ ] Fix every broken state in the UI (empty states, errors, loading)
- [ ] Final demo video (record on Base Sepolia testnet, real transactions)
- [ ] Write README: problem, solution, architecture diagram, bounty integrations
- [ ] Submit to each bounty track on the ETHGlobal dashboard

---

## What Could Go Wrong (and mitigations)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Deploy script fails | Medium | Test locally with `anvil` first |
| FundVault re-wire takes too long | Medium | Fallback to ABRANDPool — still winnable |
| Bridge.xyz API not available | High | Mock the response, show UI flow, explain integration |
| Uniswap pool at wrong price | Low | Initialize at sqrtPriceX96 = 2^96 (exactly 1:1) |
| RPC rate limits during demo | Low | Use Alchemy/QuickNode with a real API key, not public RPC |
| MetaMask wrong network during demo | High | Pre-configure Base Sepolia in MetaMask, rehearse |

---

## Improvements That Would Strengthen the Pitch

Roughly ordered by impact/effort ratio:

1. **Portfolio page** — show the user's position: "You hold 500 abUSDC worth $500." Simple but impressive.
2. **NAV display** — "Current NAV: $1.02/share" in the navbar. Makes the fund feel alive.
3. **Transaction history** — pull `Deposited`/`Redeemed` events for the connected wallet. A few lines with `useContractEvents`.
4. **Favicon + page titles** — change the default Next.js favicon. 10 minutes of work, looks more real.
5. **Responsive mobile** — the design is desktop-first but if a judge opens it on a phone during the demo it should not break.
6. **ENS name resolution** — show `vitalik.eth` instead of `0x1234...5678` in the admin panel. Quick win for the ENS bounty ($10K).
7. **Basescan links** — link every transaction hash to `sepolia.basescan.org/tx/...`. Makes the demo verifiable live.

---

## Demo Script (for the 5-minute window)

1. **Open landing page** (5s) — "ABRAND. Institutional liquidity, onchain. Here's $X USDC in the pool right now."
2. **Connect wallet as retail depositor** (20s) — deposit 100 USDC → show 100 abUSDC received.
3. **Switch to hedge fund wallet** (30s) — "This wallet is whitelisted by the admin." Request redemption of 100 abUSDC → show USDC received.
4. **Convert to USD** (30s) — fill bank form → show wire reference (real Bridge.xyz or mock). "This is now in transit to a USD bank account."
5. **Admin panel** (20s) — add a new hedge fund address live. "Permissioned. Compliance at the contract level."
6. **Uniswap pool** (20s) — "Depositors don't have to wait for a hedge fund to redeem. They can sell abUSDC instantly on Uniswap." Show the pool.
7. **Architecture slide** (30s) — one diagram: Depositor → Pool → Hedge Fund → Bridge.xyz → Bank.
8. **Arc pitch** (30s) — "This is what onchain capital markets look like when you remove the intermediaries. No prime broker, no feeder fund, no 6-month lockup."

Total: ~3:30. Leave 90 seconds for questions.

---

## What Winning Looks Like for Each Bounty

**Arc:** They want to fund the idea, not just see a clever hack. Show that you understand the institutional market structure problem. The contract is the solution, not the demo. Lead with the problem.

**Uniswap:** They want their tech used meaningfully. "We deployed a pool" is not enough. Explain WHY the pool solves a problem for abUSDC holders (exit liquidity without waiting for a hedge fund cycle).

**Chainlink:** They want Functions/Data Streams used for something that would be worse without decentralization. "We use Chainlink Functions so no single server controls the fiat off-ramp" is a strong sentence.

**ETHGlobal main prize:** The judges care about: does it work, is the idea original, is the presentation compelling. ABRAND scores well on all three if the demo is clean.
