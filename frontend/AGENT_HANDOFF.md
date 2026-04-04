# ABRAND — Agent Handoff
## ETHGlobal Cannes 2026 | State as of branch `emdash/fundvault-integration`

---

## What is ABRAND

Onchain liquidity protocol on Base. Retail investors deposit USDC into a shared vault and receive ERC4626 shares. The fund manager invests capital offchain, updates NAV onchain as returns come in. Investors request redemptions, the manager fulfills them — shares burned, USDC returned. Post-redemption, Bridge.xyz wires USD to a bank account.

The product targets two audiences that never communicate cleanly today: retail capital (idle USDC) and institutional fund managers who need programmatic liquidity access.

---

## Repo layout

```
GitHub: https://github.com/julesfoa/ABRAND
PR #1 (merged): planning artifacts — PLAN.md, DESIGN.md, CLAUDE.md
Active branch: emdash/fundvault-integration
```

**Worktrees on disk:**

| Path | Content |
|---|---|
| `/Users/julesfoa/Desktop/worktrees/frontend-8fd` | Next.js frontend (active, this branch) |
| `/Users/julesfoa/Desktop/worktrees/early-aliens-laugh-69s` | Original simple contracts: `ABRANDPool.sol` + `AccessRegistry.sol` |
| `/Users/julesfoa/Desktop/worktrees/vault-4jm` | Advanced contracts: `FundVault.sol` + `VaultFactory.sol` (USE THESE) |

---

## Smart contracts — use vault-4jm

**Path:** `/Users/julesfoa/Desktop/worktrees/vault-4jm/src/`

### `FundVault.sol` — the core contract

ERC4626 vault. USDC in, shares out. Key behaviors:

- `deposit(uint256 assets, address receiver)` — investor deposits USDC, gets shares. Requires `INVESTOR_ROLE`.
- `requestRedeem(uint256 shares)` — investor queues redemption. Shares escrowed. NAV locked at request time.
- `cancelRedemption()` — investor cancels pending request. Shares returned.
- `fulfillRedemption(address investor)` — manager pays out. Requires `NAV_UPDATER_ROLE`. Must ensure vault has enough USDC first.
- `updateNAV(uint256 newNav)` — manager updates NAV. Max 10% change per call. Requires `NAV_UPDATER_ROLE`.
- `totalAssets()` — total USDC in vault (minus pending redemption USDC).
- `navPerShare` — public uint256 in USDC units (1e6 = $1.00). Starts at 1e6.
- `redemptionRequests(address)` — returns `(shares, navAtRequest, requestedAt)` for a pending request.
- `pause()` / `unpause()` — emergency stop.

**Roles (OpenZeppelin AccessControl):**
- `DEFAULT_ADMIN_ROLE` — can grant/revoke all roles
- `INVESTOR_ROLE = keccak256("INVESTOR_ROLE")` — required to deposit
- `NAV_UPDATER_ROLE = keccak256("NAV_UPDATER_ROLE")` — can update NAV + fulfill redemptions
- `PAUSER_ROLE = keccak256("PAUSER_ROLE")` — can pause

**Share math:**
- Shares are 18 decimals. `_decimalsOffset() = 12` prevents inflation attack.
- At NAV 1e6 ($1.00): deposit 100 USDC (100e6) → receive 100e18 shares.
- Payout: `usdcOut = (shares * navAtRequest) / 1e18`
- Example: 100e18 shares at NAV 1.05e6 → 105e6 USDC out.

### `VaultFactory.sol`

Deploys `FundVault` instances. Owner-only. Transfers all roles to deployer, factory self-revokes.

### Deploy script

`/Users/julesfoa/Desktop/worktrees/vault-4jm/script/Deploy.s.sol`

