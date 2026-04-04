# ABRAND Frontend Plan

## Overview

ABRAND is an onchain hedge fund marketplace. Retail investors browse listed hedge funds, read their strategy docs, and invest USDC into a shared pool — receiving vault shares in return. Whitelisted hedge funds redeem shares for USDC, then off-ramp to USD via Bridge.xyz.

**Pitch:** Browse hedge funds like Bloomberg. Invest like Coinbase. No prime broker, no feeder fund, no lockup.

**Target chain:** Base Sepolia (testnet) → Base (mainnet)
**Stack:** Next.js App Router + Tailwind + wagmi + viem + RainbowKit

---

## App Structure

```
/app
  /                    → Fund directory (homepage) — no wallet required to browse
  /funds/[id]          → Fund detail page — strategy docs + deposit form
  /redeem              → Hedge fund flow (whitelisted only)
  /admin               → Admin panel (whitelist management + fund listing)
  /convert             → Bridge.xyz off-ramp (post-redeem)
  /api/bridge          → Server-side Bridge.xyz proxy
```

Note: `/deposit` is removed. Deposit now happens on `/funds/[id]` alongside the fund's strategy docs.

---

## Pages & Components

### Fund Directory (`/`) — Homepage
**Hierarchy:** Navbar → subheading → fund table (primary content, immediately visible without wallet)

**Navbar:**
- `ABRAND` logotype, white, 700 weight, left
- [Connect Wallet] button, outlined red (`border border-accent text-accent`), right
- Border-bottom: `1px solid #222222`

**Subheading (above table):**
- Text: `INSTITUTIONAL CAPITAL. ONCHAIN.` — uppercase, `--muted` color, `text-sm tracking-widest`
- Below subheading: `1px solid #DC2626` (red separator)

**Fund Table:**
- No wallet required to view — visible immediately on landing [DECIDED]
- Column headers (muted, uppercase, small): `FUND NAME | STRATEGY | AUM | YTD | —`
- Each row: fund name (white, 600 weight) | strategy tag | AUM in monospace | YTD colored by sign | [Invest →] button
- Row hover: `--surface` bg, fund name turns accent red
- Clicking fund name or row → `/funds/[id]`
- Clicking [Invest →] button → `/funds/[id]` (same destination — fund detail page has the deposit form)
- If not connected and user tries to invest: `/funds/[id]` page prompts connect wallet inline on the deposit form

**Fund data source (hackathon):** Hardcoded in `/src/data/funds.ts` — array of 3 mock funds with name, id, strategy, aum, ytd, description (2-3 paragraphs). No on-chain fund registry needed for demo.

**AUM/YTD display:** Always show hardcoded values from `funds.ts` (e.g., "$1.2M", "+4.2%"). Do NOT show "--" before wallet connect — static numbers look live and build trust with judges. [DECIDED] For the real fund, live on-chain `totalAssets` can optionally replace the hardcoded AUM once wallet is connected, but hardcoded is the fallback.

**Empty state (0 funds):** "No funds listed yet." centered in table area.

**Loading state:** 3 skeleton rows (animated pulse, same column widths as real rows).

**Error state (contract read fails):** Silently fall back to hardcoded numbers from `funds.ts`. Do not show an error for the fund table — the hardcoded data is always present.

**Role-based navigation after connect:**
- isHedgeFund → shows "Redeem" link in navbar
- isAdmin → shows "Admin" link in navbar
- else → no extra links (deposit happens inline on fund pages)

### Fund Detail (`/funds/[id]`)
**Hierarchy:** Fund header → two-column layout [strategy docs left | deposit form right] → back to directory

**Fund Header (full-width, above two columns):**
- Fund name: 32–48px, white, 700 weight
- Strategy badge: `border border-muted text-muted text-xs`, 4px radius
- AUM + YTD stat line: monospace, YTD colored by sign
- Back link: `← All Funds` → `/`

**Left Column — Strategy Docs (60% width on desktop):**
- Section label: `STRATEGY OVERVIEW` in muted uppercase small
- Docs block: `--surface` bg, `border-l-2 border-accent`, 24px padding
- Content: hardcoded 2-3 paragraphs from `/src/data/funds.ts`, body text, `--muted` color
- No PDF, no markdown renderer — plain text paragraphs only [DECIDED]

**Right Column — Deposit Form (40% width on desktop, max-width 480px):**
- Shown always; if wallet not connected, shows connect-wallet prompt where inputs would be
- USDC balance display (your available amount) — shown after connect
- Amount input with "MAX" shortcut
- Live preview: "You'll receive X vault shares" (based on current NAV)
- Trust copy: "Shares represent your pool position. Redeemable at NAV."
- Step indicator: Step 1: Approve USDC → Step 2: Deposit
- Sub-label: "Two steps required — standard for ERC-20 tokens."
- Deposit button: 44px height, full-width of right column, red (`bg-accent text-white`)
- Transaction status inline below button (no toast)
- Success moment: subtle green pulse on share balance. Text: "Deposit confirmed. You now hold X shares."

**Not connected state (right column):**
- Show: "Connect your wallet to invest in [Fund Name]"
- Single [Connect Wallet] button (triggers RainbowKit modal)
- Amount input and step indicator hidden until connected

**Mobile layout:** Left column (docs) stacks above right column (form). Full-width.

### Redeem (`/redeem`)
**Hierarchy:** abUSDC balance + amount input → live preview → Redeem → Convert to USD

- Gated: non-whitelisted addresses see "Your wallet is not approved for redemption. Contact ABRAND admin." — not a blank page
- abUSDC balance display (your available shares)
- Zero abUSDC state: "You have 0 abUSDC. To acquire shares, contact the ABRAND team." with a contact link (mailto or Telegram) [DECIDED]
- Amount input with "MAX" shortcut
- Live preview: "You'll receive X USDC" (always 1:1)
- Redeem button
- Post-redeem: "Convert to USD" button (visible but disabled until after successful redeem)
- → /convert

### Convert (`/convert`)
**Hierarchy:** Amount confirmation → Beneficiary details → Bank details → Submit

**Step 1: Confirm amount**
- "Converting X USDC to USD" (pre-filled from redeem, not editable here)
- Estimated arrival: "1-3 business days" (static copy)

**Step 2: Beneficiary details**
- Full legal name (text input, required)
- Bank country (select, default: United States)

**Step 3: Bank details (US)**
- Bank name (text input)
- Account number (text input, masked)
- Routing number (text input, 9 digits, validated)

**Step 4: Submit**
- "Initiate Wire Transfer" button
- Calls `POST /api/bridge` with `{ amount, beneficiary: { name }, bank: { name, account, routing, country } }`

**Success state:** "Wire initiated. Reference: [ref number]. Funds arrive in 1-3 business days."

**Post-wire state (user returns to app before funds arrive):** The /convert page or /redeem page has no persistent state tracking. Do not attempt to show wire status — Bridge.xyz status polling is out of scope. Instead: on the success screen, add copy: "You'll receive a confirmation email from Bridge.xyz. No further action needed in this app." This sets expectations and closes the emotional loop.

**Notes:**
- Form is single-column, max 480px
- Validation: routing number 9 digits, account non-empty
- "Back to Redeem" link if user wants to cancel
- Calls `/api/bridge` (server-side proxy — BRIDGE_API_KEY never exposed to client)

### Admin (`/admin`)
**Hierarchy:** Add hedge fund form (primary action) → current whitelist table

- Gated: non-admin addresses redirected to landing
- "Add hedge fund" input: ETH address field + Add button
- Whitelist table: Address | Added | Remove action
  - Address display: truncated (0x1234...5678), monospace, links to basescan.org/address/... [DECIDED]
- Empty state: "No hedge funds whitelisted yet. Add the first one above."
- Remove confirmation: inline "Are you sure?" — not a modal

---

## Navigation Flow

```
/ (fund directory — no wallet required)
  → click fund row / [Invest →]  → /funds/[id]
  → connect wallet
    → isHedgeFund? → shows "Redeem" in navbar
    → isAdmin?     → shows "Admin" in navbar

/funds/[id]
  → not connected: shows connect-wallet prompt in form area
  → connected: shows deposit form
  → after successful deposit: stay on /funds/[id], show updated balance
  → [← All Funds] → /

/redeem
  → after successful redeem: show "Convert to USD" button
  → click "Convert to USD" → /convert

/convert
  → after wire initiated: show success state, "Back to home" link → /
  → "Back to Redeem" → /redeem

/admin
  → no outbound navigation — stays on /admin
```