```bash
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Deploys: MockUSDC (for testnet) + VaultFactory + one FundVault (initial NAV = 1e6, maxStaleness = 10 min for demo).

**Required env vars:**
```
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org   # or Alchemy/QuickNode endpoint
```

After deploy: copy the printed `Vault (F1V1)` address into `NEXT_PUBLIC_VAULT_ADDRESS` in the frontend `.env.local`.

**NOT deployed yet.** This is the immediate blocker for the demo.

---

## Frontend — `emdash/fundvault-integration`

**Path:** `/Users/julesfoa/Desktop/worktrees/frontend-8fd`

**Stack:** Next.js 16 App Router, Tailwind, wagmi v2, viem, RainbowKit, TypeScript

**Build status:** ✅ `tsc --noEmit` clean, `npm run build` passes all 9 routes.

**Run dev:**
```bash
cd /Users/julesfoa/Desktop/worktrees/frontend-8fd
npm run dev
```

### File map

```
src/
  lib/
    wagmi.ts           — wagmi config, Base Sepolia only, SSR-safe
    contracts.ts       — FundVault ABI, role hashes, address constants, formatters
  hooks/
    useProtocol.ts     — 9-call multicall: totalAssets, navPerShare, shareBalance,
                         usdcBalance, isInvestor, isManager, isAdmin, isPaused,
                         redemptionRequests(address)
    useDepositFlow.ts  — 2-step state machine: approve USDC → ERC4626 deposit()
    useRedeemFlow.ts   — requestRedeem() → PENDING state + cancelRedemption()
  components/
    Providers.tsx      — wagmi + RainbowKit + React Query
    DynamicProviders.tsx — ssr:false wrapper (prevents localStorage crash)
    Navbar.tsx         — AUM + live NAV display, role-based nav tabs
    AmountInput.tsx    — input with MAX button + symbol label
    TxButton.tsx       — spinner + aria-busy during TX
    StepIndicator.tsx  — step 1 / step 2 tracker
  app/
    layout.tsx         — root layout with DynamicProviders + Navbar
    page.tsx           — landing: AUM + NAV stats + role-based redirect after connect
    deposit/page.tsx   — INVESTOR_ROLE gate, 2-step deposit, live share preview
    redeem/page.tsx    — requestRedeem form + pending queue state + cancel
    admin/page.tsx     — updateNAV + fulfillRedemption + grantRole/revokeRole
    convert/page.tsx   — 4-field wire form → POST /api/bridge
    api/bridge/
      route.ts         — verifies wallet signature (viem verifyMessage),
                         checks isHedgeFund on-chain, calls Bridge.xyz API
```

### Key constants in `contracts.ts`

```ts
export const VAULT_ADDRESS  // from NEXT_PUBLIC_VAULT_ADDRESS
export const USDC_ADDRESS   // from NEXT_PUBLIC_USDC_ADDRESS (default: Base Sepolia USDC)
export const ADMIN_ADDRESS  // from NEXT_PUBLIC_ADMIN_ADDRESS

export const INVESTOR_ROLE    = keccak256(toHex('INVESTOR_ROLE'))
export const NAV_UPDATER_ROLE = keccak256(toHex('NAV_UPDATER_ROLE'))
export const DEFAULT_ADMIN_ROLE = '0x000...000'
```

### `.env.local` (fill after deploy)

```
NEXT_PUBLIC_VAULT_ADDRESS=           ← paste deployed FundVault address here
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
NEXT_PUBLIC_ADMIN_ADDRESS=           ← deployer EOA address
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=dev-placeholder   ← replace with real ID for demo
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
BRIDGE_API_KEY=                      ← get from Bridge.xyz at the event
```

---

## Design system (`DESIGN.md`)

```
Background:   #0A0E1A  (--bg)
Surface:      #141824  (--surface)
Border:       #1E2535  (--border)
Text:         #F0F2F7  (--text)
Muted:        #6B7280  (--muted)
Accent:       #2775CA  (--accent, USDC blue)
Success:      #22C55E  (--success)
Error:        #EF4444  (--error)

Font: Geist (already installed via next/font/google)
Spacing base: 4px
Border radius: 4px (inputs/buttons), 8px (cards)
No rounded-xl, no purple, no icon circles
```

---

## Hackathon bounty targets

Full strategy in `HACKATHON_PLAN.md`.

| Bounty | Amount | Status | What's needed |
|---|---|---|---|
| **Arc** | $15K | Ready once demo works | E2E deposit→redeem→Bridge.xyz flow |
| **Uniswap Foundation** | $10K | Not built | Deploy v3 pool (shares/USDC), add Sell button to deposit page |
| **Circle** | TBD | Not built | CCTP multichain deposit (Arbitrum→Base) |
| **Chainlink** | $5K+ | Not built | Functions for off-ramp OR Data Streams for NAV |
| **Bridge.xyz** | TBD | Stubbed | Get testnet API key at event |
| **Base** | TBD | Almost | Just need deployed contract |
| **ETHGlobal main** | TBD | Needs working demo | Clean E2E on Base Sepolia |

---

## What still needs to be done (ordered by urgency)

### 1. Deploy FundVault (BLOCKER — nothing works without this)

```bash
cd /Users/julesfoa/Desktop/worktrees/vault-4jm
export PRIVATE_KEY=0x...
export BASE_SEPOLIA_RPC_URL=...
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --private-key $PRIVATE_KEY
# copy "Vault (F1V1)" address → frontend .env.local NEXT_PUBLIC_VAULT_ADDRESS
```

### 2. Wire frontend and test E2E

After adding addresses to `.env.local`:
- `npm run dev` from `frontend-8fd`
- Connect MetaMask on Base Sepolia
- Admin: grant INVESTOR_ROLE to your test wallet
- Deposit USDC → see shares
- RequestRedeem → see pending state
- Admin: fulfillRedemption → USDC back
- Convert → Bridge.xyz form (mock response OK)

### 3. Uniswap v3 pool (P1 bounty)

Deploy a v3 shares/USDC pool on Base Sepolia. Add liquidity. Add "Sell shares" link on deposit page pointing to Uniswap with tokens pre-filled. ~4 hours.

### 4. Chainlink or Circle (P2)

Pick one based on bandwidth. Chainlink Functions to proxy Bridge.xyz call on-chain is the stronger story.

### 5. Bridge.xyz real API key

Go to the Bridge.xyz booth at ETHGlobal Cannes and ask for a testnet API key. The `/api/bridge` route is already wired.

---

## Known issues / gotchas

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=dev-placeholder` will prevent WalletConnect wallet connections. Replace with a real project ID from cloud.walletconnect.com before the demo.
- The deploy script mints 1M mock USDC to the deployer. For the demo, transfer some to test investor wallets.
- `maxNavStaleness` is set to 10 minutes in the deploy script for demo purposes. The vault will block deposits and redeems if NAV hasn't been updated in >10 min. Keep this in mind during the demo — call `updateNAV` before showing depositors.
- `fulfillRedemption` will revert if the vault doesn't hold enough USDC to cover the payout. The deploy script doesn't pre-fund the vault with USDC. You need an investor to deposit first (or the deployer to `transfer` USDC directly to the vault for demo purposes).
- The admin page only tracks investors added in the current browser session (local state). It doesn't read on-chain INVESTOR_ROLE holders from events. For the hackathon this is fine — just enter addresses you add.
- `src/app/api/bridge/route.ts` has a fallback: if `POOL_ADDRESS` isn't set it skips the on-chain `isHedgeFund` check. This is fine since FundVault doesn't expose `isHedgeFund` — the signature verification is the main auth mechanism.

---

## 5-minute demo script

1. Landing: show AUM + NAV
2. Admin wallet: `updateNAV(1e6)` to ensure freshness → grant INVESTOR_ROLE to demo wallet
3. Investor wallet: deposit 100 USDC → see shares received at NAV
4. Investor: requestRedeem 50 shares → show "Queued" state
5. Admin: fulfillRedemption(investor) → investor gets USDC
6. Investor: Convert to USD → fill bank form → show Bridge.xyz reference
7. If Uniswap built: show abUSDC/USDC pool → "instant exit without waiting for manager"
8. Close: architecture diagram, Arc pitch

---

## The one-sentence pitch

> ABRAND is an onchain ERC4626 fund vehicle that gives retail investors NAV-priced exposure to institutional capital deployment, with programmatic USDC→USD settlement via Bridge.xyz — no prime broker, no feeder fund, no lockup.