**Navbar link visibility:**
- All users (connected or not): `ABRAND` logo → `/`
- Hedge fund (isHedgeFund): + `Redeem` link → `/redeem`
- Admin (address === NEXT_PUBLIC_ADMIN): + `Admin` link → `/admin`
- Not connected: [Connect Wallet] button only (no extra links)

---

## Role Detection

**Batch all on-chain reads into one multicall with `useReadContracts`:**

```ts
const { data } = useReadContracts({
  contracts: [
    { address: POOL, abi: poolAbi,    functionName: 'totalLiquidity' },
    { address: POOL, abi: poolAbi,    functionName: 'isHedgeFund',   args: [address] },
    { address: USDC, abi: erc20Abi,   functionName: 'balanceOf',     args: [address] },
    { address: ABUSDC, abi: erc20Abi, functionName: 'balanceOf',     args: [address] },
  ],
  query: { enabled: !!address, refetchInterval: 15_000 }  // poll every 15s [DECIDED]
})
// data[0] = totalLiquidity, data[1] = isHedgeFund, data[2] = usdcBalance, data[3] = abusdcBalance
```

- One RPC call (multicall) instead of 4 [DECIDED]
- All 4 values load or fail together — consistent loading state
- compare address to NEXT_PUBLIC_ADMIN → show/hide Admin tab (no on-chain call needed)

---

## Transaction Flows

### Deposit (2-step)

**Hook sequence (critical — do not skip receipt-wait):**

```
Step 1: Approve
  const { writeContract: approve, data: approveTxHash } = useWriteContract()
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })

Step 2: Deposit (gated on approveConfirmed)
  const { writeContract: deposit } = useWriteContract()
  useEffect(() => {
    if (approveConfirmed) deposit({ ... })
  }, [approveConfirmed])
```

**State machine:**
```
IDLE → APPROVING (TX submitted) → APPROVE_CONFIRMED → DEPOSITING → DONE
                  ↓ error              ↓ error            ↓ error
               APPROVE_FAILED      (unreachable)      DEPOSIT_FAILED
```

- Button shows current state label: "Approve USDC" → "Approving..." → "Deposit" → "Depositing..." → "Done"
- Step indicator updates on each state transition

### Redeem
1. Check `isHedgeFund(address)` → gate render
2. `useWriteContract` → `ABRANDPool.redeem(amount)`
3. Wait for receipt → unlock "Convert to USD"

### Bridge.xyz Off-Ramp
1. `POST /api/bridge` with `{ amount, bankDetails }`
2. Show wire confirmation

---

## Environment Variables

```
NEXT_PUBLIC_ABRAND_POOL_ADDRESS=
NEXT_PUBLIC_ACCESS_REGISTRY_ADDRESS=
NEXT_PUBLIC_ABUSDC_ADDRESS=          # abUSDC ERC-20 token deployed by ABRANDPool [ADDED]
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
NEXT_PUBLIC_ADMIN_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=84532
BRIDGE_API_KEY=
```

---

## Design Direction

See `DESIGN.md` for full spec. Summary:

**Classifier:** APP UI — data-dense fund directory, not a marketing page.

**Visual direction:** Black (#0A0A0A) background, red (#DC2626) accent, white (#FFFFFF) text. Terminal aesthetic — Bloomberg meets dark-mode Robinhood. The fund table IS the hero. [DECIDED]

**Color system:** See DESIGN.md `## Color Tokens`. Key tokens:
- `--bg: #0A0A0A` — pure black
- `--accent: #DC2626` — red CTAs, active states, red divider
- `--text: #FFFFFF` — primary text
- `--muted: #9CA3AF` — secondary text, table headers

**Typography:** Geist, 4px spacing scale. See DESIGN.md.

**Key layout decisions:**
- Homepage: fund table immediately visible, no wall before value [DECIDED]
- Fund detail: two-column desktop (docs left, form right) → stacked mobile [DECIDED]
- Mobile table: horizontal scroll, no reflow to cards [DECIDED]
- Navbar: ABRAND logo left | [Connect Wallet] right, no center stat [DECIDED]
- Docs format: hardcoded text paragraphs, no markdown renderer, no PDF [DECIDED]

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Wallet | RainbowKit + wagmi | Best DX, supports Base + Coinbase Wallet |
| Chain reads | viem public client | Lightweight |
| Contract calls | wagmi `useWriteContract` | Built-in tx state management |
| Styling | Tailwind | In stack, fast |
| Routing | Next.js App Router | No extra setup |
| Bridge.xyz proxy | Next.js API route | Keeps API key server-side |
| Wrong network | wagmi configured with Base Sepolia only; RainbowKit auto-shows Switch Network modal [DECIDED] | Prevents silent contract call failures |
| Contract ABIs | Copy from `forge build` output → `/src/abi/ABRANDPool.json` and `/src/abi/AccessRegistry.json` [DECIDED] | Simple, explicit, no symlink fragility |
| /api/bridge auth | Wallet signature verification: client signs a message, server verifies with viem `verifyMessage()` [DECIDED] | Ensures only wallet holder submits wire requests |

## wagmi Config (src/lib/wagmi.ts)

```ts
import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const config = getDefaultConfig({
  appName: 'ABRAND',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [baseSepolia],          // Base Sepolia ONLY — enforces network
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
})
```

Add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` and `NEXT_PUBLIC_RPC_URL` to env vars.

## /api/bridge Auth Flow

```
1. Client: generate message = `ABRAND wire transfer ${amount} ${timestamp}`
2. Client: sign with wallet → signature
3. Client: POST /api/bridge { amount, bankDetails, address, signature, message }
4. Server: viem verifyMessage({ address, message, signature })
5. Server: check isHedgeFund(address) via RPC (or trust the signature is enough for hackathon)
6. Server: call Bridge.xyz API
```

---

## Responsive Layout

| Breakpoint | Behavior |
|---|---|
| Desktop ≥1024px | Fund table: full columns visible. Fund detail: two-column (docs left 60%, form right 40%). Navbar: logo + wallet button. |
| Tablet 768–1023px | Fund table: same as desktop (all columns). Fund detail: two-column if space allows, else stacked. |
| Mobile <768px | Fund table: horizontal scroll (`overflow-x: auto`), table does NOT reflow to cards [DECIDED]. Fund detail: docs stacked above form, full-width. Navbar: logo + wallet button only. All touch targets ≥44px. |

**Primary use case is desktop** (MetaMask users). Mobile must not break but is not the primary target for the hackathon.

**Mobile fund table implementation:**
```html
<div class="overflow-x-auto">
  <table class="min-w-[600px]">...</table>
</div>
```
Minimum table width 600px prevents columns collapsing. Native scroll, no custom drag.

**Wallet support:** RainbowKit with WalletConnect enabled. Supports MetaMask, Coinbase Wallet, Rainbow, and any WalletConnect-compatible wallet. [DECIDED]

---

## Accessibility Baseline

- All interactive elements keyboard-navigable via Tab
- Focus rings: `2px solid #DC2626, 2px offset` — NOT `outline: none` [DECIDED — updated to red]
- `aria-busy="true"` on buttons during TX
- `aria-live="polite"` on transaction status region
- `role="status"` on confirmation messages
- Color contrast: #FFFFFF on #0A0A0A = 21:1 (WCAG AAA) ✓. #9CA3AF on #0A0A0A = 5.8:1 (WCAG AA) ✓
- Form labels always visible above inputs (no placeholder-as-label pattern)
- Amount inputs: `inputMode="decimal"` for mobile numeric keyboard
- Addresses: `aria-label="Wallet address"` on truncated displays
- Fund table: native `<table>` element — not div grid. Screen readers get column headers via `<th scope="col">`.

**ARIA landmark structure (per page):**
```html
<header role="banner">        <!-- Navbar -->
<main role="main">
  <!-- Fund directory -->
  <section aria-label="Fund directory">
    <table aria-label="Available funds">
  <!-- Fund detail -->
  <section aria-label="[Fund Name] detail">
    <section aria-label="Strategy overview">
    <form aria-label="Deposit form">
      <output aria-live="polite"> <!-- TX status -->
```

**Tab order (fund detail — deposit form):** Amount input → MAX button → Deposit button → TX status (not focusable, aria-live)

**Tab order (fund directory table):** Fund rows are keyboard-navigable with Enter to open detail page.

---

## Interaction State Coverage

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Fund directory — table | 3 skeleton rows (pulse animation) | "No funds listed yet." centered | "Fund data unavailable." + retry | Full table with rows | — |
| Wallet connect | RainbowKit spinner | — | "Connection failed, try again" | Address shown in navbar, role-based links appear | — |
| Fund detail — not connected | — | Connect-wallet prompt in form area | — | Deposit form revealed after connect | — |
| Fund detail — USDC balance | Skeleton number | "0 USDC — get USDC on Base" with faucet link | "Balance unavailable" | Live balance | — |
| Fund detail — approve tx | "Approving..." spinner, button disabled | — | "Approval failed: [reason]" | Step 1 ✓, proceed to Step 2 | — |
| Fund detail — deposit tx | "Depositing..." spinner, button disabled | — | "Deposit failed: [reason]" | Share balance pulses green. "Deposit confirmed. You now hold X shares." | — |
| Redeem — whitelist check | Skeleton / gated state loading | — | "Whitelist check failed" | Redeem form shown | — |
| Redeem — share balance | Skeleton number | "You have 0 shares. Contact the ABRAND team." + contact link | "Balance unavailable" | Live balance | — |
| Redeem — redeem tx | "Redeeming..." spinner, button disabled | — | "Redemption failed: [reason]" | "X USDC received — Convert to USD unlocked" | — |
| Convert — bank form | — | Form empty state: placeholder hints | "Transfer failed: [reason from Bridge.xyz]" | "Wire initiated — ref # shown" | Partial: API call sent but pending |
| Admin — whitelist table | Skeleton rows | "No hedge funds whitelisted yet. Add one above." | "Failed to load whitelist" | Table with rows | — |
| Admin — add hedge fund | "Adding..." spinner | — | "Invalid address" / "Already whitelisted" / "TX failed" | Row added to table | — |
| Admin — remove hedge fund | "Removing..." inline spinner | — | "Remove failed: [reason]" | Row removed from table | — |

**Error display pattern:** Errors appear inline below the relevant form field or button. No toast popups. No modals. One sentence, actionable. [DECIDED]

**Loading pattern:** Skeleton for balances/stats. Spinner + disabled state on buttons during TX.

---

## Test Plan

**Framework:** Vitest (native to Vite/Next.js ecosystem, no config overhead)

**Minimum viable test suite (4 files):**

### `src/app/api/bridge/__tests__/route.test.ts`
```
✓ valid signature + valid fields → calls Bridge.xyz, returns 200
✓ invalid signature → returns 401
✓ missing routing number → returns 400
✓ routing number not 9 digits → returns 400
✓ Bridge.xyz API error → returns 502
✓ missing bank name → returns 400
```
Mock Bridge.xyz with `vi.mock()`. Use viem `verifyMessage()` in a testable way (extract to a pure function).

### `src/hooks/__tests__/useDepositFlow.test.ts`
```
✓ IDLE: deposit button renders as "Approve USDC"
✓ APPROVING: button shows "Approving...", is disabled
✓ APPROVE_CONFIRMED: automatically triggers deposit call
✓ DEPOSITING: button shows "Depositing...", is disabled
✓ DONE: shows "Deposit confirmed. You now hold X shares."
✓ APPROVE_FAILED: shows inline error, allows retry
✓ DEPOSIT_FAILED: shows inline error, allows retry
✓ amount > balance: button stays disabled
```
Test the state machine logic only (no wagmi mocking needed if extracted to a pure reducer).

### `src/app/__tests__/page.test.tsx` (NEW — fund directory)
```
✓ renders all 3 funds from funds.ts
✓ isActive=true → [Invest →] button visible
✓ isActive=false → [Soon] badge visible, no [Invest →]
✓ YTD positive value → positive class applied (green)
✓ YTD negative value → negative class applied (red)
✓ loading state → 3 skeleton rows present
✓ clicking active fund row → navigates to /funds/[id]
```

### `src/app/funds/__tests__/[id].test.tsx` (NEW — fund detail)
```
✓ unknown fund id → redirects to /
✓ wallet not connected → connect-wallet prompt visible, deposit form hidden
✓ wallet connected → deposit form visible
✓ fund name and strategy rendered from funds.ts
✓ docs block renders strategy description text
```

**Not tested (manual QA):** E2E wallet flows, wrong network prompt, admin panel, responsive layout.

---

## Not in Scope (Design Review Deferred)

- Screen reader full audit — a11y baseline specified, full audit deferred post-hackathon
- Motion / animation spec — success pulse is the only specified motion; no entrance animations
- Fund performance charts — AUM/YTD are static numbers; no charting library
- Fund self-registration — admin-only for hackathon; no on-chain fund registry
- Multi-fund portfolio view — shows per-fund balance on detail page only; no aggregate dashboard
- PDF docs — hardcoded text only; real PDF upload is post-hackathon

---

## What Already Exists

- `src/app/deposit/page.tsx` — full deposit form. **Do not rebuild.** Reuse `useDepositFlow` hook directly in `/funds/[id]/page.tsx`. Then convert `deposit/page.tsx` to a `redirect('/')`.
- `src/hooks/useDepositFlow.ts` — deposit state machine. Import as-is into `/funds/[id]/page.tsx`.
- `src/components/AmountInput.tsx`, `TxButton.tsx`, `StepIndicator.tsx` — reuse in `/funds/[id]/page.tsx`.
- `src/lib/contracts.ts` — formatters, ABIs, addresses. Reuse as-is.
- RainbowKit ships its own wallet connect modal — reuse as-is, do not restyle.
- wagmi/viem provide transaction state — map directly to loading/error/success states.
- DESIGN.md updated to black/red/white system — use these tokens.

## Implementation Notes (from Eng Review)

**1. Remove redirect in `src/app/page.tsx`:**
Delete lines 8-11 (the `useEffect` that redirects to `/deposit`). New UX: users stay on fund directory after connecting wallet.

**2. Convert `src/app/deposit/page.tsx` to redirect:**
Replace entire file contents with:
```tsx
import { redirect } from 'next/navigation'
export default function DepositPage() { redirect('/') }
```

**3. Update `src/app/globals.css` CSS variables:**
```css
--bg:      #0A0A0A;
--surface: #111111;
--border:  #222222;
--text:    #FFFFFF;
--muted:   #9CA3AF;
--accent:  #DC2626;
```
Also update: `--rk-colors-accentColor: #DC2626 !important`

**4. Update `src/components/Navbar.tsx`:**
- Remove center stats section (`totalAssets`, `navPerShare` display)
- Remove `/deposit` link from nav
- Change Connect Wallet button to outlined red: `border border-accent text-accent bg-transparent hover:bg-accent hover:text-white`
- Role-based links: only Redeem (isManager/isHedgeFund) + Admin (isAdmin)
- Replace `hover:bg-[#1e63b5]` with `hover:bg-red-700`

**5. Create `src/data/funds.ts`:**
```ts
export interface Fund {
  id: string
  name: string
  strategy: string
  aum: string        // display string, e.g. "$1.2M"
  ytd: string        // display string, e.g. "+4.2%"
  ytdPositive: boolean
  description: string  // 2-3 paragraphs, hardcoded
  isActive: boolean    // true = real vault, false = coming soon
}

export const funds: Fund[] = [
  { id: 'abrand-fund-i', name: 'ABRAND Fund I', isActive: true, ... },
  { id: 'apex-capital', name: 'Apex Capital', isActive: false, ... },
  { id: 'fortress-fund-iii', name: 'Fortress Fund III', isActive: false, ... },
]
```
AUM/YTD: always show hardcoded values (never `--`). For the active fund, optionally overlay live `totalAssets` from `useProtocol()` once connected, but fall back to hardcoded if contract read fails or wallet not connected. [DECIDED]

**Critical:** The active fund's `id` in `funds.ts` must exactly match the deployed vault address in `.env.local` → `NEXT_PUBLIC_VAULT_ADDRESS`. These two values must stay in sync or the deposit form will silently call the wrong contract. Verify at deploy time.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Outside Voice | `/plan-eng-review` | Independent 2nd opinion | 1 | issues_found | 9 findings, 2 accepted (AUM display, vault address sync) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 2 | CLEAR (PLAN) | 8 issues found, 0 critical gaps, 0 unresolved |
| Design Review | `/plan-design-review` | UI/UX gaps | 3 | CLEAR (FULL) | score: 3/10 → 9/10, 14 decisions made |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**CROSS-MODEL:** Outside voice flagged AUM/NAV '--' as demo risk (accepted) and vault address sync (accepted). Disagreed on Coming Soon funds (kept per user decision).

**VERDICT:** ENG + DESIGN CLEARED — ready to implement.
