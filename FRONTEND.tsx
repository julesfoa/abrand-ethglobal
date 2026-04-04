// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     ABRAND — Frontend (Complete)                            ║
// ║              ETHGlobal Cannes Hackathon · Next.js + React + Tailwind       ║
// ║                                                                            ║
// ║  Stack: Next.js 16 · React 19 · Tailwind v4 · wagmi · viem · RainbowKit  ║
// ║  Chains: Base Sepolia (84532) · Arc Testnet (5042002)                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// ┌──────────────────────────────────────────────────────────────────────────────┐
// │                          TABLE OF CONTENTS                                  │
// ├──────────────────────────────────────────────────────────────────────────────┤
// │                                                                             │
// │  CONFIG                                                                     │
// │   1. globals.css ..................... Global styles, theme, animations      │
// │                                                                             │
// │  LIB                                                                        │
// │   2. lib/chains.ts .................. Arc Testnet chain definition           │
// │   3. lib/wagmi.ts ................... Wagmi config (chains + transports)     │
// │   4. lib/contracts.ts ............... ABIs, addresses, formatting helpers    │
// │                                                                             │
// │  DATA                                                                       │
// │   5. data/funds.ts .................. Fund catalog + performance data        │
// │   6. data/vaults.ts ................. Per-chain vault address registry       │
// │                                                                             │
// │  HOOKS                                                                      │
// │   7. hooks/useProtocol.ts ........... Core protocol reads (balances, roles)  │
// │   8. hooks/useDepositFlow.ts ........ Approve + deposit state machine       │
// │   9. hooks/useRedeemFlow.ts ......... Request / cancel redemption           │
// │  10. hooks/usePortfolio.ts .......... Position, P&L, deposit history        │
// │  11. hooks/useNavProposal.ts ........ Propose / approve / reject NAV        │
// │  12. hooks/useVaultFees.ts .......... Fee reads + setters                   │
// │                                                                             │
// │  COMPONENTS                                                                 │
// │  13. components/Navbar.tsx ........... Top nav + wallet connect              │
// │  14. components/AmountInput.tsx ...... Token amount input with MAX           │
// │  15. components/TxButton.tsx ......... Transaction submit button             │
// │  16. components/StepIndicator.tsx .... Multi-step progress indicator         │
// │  17. components/PasswordGate.tsx ..... Session-based password gate           │
// │  18. components/PerformanceDashboard  Annual/monthly return charts           │
// │  19. components/OracleDashboard.tsx .. NAV oracle status panel              │
// │                                                                             │
// │  PAGES                                                                      │
// │  20. app/layout.tsx ................. Root layout + providers                │
// │  21. app/page.tsx ................... Home / Fund Marketplace                │
// │  22. app/funds/[id]/page.tsx ........ Fund Detail + Deposit                 │
// │  23. app/portfolio/page.tsx ......... Portfolio overview                     │
// │  24. app/redeem/page.tsx ............ Redemption request                     │
// │  25. app/convert/page.tsx ........... USDC → USD off-ramp (Bridge.xyz)      │
// │  26. app/manage/[id]/page.tsx ....... Fund Manager Dashboard                │
// │  27. app/audit/[id]/page.tsx ........ Auditor Dashboard                     │
// │  28. app/admin/[id]/page.tsx ........ Admin Dashboard                       │
// │                                                                             │
// └──────────────────────────────────────────────────────────────────────────────┘


// ═══════════════════════════════════════════════════════════════════════════════
// §1  CONFIG — globals.css
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/globals.css

/*
@import "tailwindcss";

:root {
  --bg: #0A0A0A;
  --surface: #111111;
  --border: #1A1A1A;
  --text: #F0F0F0;
  --muted: #6B7280;
  --accent: #DC2626;
  --success: #22C55E;
  --error: #EF4444;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-success: var(--success);
  --color-error: var(--error);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: 80px;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

* {
  box-sizing: border-box;
}

.scanlines::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.03) 2px,
    rgba(0,0,0,0.03) 4px
  );
  z-index: 1;
}

.red-rule {
  position: relative;
}
.red-rule::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(600px, 80%);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(220,38,38,0.5), transparent);
}

.fund-row-active {
  position: relative;
}
.fund-row-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 0;
  background: var(--accent);
  transition: height 0.2s ease;
}
.fund-row-active:hover::before {
  height: 60%;
}

.hero-card {
  background: linear-gradient(135deg, rgba(17,17,17,0.95), rgba(17,17,17,0.8)) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow:
    0 0 0 1px rgba(220,38,38,0.2),
    0 8px 32px rgba(0,0,0,0.6),
    0 1px 0 rgba(255,255,255,0.03) inset;
}

.stat-value {
  text-shadow: 0 0 20px rgba(220,38,38,0.15);
}

.btn-glow {
  position: relative;
  overflow: hidden;
}
.btn-glow::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent 50%);
  pointer-events: none;
}
.btn-glow:hover {
  box-shadow: 0 0 24px rgba(220,38,38,0.4);
}

.versus-win {
  position: relative;
}
.versus-win::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent, rgba(220,38,38,0.04), transparent);
  pointer-events: none;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
}

.animate-fade-up       { animation: fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both; }
.animate-fade-up-d1    { animation: fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
.animate-fade-up-d2    { animation: fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.16s both; }
.animate-fade-up-d3    { animation: fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.24s both; }
.animate-fade-up-d4    { animation: fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.32s both; }
.animate-fade-in       { animation: slide-in-right 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both; }

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-10px); }
}
@keyframes float-sm {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-5px); }
}

.animate-float        { animation: float    3.2s ease-in-out infinite; }
.animate-float-d1     { animation: float    3.6s ease-in-out infinite 0.4s; }
.animate-float-d2     { animation: float    3.0s ease-in-out infinite 0.8s; }
.animate-float-btn    { animation: float-sm 2.8s ease-in-out infinite 0.0s; }
.animate-float-btn2   { animation: float-sm 2.8s ease-in-out infinite 0.3s; }

@media (prefers-reduced-motion: reduce) {
  .animate-float, .animate-float-d1, .animate-float-d2,
  .animate-float-step1, .animate-float-step2, .animate-float-step3,
  .animate-float-btn, .animate-float-btn2,
  .animate-fade-up, .animate-fade-up-d1, .animate-fade-up-d2,
  .animate-fade-up-d3, .animate-fade-up-d4, .animate-fade-in { animation: none; }
  body::after { display: none; }
}

[data-rk] {
  --rk-colors-accentColor: #DC2626 !important;
}
*/


// ═══════════════════════════════════════════════════════════════════════════════
// §2  LIB — lib/chains.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/lib/chains.ts

import { defineChain } from 'viem'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
})


// ═══════════════════════════════════════════════════════════════════════════════
// §3  LIB — lib/wagmi.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/lib/wagmi.ts

import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { baseSepolia } from 'wagmi/chains'
import { arcTestnet } from './chains'

export { arcTestnet }

export const config = createConfig({
  chains: [arcTestnet, baseSepolia],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://sepolia.base.org'),
  },
  ssr: true,
})


// ═══════════════════════════════════════════════════════════════════════════════
// §4  LIB — lib/contracts.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/lib/contracts.ts

import { keccak256, toHex } from 'viem'
import { useChainId } from 'wagmi'

// ── Chain IDs ────────────────────────────────────────────────────────────────
export const BASE_SEPOLIA_ID = 84532
export const ARC_TESTNET_ID  = 5042002

// ── Per-chain address maps ────────────────────────────────────────────────────
export const VAULT_ADDRESS_BY_CHAIN: Record<number, `0x${string}`> = {
  [BASE_SEPOLIA_ID]: (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? '') as `0x${string}`,
  [ARC_TESTNET_ID]:  (process.env.NEXT_PUBLIC_ARC_VAULT_ADDRESS ?? '') as `0x${string}`,
}

export const USDC_ADDRESS_BY_CHAIN: Record<number, `0x${string}`> = {
  [BASE_SEPOLIA_ID]: (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as `0x${string}`,
  [ARC_TESTNET_ID]:  '0x3600000000000000000000000000000000000000',
}

export const ORACLE_ADDRESS_BY_CHAIN: Record<number, `0x${string}`> = {
  [BASE_SEPOLIA_ID]: (process.env.NEXT_PUBLIC_ORACLE_ADDRESS ?? '') as `0x${string}`,
  [ARC_TESTNET_ID]:  (process.env.NEXT_PUBLIC_ARC_ORACLE_ADDRESS ?? '') as `0x${string}`,
}

export const NAV_CONSUMER_ADDRESS_BY_CHAIN: Record<number, `0x${string}`> = {
  [BASE_SEPOLIA_ID]: (process.env.NEXT_PUBLIC_NAV_CONSUMER_ADDRESS ?? '') as `0x${string}`,
  [ARC_TESTNET_ID]:  (process.env.NEXT_PUBLIC_ARC_NAV_CONSUMER_ADDRESS ?? '') as `0x${string}`,
}

// ── Hook: returns addresses for the connected chain ───────────────────────────
export function useContractAddresses() {
  const chainId = useChainId()
  return {
    vaultAddress:       VAULT_ADDRESS_BY_CHAIN[chainId]        ?? VAULT_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
    usdcAddress:        USDC_ADDRESS_BY_CHAIN[chainId]         ?? USDC_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
    oracleAddress:      ORACLE_ADDRESS_BY_CHAIN[chainId]       ?? ORACLE_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
    navConsumerAddress: NAV_CONSUMER_ADDRESS_BY_CHAIN[chainId] ?? NAV_CONSUMER_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
  }
}

// ── Static fallbacks (Base Sepolia — used in server-side / non-hook contexts) ─
export const VAULT_ADDRESS  = VAULT_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID]
export const USDC_ADDRESS   = USDC_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID]
export const ADMIN_ADDRESS  = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? '') as `0x${string}`

// Role hashes (mirrors FundVault.sol constants)
export const INVESTOR_ROLE = keccak256(toHex('INVESTOR_ROLE')) as `0x${string}`
export const NAV_UPDATER_ROLE = keccak256(toHex('NAV_UPDATER_ROLE')) as `0x${string}`
export const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
export const AUDITOR_ROLE = keccak256(toHex('AUDITOR_ROLE')) as `0x${string}`

// FundVault ABI (ERC4626 + custom functions)
export const fundVaultAbi = [
  // ERC20/ERC4626 reads
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'navPerShare',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // AccessControl reads
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  // ERC4626 deposit
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ERC20 approve
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  // Redemption queue
  {
    name: 'requestRedeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancelRedemption',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'fulfillRedemption',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'investor', type: 'address' }],
    outputs: [],
  },
  {
    name: 'redemptionRequests',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'investor', type: 'address' }],
    outputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'navAtRequest', type: 'uint256' },
      { name: 'requestedAt', type: 'uint256' },
      { name: 'disputed', type: 'bool' },
    ],
  },
  // Dispute + auto-release (Circle bounty)
  {
    name: 'disputeRedemption',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'investor', type: 'address' }],
    outputs: [],
  },
  {
    name: 'resolveDispute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'investor', type: 'address' },
      { name: 'approve', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'claimRedemption',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // NAV management
  {
    name: 'updateNAV',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newNav', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdrawCapital',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'to',     type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'adminForceUpdateNAV',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newNav', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'navUpdatedAt',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'maxNavStaleness',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // AccessControl writes
  {
    name: 'grantRole',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'revokeRole',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [],
  },
  // Pause
  {
    name: 'pause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'unpause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'paused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'maxExitBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'setMaxExitBps',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'bps', type: 'uint256' }],
    outputs: [],
  },
  // Fee management
  {
    name: 'managementFeeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'performanceFeeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'feeRecipient',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'accruedFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'setManagementFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'bps', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'setPerformanceFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'bps', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'setFeeRecipient',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'recipient', type: 'address' }],
    outputs: [],
  },
  {
    name: 'collectFees',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // NAV proposal (manager proposes, auditor approves/rejects)
  {
    name: 'pendingNav',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'pendingNavTimestamp',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'pendingNavProposer',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'proposeNAV',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newNav', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'approveNAV',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'rejectNAV',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'reason', type: 'string' }],
    outputs: [],
  },
  // ERC4626 Deposit event
  {
    name: 'Deposit',
    type: 'event',
    inputs: [
      { name: 'caller',  type: 'address', indexed: true },
      { name: 'owner',   type: 'address', indexed: true },
      { name: 'assets',  type: 'uint256', indexed: false },
      { name: 'shares',  type: 'uint256', indexed: false },
    ],
  },
  // RedemptionRequested event
  {
    name: 'RedemptionRequested',
    type: 'event',
    inputs: [
      { name: 'investor',   type: 'address', indexed: true },
      { name: 'shares',     type: 'uint256', indexed: false },
      { name: 'navAtRequest', type: 'uint256', indexed: false },
    ],
  },
] as const

// ERC20 ABI for USDC (separate from vault)
export const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// ── Formatting helpers ──────────────────────────────────────────────────────

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// USDC: 6 decimals
export function formatUSDC(raw: bigint): string {
  const n = Number(raw) / 1e6
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatUSDCRaw(raw: bigint): string {
  return (Number(raw) / 1e6).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseUSDC(amount: string): bigint {
  const n = parseFloat(amount)
  if (isNaN(n) || n < 0) return 0n
  return BigInt(Math.floor(n * 1e6))
}

// Vault shares: 18 decimals
export function formatShares(raw: bigint): string {
  return (Number(raw) / 1e18).toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

export function parseShares(amount: string): bigint {
  const n = parseFloat(amount)
  if (isNaN(n) || n < 0) return 0n
  return BigInt(Math.floor(n * 1e18))
}

// NAV: stored in USDC units (1e6 = $1.00)
export function formatNAV(raw: bigint): string {
  return `$${(Number(raw) / 1e6).toFixed(4)}`
}

// NAVConsumer ABI (CRE report receiver + auditor management)
export const navConsumerAbi = [
  {
    name: 'onReport',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'report', type: 'bytes' }],
    outputs: [],
  },
  {
    name: 'isAuditor',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'latestNav',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lastUpdatedAt',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lastNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lastBenchmarkPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'int256' }],
  },
  {
    name: 'vault',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'refreshBenchmark',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const

// NAVOracle ABI (legacy Functions path + submitSignedNAV)
export const navOracleAbi = [
  {
    name: 'submitSignedNAV',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nav', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'isAuditor',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'lastNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const


// ═══════════════════════════════════════════════════════════════════════════════
// §5  DATA — data/funds.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/data/funds.ts

export interface MonthlyReturn {
  month: number   // 1–12
  ret: number     // e.g. 1.8 means +1.8%
}

export interface AnnualRecord {
  year: number
  ret: number
  monthly: MonthlyReturn[]
}

export interface FundMetrics {
  sharpe: number
  maxDrawdown: number   // negative, e.g. -4.2
  volatility: number    // annualised, e.g. 8.3
  inceptionDate: string // "Jan 2021"
  inceptionReturn: number // cumulative since inception, e.g. 48.7
}

export interface Fund {
  id: string
  name: string
  strategy: string
  aum: string
  ytd: string
  ytdPositive: boolean
  description: string[]
  isActive: boolean
  metrics: FundMetrics
  annualReturns: AnnualRecord[]
}

// ─── ABRAND Fund I ────────────────────────────────────────────────────────────
const abrandMonthly2026: MonthlyReturn[] = [
  { month: 1,  ret:  2.4 },
  { month: 2,  ret:  1.1 },
  { month: 3,  ret: -0.3 },
]
const abrandMonthly2025: MonthlyReturn[] = [
  { month: 1,  ret:  1.6 },
  { month: 2,  ret:  0.7 },
  { month: 3,  ret:  1.3 },
  { month: 4,  ret: -0.5 },
  { month: 5,  ret:  0.9 },
  { month: 6,  ret:  1.8 },
  { month: 7,  ret: -0.2 },
  { month: 8,  ret:  1.4 },
  { month: 9,  ret:  0.6 },
  { month: 10, ret: -0.7 },
  { month: 11, ret:  2.1 },
  { month: 12, ret:  1.5 },
]
const abrandMonthly2024: MonthlyReturn[] = [
  { month: 1,  ret:  1.8 },
  { month: 2,  ret:  0.9 },
  { month: 3,  ret: -0.4 },
  { month: 4,  ret:  0.7 },
  { month: 5,  ret:  1.2 },
  { month: 6,  ret: -0.8 },
  { month: 7,  ret:  0.9 },
  { month: 8,  ret:  0.3 },
  { month: 9,  ret: -0.6 },
  { month: 10, ret:  0.8 },
  { month: 11, ret:  1.1 },
  { month: 12, ret: -1.7 },
]
const abrandMonthly2023: MonthlyReturn[] = [
  { month: 1,  ret:  2.1 },
  { month: 2,  ret:  1.4 },
  { month: 3,  ret: -0.6 },
  { month: 4,  ret:  1.3 },
  { month: 5,  ret:  0.8 },
  { month: 6,  ret:  1.1 },
  { month: 7,  ret: -0.3 },
  { month: 8,  ret:  1.6 },
  { month: 9,  ret:  0.7 },
  { month: 10, ret: -0.9 },
  { month: 11, ret:  2.4 },
  { month: 12, ret:  2.5 },
]
const abrandMonthly2022: MonthlyReturn[] = [
  { month: 1,  ret:  0.6 },
  { month: 2,  ret:  0.4 },
  { month: 3,  ret:  1.2 },
  { month: 4,  ret: -0.8 },
  { month: 5,  ret:  0.9 },
  { month: 6,  ret:  0.3 },
  { month: 7,  ret:  0.8 },
  { month: 8,  ret: -0.2 },
  { month: 9,  ret:  0.7 },
  { month: 10, ret:  1.1 },
  { month: 11, ret:  0.6 },
  { month: 12, ret:  0.2 },
]
const abrandMonthly2021: MonthlyReturn[] = [
  { month: 1,  ret:  3.2 },
  { month: 2,  ret:  1.8 },
  { month: 3,  ret:  2.1 },
  { month: 4,  ret:  1.4 },
  { month: 5,  ret: -0.7 },
  { month: 6,  ret:  2.3 },
  { month: 7,  ret:  1.6 },
  { month: 8,  ret:  1.9 },
  { month: 9,  ret: -1.2 },
  { month: 10, ret:  2.4 },
  { month: 11, ret:  1.8 },
  { month: 12, ret:  1.8 },
]

// ─── Apex Capital ─────────────────────────────────────────────────────────────
const apexMonthly2026: MonthlyReturn[] = [
  { month: 1,  ret:  4.8 },
  { month: 2,  ret:  2.3 },
  { month: 3,  ret: -1.1 },
]
const apexMonthly2025: MonthlyReturn[] = [
  { month: 1,  ret:  3.6 },
  { month: 2,  ret:  1.9 },
  { month: 3,  ret:  2.4 },
  { month: 4,  ret: -1.8 },
  { month: 5,  ret:  3.2 },
  { month: 6,  ret:  1.1 },
  { month: 7,  ret: -0.7 },
  { month: 8,  ret:  2.9 },
  { month: 9,  ret:  1.6 },
  { month: 10, ret: -0.4 },
  { month: 11, ret:  4.1 },
  { month: 12, ret:  3.3 },
]
const apexMonthly2024: MonthlyReturn[] = [
  { month: 1,  ret:  3.2 },
  { month: 2,  ret:  2.1 },
  { month: 3,  ret:  1.8 },
  { month: 4,  ret: -1.2 },
  { month: 5,  ret:  2.8 },
  { month: 6,  ret: -0.4 },
  { month: 7,  ret:  3.1 },
  { month: 8,  ret:  1.9 },
  { month: 9,  ret: -0.8 },
  { month: 10, ret:  2.6 },
  { month: 11, ret:  4.2 },
  { month: 12, ret:  2.8 },
]
const apexMonthly2023: MonthlyReturn[] = [
  { month: 1,  ret:  4.1 },
  { month: 2,  ret:  2.8 },
  { month: 3,  ret: -1.4 },
  { month: 4,  ret:  3.2 },
  { month: 5,  ret:  1.9 },
  { month: 6,  ret:  2.7 },
  { month: 7,  ret: -0.6 },
  { month: 8,  ret:  3.8 },
  { month: 9,  ret:  1.4 },
  { month: 10, ret: -1.1 },
  { month: 11, ret:  5.6 },
  { month: 12, ret:  6.0 },
]
const apexMonthly2022: MonthlyReturn[] = [
  { month: 1,  ret:  1.8 },
  { month: 2,  ret: -0.9 },
  { month: 3,  ret:  2.6 },
  { month: 4,  ret:  1.4 },
  { month: 5,  ret: -1.8 },
  { month: 6,  ret:  1.2 },
  { month: 7,  ret:  2.1 },
  { month: 8,  ret:  0.8 },
  { month: 9,  ret:  1.7 },
  { month: 10, ret:  2.4 },
  { month: 11, ret:  1.6 },
  { month: 12, ret:  1.3 },
]

// ─── Fortress Fund III ────────────────────────────────────────────────────────
const fortressMonthly2026: MonthlyReturn[] = [
  { month: 1,  ret:  0.9 },
  { month: 2,  ret:  0.7 },
  { month: 3,  ret:  0.5 },
]
const fortressMonthly2025: MonthlyReturn[] = [
  { month: 1,  ret:  0.8 },
  { month: 2,  ret:  0.6 },
  { month: 3,  ret:  0.9 },
  { month: 4,  ret: -0.1 },
  { month: 5,  ret:  0.7 },
  { month: 6,  ret:  0.8 },
  { month: 7,  ret:  0.5 },
  { month: 8,  ret:  0.9 },
  { month: 9,  ret:  0.6 },
  { month: 10, ret:  0.4 },
  { month: 11, ret:  1.0 },
  { month: 12, ret:  0.7 },
]
const fortressMonthly2024: MonthlyReturn[] = [
  { month: 1,  ret:  0.8 },
  { month: 2,  ret:  0.6 },
  { month: 3,  ret:  0.7 },
  { month: 4,  ret:  0.4 },
  { month: 5,  ret:  0.9 },
  { month: 6,  ret:  0.8 },
  { month: 7,  ret:  0.6 },
  { month: 8,  ret:  0.7 },
  { month: 9,  ret:  0.5 },
  { month: 10, ret:  0.8 },
  { month: 11, ret:  1.1 },
  { month: 12, ret:  0.8 },
]
const fortressMonthly2023: MonthlyReturn[] = [
  { month: 1,  ret:  0.7 },
  { month: 2,  ret:  0.5 },
  { month: 3,  ret:  0.6 },
  { month: 4,  ret: -0.3 },
  { month: 5,  ret:  0.8 },
  { month: 6,  ret:  0.7 },
  { month: 7,  ret:  0.6 },
  { month: 8,  ret:  0.8 },
  { month: 9,  ret:  0.5 },
  { month: 10, ret:  0.4 },
  { month: 11, ret:  0.9 },
  { month: 12, ret:  1.0 },
]
const fortressMonthly2022: MonthlyReturn[] = [
  { month: 1,  ret:  0.4 },
  { month: 2,  ret:  0.3 },
  { month: 3,  ret:  0.5 },
  { month: 4,  ret: -0.2 },
  { month: 5,  ret:  0.4 },
  { month: 6,  ret:  0.3 },
  { month: 7,  ret:  0.4 },
  { month: 8,  ret:  0.3 },
  { month: 9,  ret:  0.2 },
  { month: 10, ret:  0.5 },
  { month: 11, ret:  0.6 },
  { month: 12, ret:  0.4 },
]

export const funds: Fund[] = [
  {
    id: 'abrand-fund-i',
    name: 'ABRAND Fund I',
    strategy: 'Long/Short Equity',
    aum: '$1.2M',
    ytd: '+3.2%',
    ytdPositive: true,
    isActive: true,
    metrics: {
      sharpe: 1.84,
      maxDrawdown: -4.2,
      volatility: 8.3,
      inceptionDate: 'Jan 2021',
      inceptionReturn: 68.4,
    },
    annualReturns: [
      { year: 2026, ret: 3.2,  monthly: abrandMonthly2026 },
      { year: 2025, ret: 10.5, monthly: abrandMonthly2025 },
      { year: 2024, ret: 4.2,  monthly: abrandMonthly2024 },
      { year: 2023, ret: 12.1, monthly: abrandMonthly2023 },
      { year: 2022, ret: 5.8,  monthly: abrandMonthly2022 },
      { year: 2021, ret: 18.4, monthly: abrandMonthly2021 },
    ],
    description: [
      'ABRAND Fund I deploys a systematic long-short equity strategy focused on US mid-cap stocks with strong momentum and improving earnings quality. The fund uses a factor-based model combining price momentum, earnings revisions, and balance sheet quality to construct a market-neutral portfolio with a target beta of 0.1–0.3.',
      'Capital is deployed across two books: a long book targeting high-conviction opportunities with 2–4% position sizes, and a short book hedging sector and factor exposures. Gross exposure is maintained between 150% and 200%, with net exposure capped at 30%. The fund rebalances monthly.',
      'Investors deposit USDC onchain and receive ERC4626 vault shares priced at the current NAV. Returns are reflected in NAV appreciation — no distributions. Redemptions are processed within 24 hours of request, with proceeds delivered in USDC or wired to your bank account via Bridge.xyz.',
    ],
  },
  {
    id: 'apex-capital',
    name: 'Apex Capital',
    strategy: 'Quant Macro',
    aum: '$890M',
    ytd: '+6.0%',
    ytdPositive: true,
    isActive: false,
    metrics: {
      sharpe: 2.41,
      maxDrawdown: -8.6,
      volatility: 14.7,
      inceptionDate: 'Mar 2019',
      inceptionReturn: 198.6,
    },
    annualReturns: [
      { year: 2026, ret: 6.0,  monthly: apexMonthly2026 },
      { year: 2025, ret: 21.2, monthly: apexMonthly2025 },
      { year: 2024, ret: 22.1, monthly: apexMonthly2024 },
      { year: 2023, ret: 28.4, monthly: apexMonthly2023 },
      { year: 2022, ret: 14.2, monthly: apexMonthly2022 },
    ],
    description: [
      "Apex Capital runs a quantitative global macro strategy across equities, fixed income, currencies, and commodities. The fund's models analyze cross-asset momentum and mean-reversion signals across 50+ liquid markets, with a strong track record in trending regimes.",
      'Onchain access to Apex Capital is coming soon. Join the waitlist to be notified when deposits open.',
    ],
  },
  {
    id: 'fortress-fund-iii',
    name: 'Fortress Fund III',
    strategy: 'Credit Arbitrage',
    aum: '$340M',
    ytd: '+2.1%',
    ytdPositive: true,
    isActive: false,
    metrics: {
      sharpe: 3.12,
      maxDrawdown: -1.8,
      volatility: 3.2,
      inceptionDate: 'Jun 2020',
      inceptionReturn: 44.8,
    },
    annualReturns: [
      { year: 2026, ret: 2.1,  monthly: fortressMonthly2026 },
      { year: 2025, ret: 7.8,  monthly: fortressMonthly2025 },
      { year: 2024, ret: 8.7,  monthly: fortressMonthly2024 },
      { year: 2023, ret: 7.2,  monthly: fortressMonthly2023 },
      { year: 2022, ret: 4.1,  monthly: fortressMonthly2022 },
    ],
    description: [
      'Fortress Fund III exploits pricing inefficiencies in investment-grade and high-yield credit markets, focusing on basis trades between cash bonds and CDS. The fund targets low-volatility absolute returns with limited market directionality.',
      'Onchain access to Fortress Fund III is coming soon. Join the waitlist to be notified when deposits open.',
    ],
  },
]

export function getFundById(id: string): Fund | undefined {
  return funds.find((f) => f.id === id)
}


// ═══════════════════════════════════════════════════════════════════════════════
// §6  DATA — data/vaults.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/data/vaults.ts

import {
  BASE_SEPOLIA_ID,
  ARC_TESTNET_ID,
  VAULT_ADDRESS_BY_CHAIN,
  USDC_ADDRESS_BY_CHAIN,
  ORACLE_ADDRESS_BY_CHAIN,
  NAV_CONSUMER_ADDRESS_BY_CHAIN,
} from '@/lib/contracts'

export interface VaultConfig {
  fundId: string
  addresses: Record<number, {
    vault: `0x${string}`
    usdc: `0x${string}`
    oracle: `0x${string}`
    navConsumer: `0x${string}`
  }>
}

// For hackathon: single vault mapped to the active fund.
// Add entries here when deploying additional vaults.
export const vaults: VaultConfig[] = [
  {
    fundId: 'abrand-fund-i',
    addresses: {
      [BASE_SEPOLIA_ID]: {
        vault: VAULT_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
        usdc: USDC_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
        oracle: ORACLE_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
        navConsumer: NAV_CONSUMER_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
      },
      [ARC_TESTNET_ID]: {
        vault: VAULT_ADDRESS_BY_CHAIN[ARC_TESTNET_ID],
        usdc: USDC_ADDRESS_BY_CHAIN[ARC_TESTNET_ID],
        oracle: ORACLE_ADDRESS_BY_CHAIN[ARC_TESTNET_ID],
        navConsumer: NAV_CONSUMER_ADDRESS_BY_CHAIN[ARC_TESTNET_ID],
      },
    },
  },
]

export function getVaultConfig(fundId: string): VaultConfig | undefined {
  return vaults.find((v) => v.fundId === fundId)
}

export function getVaultAddresses(fundId: string, chainId: number) {
  const config = getVaultConfig(fundId)
  if (!config) return null
  return config.addresses[chainId] ?? config.addresses[BASE_SEPOLIA_ID] ?? null
}


// ═══════════════════════════════════════════════════════════════════════════════
// §7  HOOKS — hooks/useProtocol.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/hooks/useProtocol.ts

'use client'

import { useReadContracts } from 'wagmi'
import { useAccount } from 'wagmi'
import {
  useContractAddresses,
  ADMIN_ADDRESS,
  INVESTOR_ROLE,
  NAV_UPDATER_ROLE,
  DEFAULT_ADMIN_ROLE,
  fundVaultAbi,
  erc20Abi,
} from '@/lib/contracts'

export function useProtocol(overrides?: { vaultAddress?: `0x${string}`; usdcAddress?: `0x${string}` }) {
  const { address } = useAccount()
  const defaults = useContractAddresses()
  const vaultAddress = overrides?.vaultAddress ?? defaults.vaultAddress
  const usdcAddress = overrides?.usdcAddress ?? defaults.usdcAddress

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      // 0: total USDC in vault
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'totalAssets' },
      // 1: current NAV per share (in USDC units, 1e6 = $1.00)
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'navPerShare' },
      // 2: caller's vault share balance
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'balanceOf', args: [address!] },
      // 3: caller's USDC balance
      { address: usdcAddress, abi: erc20Abi, functionName: 'balanceOf', args: [address!] },
      // 4: is investor (can deposit)
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'hasRole', args: [INVESTOR_ROLE, address!] },
      // 5: is manager (can update NAV + fulfill redemptions)
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'hasRole', args: [NAV_UPDATER_ROLE, address!] },
      // 6: is default admin (can grant/revoke roles)
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, address!] },
      // 7: vault paused state
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'paused' },
      // 8: pending redemption request for caller
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'redemptionRequests', args: [address!] },
      // 9: total share supply (needed to compute max exit cap)
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'totalSupply' },
      // 10: max exit cap in basis points (default 1000 = 10%)
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'maxExitBps' },
    ],
    query: {
      enabled: !!address && !!vaultAddress,
      refetchInterval: 15_000,
    },
  })

  const totalAssets = data?.[0]?.result ?? 0n
  const navPerShare = data?.[1]?.result ?? 1_000_000n // default $1.00
  const shareBalance = data?.[2]?.result ?? 0n
  const usdcBalance = data?.[3]?.result ?? 0n
  const isInvestor = data?.[4]?.result ?? false
  const isManager = data?.[5]?.result ?? false
  const isDefaultAdmin = data?.[6]?.result ?? false
  const isPaused = data?.[7]?.result ?? false

  const pendingRedemption = data?.[8]?.result as
    | readonly [bigint, bigint, bigint]
    | undefined

  const pendingShares = pendingRedemption?.[0] ?? 0n
  const pendingNavAtRequest = pendingRedemption?.[1] ?? 0n
  const pendingRequestedAt = pendingRedemption?.[2] ?? 0n
  const hasPendingRedemption = pendingShares > 0n

  const totalSupply  = (data?.[9]?.result as bigint | undefined) ?? 0n
  const maxExitBps   = (data?.[10]?.result as bigint | undefined) ?? 1000n
  // Max shares an investor can request in a single exit (10% of supply by default)
  const maxExitShares = totalSupply > 0n ? (totalSupply * maxExitBps) / 10000n : 0n

  // Admin = default admin role OR address matches NEXT_PUBLIC_ADMIN_ADDRESS
  const isAdmin =
    isDefaultAdmin ||
    (!!address && !!ADMIN_ADDRESS && address.toLowerCase() === ADMIN_ADDRESS.toLowerCase())

  return {
    address,
    totalAssets,
    navPerShare,
    shareBalance,
    usdcBalance,
    isInvestor,
    isManager,
    isAdmin,
    isPaused,
    hasPendingRedemption,
    pendingShares,
    pendingNavAtRequest,
    pendingRequestedAt,
    totalSupply,
    maxExitBps,
    maxExitShares,
    isLoading: isLoading && !!address,
    refetch,
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// §8  HOOKS — hooks/useDepositFlow.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/hooks/useDepositFlow.ts

'use client'

import { useRef, useState } from 'react'
import { useWriteContract, useConfig } from 'wagmi'
import { useAccount } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { useContractAddresses, erc20Abi, fundVaultAbi, parseUSDC } from '@/lib/contracts'

export type DepositState =
  | 'IDLE'
  | 'APPROVING'
  | 'APPROVE_CONFIRMED'
  | 'DEPOSITING'
  | 'DONE'
  | 'APPROVE_FAILED'
  | 'DEPOSIT_FAILED'

function extractErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Transaction failed.'

  const msg = err.message

  // User rejected in wallet
  if (/user rejected|rejected the request/i.test(msg)) return 'Transaction rejected in wallet.'

  // On-chain revert with string reason
  const revertStr = msg.match(/reverted with reason string '([^']+)'/)
  if (revertStr) return revertStr[1]

  // On-chain revert with following reason
  const revertFollowing = msg.match(/following reason:\s*(.+?)(?:\n|$)/)
  if (revertFollowing) return revertFollowing[1].trim()

  // Execution reverted
  const execReverted = msg.match(/execution reverted(?::\s*(.+))?/)
  if (execReverted) return execReverted[1] ? execReverted[1].trim() : 'Contract reverted.'

  // Fallback: first line, capped at 120 chars
  return msg.split('\n')[0].slice(0, 120)
}

export function useDepositFlow() {
  const { address } = useAccount()
  const { vaultAddress, usdcAddress } = useContractAddresses()
  const config = useConfig()

  const [state, setState] = useState<DepositState>('IDLE')
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>()
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>()

  // Track which step failed so retry only restarts that step
  const phaseRef = useRef<'approval' | 'deposit'>('approval')

  const { writeContractAsync } = useWriteContract()

  async function startDeposit() {
    if (!address) return
    const parsed = parseUSDC(amount)
    if (parsed === 0n) return

    setError(null)

    // --- Step 1: Approve USDC (skip if retrying deposit) ---
    if (phaseRef.current !== 'deposit') {
      phaseRef.current = 'approval'
      try {
        setState('APPROVING')
        const appHash = await writeContractAsync({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress, parsed],
        })
        setApproveTxHash(appHash)
        await waitForTransactionReceipt(config, { hash: appHash })
        setState('APPROVE_CONFIRMED')
      } catch (err) {
        setState('APPROVE_FAILED')
        setError(extractErrorMessage(err))
        return
      }
    }

    // --- Step 2: Deposit into ERC4626 vault ---
    phaseRef.current = 'deposit'
    try {
      setState('DEPOSITING')
      const depHash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'deposit',
        args: [parsed, address],
      })
      setDepositTxHash(depHash)
      await waitForTransactionReceipt(config, { hash: depHash })
      setState('DONE')
    } catch (err) {
      setState('DEPOSIT_FAILED')
      setError(extractErrorMessage(err))
    }
  }

  function reset() {
    setState('IDLE')
    setError(null)
    setAmount('')
    setApproveTxHash(undefined)
    setDepositTxHash(undefined)
    phaseRef.current = 'approval'
  }

  const buttonLabel: Record<DepositState, string> = {
    IDLE:             'Approve & Deposit',
    APPROVING:        'Approving...',
    APPROVE_CONFIRMED:'Approved — depositing...',
    DEPOSITING:       'Depositing...',
    DONE:             'Done',
    APPROVE_FAILED:   'Retry Approval',
    DEPOSIT_FAILED:   'Retry Deposit',
  }

  const isPending = state === 'APPROVING' || state === 'APPROVE_CONFIRMED' || state === 'DEPOSITING'

  return {
    state,
    error,
    amount,
    setAmount,
    startDeposit,
    reset,
    buttonLabel: buttonLabel[state],
    isPending,
    isDone: state === 'DONE',
    approveTxHash,
    depositTxHash,
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// §9  HOOKS — hooks/useRedeemFlow.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/hooks/useRedeemFlow.ts

'use client'

import { useEffect, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useContractAddresses, fundVaultAbi, parseShares } from '@/lib/contracts'

export type RedeemState =
  | 'IDLE'
  | 'REQUESTING'      // tx submitted
  | 'PENDING'         // tx confirmed, waiting for manager to fulfill
  | 'CANCELLING'
  | 'CANCELLED'
  | 'REQUEST_FAILED'

// Extract the human-readable revert reason from a wagmi error string
function cleanError(msg: string | undefined): string | null {
  if (!msg) return null
  const match = msg.match(/Error:\s*(FundVault:[^\\n\n]+)/)
  if (match) return match[1].trim()
  return msg.split('\n')[0].slice(0, 120)
}

export function useRedeemFlow() {
  const { vaultAddress } = useContractAddresses()
  const [state, setState] = useState<RedeemState>('IDLE')
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')

  const {
    writeContract: writeRequest,
    data: requestTxHash,
    error: requestWriteError,
    reset: resetRequest,
  } = useWriteContract()

  const {
    writeContract: writeCancel,
    data: cancelTxHash,
    error: cancelWriteError,
    reset: resetCancel,
  } = useWriteContract()

  const { isSuccess: requestConfirmed, isError: requestReceiptError } =
    useWaitForTransactionReceipt({ hash: requestTxHash })

  const { isSuccess: cancelConfirmed, isError: cancelReceiptError } =
    useWaitForTransactionReceipt({ hash: cancelTxHash })

  useEffect(() => {
    if (requestTxHash) setState('REQUESTING')
  }, [requestTxHash])

  useEffect(() => {
    if (requestConfirmed) setState('PENDING')
  }, [requestConfirmed])

  useEffect(() => {
    if (cancelTxHash) setState('CANCELLING')
  }, [cancelTxHash])

  useEffect(() => {
    if (cancelConfirmed) setState('CANCELLED')
  }, [cancelConfirmed])

  useEffect(() => {
    if (requestWriteError || requestReceiptError) {
      setState('REQUEST_FAILED')
      setError(cleanError(requestWriteError?.message) ?? 'Request failed')
    }
  }, [requestWriteError, requestReceiptError])

  useEffect(() => {
    if (cancelWriteError || cancelReceiptError) {
      setError(cleanError(cancelWriteError?.message) ?? 'Cancel failed')
    }
  }, [cancelWriteError, cancelReceiptError])

  function startRequest() {
    const parsed = parseShares(amount)
    if (parsed === 0n) return
    setError(null)
    resetRequest()
    setState('REQUESTING')
    writeRequest({
      address: vaultAddress,
      abi: fundVaultAbi,
      functionName: 'requestRedeem',
      args: [parsed],
    })
  }

  function cancelRequest() {
    setError(null)
    resetCancel()
    writeCancel({
      address: vaultAddress,
      abi: fundVaultAbi,
      functionName: 'cancelRedemption',
    })
  }

  function reset() {
    setState('IDLE')
    setError(null)
    setAmount('')
    resetRequest()
    resetCancel()
  }

  const isPending = state === 'REQUESTING' || state === 'CANCELLING'
  const isQueued = state === 'PENDING'

  return {
    state,
    error,
    amount,
    setAmount,
    startRequest,
    cancelRequest,
    reset,
    isPending,
    isQueued,
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// §10  HOOKS — hooks/usePortfolio.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/hooks/usePortfolio.ts

'use client'

import { useState, useEffect } from 'react'
import { useReadContract, usePublicClient, useBlockNumber } from 'wagmi'
import { useProtocol } from '@/hooks/useProtocol'
import {
  useContractAddresses,
  fundVaultAbi,
  formatUSDCRaw,
  formatShares,
} from '@/lib/contracts'

export interface DepositEvent {
  blockNumber: bigint
  txHash: string
  assets: bigint       // USDC deposited (6 dec)
  shares: bigint       // vault shares received (18 dec)
  navAtDeposit: bigint // navPerShare at deposit time (6 dec): assets*1e18/shares
  formattedAssets: string
  formattedShares: string
  formattedNav: string
  blockTime: Date | null
}

export function usePortfolio() {
  const protocol = useProtocol()
  const { vaultAddress } = useContractAddresses()
  const publicClient = usePublicClient()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [deposits, setDeposits] = useState<DepositEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  // Current USDC value of the position
  const { data: positionValue } = useReadContract({
    address: vaultAddress,
    abi: fundVaultAbi,
    functionName: 'convertToAssets',
    args: [protocol.shareBalance],
    query: {
      enabled: protocol.shareBalance > 0n && !!vaultAddress && !!protocol.address,
      refetchInterval: 15_000,
    },
  })

  // Total vault shares outstanding (for ownership %)
  const { data: totalSupply } = useReadContract({
    address: vaultAddress,
    abi: fundVaultAbi,
    functionName: 'totalSupply',
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 15_000,
    },
  })

  // Fetch Deposit events from the chain
  useEffect(() => {
    if (!protocol.address || !publicClient || !vaultAddress) return

    let cancelled = false
    setEventsLoading(true)

    ;(async () => {
      try {
        const logs = await publicClient.getLogs({
          address: vaultAddress,
          event: {
            name: 'Deposit',
            type: 'event',
            inputs: [
              { name: 'caller',  type: 'address', indexed: true },
              { name: 'owner',   type: 'address', indexed: true },
              { name: 'assets',  type: 'uint256', indexed: false },
              { name: 'shares',  type: 'uint256', indexed: false },
            ],
          } as const,
          args: { owner: protocol.address },
          fromBlock: 0n,
          toBlock: 'latest',
        })

        if (cancelled) return

        // Resolve block timestamps concurrently (cap at 20 blocks to avoid rate limits)
        const blockNums = [...new Set(logs.map((l) => l.blockNumber).filter(Boolean))]
        const blockTimestamps: Record<string, Date> = {}
        await Promise.all(
          blockNums.slice(0, 20).map(async (bn) => {
            try {
              const block = await publicClient.getBlock({ blockNumber: bn! })
              blockTimestamps[bn!.toString()] = new Date(Number(block.timestamp) * 1000)
            } catch {
              // ignore
            }
          })
        )

        const parsed: DepositEvent[] = logs.map((log) => {
          const assets = (log.args as any).assets as bigint
          const shares = (log.args as any).shares as bigint
          // NAV at deposit = assets (6 dec) * 1e18 / shares (18 dec) → 6 dec
          const navAtDeposit = shares > 0n ? (assets * 10n ** 18n) / shares : 1_000_000n
          return {
            blockNumber: log.blockNumber ?? 0n,
            txHash: log.transactionHash ?? '',
            assets,
            shares,
            navAtDeposit,
            formattedAssets: formatUSDCRaw(assets),
            formattedShares: formatShares(shares),
            formattedNav: `$${(Number(navAtDeposit) / 1e6).toFixed(4)}`,
            blockTime: blockTimestamps[log.blockNumber?.toString() ?? ''] ?? null,
          }
        })

        // Newest first
        parsed.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1))
        setDeposits(parsed)
      } catch (err) {
        console.error('Failed to fetch deposit events', err)
      } finally {
        if (!cancelled) setEventsLoading(false)
      }
    })()

    return () => { cancelled = true }
  // Re-fetch on every new block (or when address/vault changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocol.address, vaultAddress, blockNumber])

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const costBasis = deposits.reduce((acc, d) => acc + d.assets, 0n)
  const currentValue = positionValue ?? 0n
  const pnlAbsolute = currentValue - costBasis          // USDC, 6 dec
  const pnlPercent = costBasis > 0n
    ? (Number(pnlAbsolute) / Number(costBasis)) * 100
    : 0

  const ownershipPct = totalSupply && totalSupply > 0n && protocol.shareBalance > 0n
    ? (Number(protocol.shareBalance) / Number(totalSupply)) * 100
    : 0

  return {
    ...protocol,
    // position
    positionValue: currentValue,
    costBasis,
    pnlAbsolute,
    pnlPercent,
    // vault stats
    totalSupply: totalSupply ?? 0n,
    ownershipPct,
    // history
    deposits,
    eventsLoading,
    // misc
    currentBlock: blockNumber ?? 0n,
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// §11  HOOKS — hooks/useNavProposal.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/hooks/useNavProposal.ts

'use client'

import { useReadContracts, useWriteContract, useConfig } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { parseUnits } from 'viem'
import { useState } from 'react'
import { fundVaultAbi } from '@/lib/contracts'

export function useNavProposal(vaultAddress: `0x${string}`) {
  const config = useConfig()

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'pendingNav' },
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'pendingNavTimestamp' },
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'pendingNavProposer' },
    ],
    query: { enabled: !!vaultAddress, refetchInterval: 10_000 },
  })

  const pendingNav = (data?.[0]?.result ?? 0n) as bigint
  const pendingNavTimestamp = (data?.[1]?.result ?? 0n) as bigint
  const pendingNavProposer = (data?.[2]?.result ?? '0x') as `0x${string}`
  const hasPendingProposal = pendingNav > 0n

  const { writeContractAsync } = useWriteContract()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function propose(navString: string) {
    setError(null)
    setDone(null)
    const parsed = parseFloat(navString)
    if (isNaN(parsed) || parsed <= 0) { setError('Enter a valid NAV (e.g. 1.05)'); return }
    setPending(true)
    try {
      const navUsdc = parseUnits(navString, 6)
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'proposeNAV',
        args: [navUsdc],
      })
      await waitForTransactionReceipt(config, { hash })
      await refetch()
      setDone('NAV proposal submitted. Awaiting auditor approval.')
    } catch (err) {
      setError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setPending(false)
    }
  }

  async function approve() {
    setError(null)
    setDone(null)
    setPending(true)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'approveNAV',
      })
      await waitForTransactionReceipt(config, { hash })
      await refetch()
      setDone('NAV approved and updated on-chain.')
    } catch (err) {
      setError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setPending(false)
    }
  }

  async function reject(reason: string) {
    setError(null)
    setDone(null)
    setPending(true)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'rejectNAV',
        args: [reason],
      })
      await waitForTransactionReceipt(config, { hash })
      await refetch()
      setDone('NAV proposal rejected.')
    } catch (err) {
      setError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setPending(false)
    }
  }

  return {
    pendingNav,
    pendingNavTimestamp,
    pendingNavProposer,
    hasPendingProposal,
    propose,
    approve,
    reject,
    pending,
    error,
    done,
    refetch,
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// §12  HOOKS — hooks/useVaultFees.ts
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/hooks/useVaultFees.ts

'use client'

import { useReadContracts, useWriteContract, useConfig } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { useState } from 'react'
import { fundVaultAbi } from '@/lib/contracts'

export function useVaultFees(vaultAddress: `0x${string}`) {
  const config = useConfig()

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'managementFeeBps' },
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'performanceFeeBps' },
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'feeRecipient' },
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'accruedFees' },
    ],
    query: { enabled: !!vaultAddress, refetchInterval: 15_000 },
  })

  const managementFeeBps = (data?.[0]?.result ?? 0n) as bigint
  const performanceFeeBps = (data?.[1]?.result ?? 0n) as bigint
  const feeRecipient = (data?.[2]?.result ?? '0x') as `0x${string}`
  const accruedFees = (data?.[3]?.result ?? 0n) as bigint

  const { writeContractAsync } = useWriteContract()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setManagementFee(bps: number) {
    setError(null)
    setPending(true)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'setManagementFee',
        args: [BigInt(bps)],
      })
      await waitForTransactionReceipt(config, { hash })
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setPending(false)
    }
  }

  async function setPerformanceFee(bps: number) {
    setError(null)
    setPending(true)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'setPerformanceFee',
        args: [BigInt(bps)],
      })
      await waitForTransactionReceipt(config, { hash })
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setPending(false)
    }
  }

  async function collectFees() {
    setError(null)
    setPending(true)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'collectFees',
      })
      await waitForTransactionReceipt(config, { hash })
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setPending(false)
    }
  }

  return {
    managementFeeBps,
    performanceFeeBps,
    feeRecipient,
    accruedFees,
    setManagementFee,
    setPerformanceFee,
    collectFees,
    pending,
    error,
    refetch,
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// §13  COMPONENTS — components/Navbar.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/components/Navbar.tsx

'use client'

import Link from 'next/link'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { truncateAddress, ARC_TESTNET_ID } from '@/lib/contracts'

export function Navbar() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const onWrongNetwork = isConnected && chainId !== ARC_TESTNET_ID

  return (
    <>
      <header
        role="banner"
        className="w-full h-16 bg-bg border-b border-border flex items-center px-6"
      >
        {/* Logo */}
        <div className="flex-1">
          <Link
            href="/"
            className="text-text font-bold text-lg tracking-tight hover:text-accent transition-colors"
          >
            ABRAND
          </Link>
        </div>

        {/* Right: role nav + wallet */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted hover:text-text transition-colors">
              Markets
            </Link>
            {address && (
              <Link href="/portfolio" className="text-muted hover:text-text transition-colors">
                Portfolio
              </Link>
            )}
            <Link href="/manage/abrand-fund-i" className="text-muted hover:text-text transition-colors">
              Manage
            </Link>
            <Link href="/audit/abrand-fund-i" className="text-muted hover:text-text transition-colors">
              Audit
            </Link>
            <Link href="/admin/abrand-fund-i" className="text-muted hover:text-text transition-colors">
              Admin
            </Link>
          </nav>

          {isConnected ? (
            <button
              onClick={() => disconnect()}
              title={address}
              className="px-3 py-1.5 bg-bg border border-border rounded text-xs font-mono text-text
                hover:border-accent transition-colors
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
            >
              {truncateAddress(address!)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="min-h-[36px] px-4 py-1.5 border border-accent text-accent text-sm font-medium rounded
                hover:bg-accent hover:text-white transition-colors
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Wrong network banner */}
      {onWrongNetwork && (
        <div className="w-full bg-error/10 border-b border-error/30 px-6 py-2 flex items-center justify-between">
          <span className="text-sm text-error">
            Wrong network — please switch to Arc Testnet
          </span>
          <button
            onClick={() => switchChain({ chainId: ARC_TESTNET_ID })}
            className="text-sm text-error border border-error/50 rounded px-3 py-1
              hover:bg-error hover:text-white transition-colors
              focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 focus:ring-offset-bg"
          >
            Switch to Arc
          </button>
        </div>
      )}
    </>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §14  COMPONENTS — components/AmountInput.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/components/AmountInput.tsx

'use client'

interface AmountInputProps {
  label: string
  value: string
  onChange: (v: string) => void
  max?: string
  disabled?: boolean
  symbol?: string
}

export function AmountInput({
  label,
  value,
  onChange,
  max,
  disabled,
  symbol = 'USDC',
}: AmountInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-muted">{label}</label>
      <div className="flex items-center border border-border rounded bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="0.00"
          className="flex-1 bg-transparent px-4 py-3 text-text font-mono tabular-nums outline-none placeholder:text-muted disabled:opacity-50"
        />
        {max !== undefined && !disabled && (
          <button
            type="button"
            onClick={() => onChange(max)}
            className="px-4 py-3 text-xs text-accent hover:text-text transition-colors"
          >
            MAX
          </button>
        )}
        <span className="px-4 py-3 text-sm text-muted border-l border-border">{symbol}</span>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §15  COMPONENTS — components/TxButton.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/components/TxButton.tsx

'use client'

interface TxButtonProps {
  onClick: () => void
  disabled?: boolean
  isPending?: boolean
  children: React.ReactNode
}

export function TxButton({ onClick, disabled, isPending, children }: TxButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isPending}
      aria-busy={isPending}
      className="w-full min-h-[44px] px-4 py-3 bg-accent text-white text-sm font-medium rounded
        hover:bg-red-700 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
    >
      {isPending ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §16  COMPONENTS — components/StepIndicator.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/components/StepIndicator.tsx

interface Step {
  label: string
  done: boolean
  active: boolean
}

export function StepIndicator({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              ${step.done ? 'bg-success text-bg' : step.active ? 'bg-accent text-white' : 'bg-border text-muted'}`}
          >
            {step.done ? '\u2713' : i + 1}
          </div>
          <span className={`text-sm ${step.active ? 'text-text' : 'text-muted'}`}>
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="text-border mx-1">\u2192</span>}
        </div>
      ))}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §17  COMPONENTS — components/PasswordGate.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/components/PasswordGate.tsx

'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'abrand-auth'
const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'abrand2026'

export function PasswordGate({ children, label }: { children: React.ReactNode; label: string }) {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === 'true') {
      setAuthed(true)
    }
  }, [])

  if (authed) return <>{children}</>

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      setAuthed(true)
    } else {
      setError(true)
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-text">{label}</h1>
          <p className="text-sm text-muted">Enter the password to continue.</p>
        </div>

        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Password"
          autoFocus
          className={`w-full bg-surface border rounded px-4 py-3 text-text text-sm outline-none
            placeholder:text-muted transition-colors
            focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg
            ${error ? 'border-error' : 'border-border focus:border-accent'}`}
        />

        {error && (
          <p className="text-sm text-error">Wrong password.</p>
        )}

        <button
          type="submit"
          className="w-full min-h-[44px] px-4 py-3 bg-accent text-white text-sm font-semibold rounded
            hover:bg-red-700 transition-colors
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
        >
          Unlock
        </button>
      </form>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §18  COMPONENTS — components/PerformanceDashboard.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/components/PerformanceDashboard.tsx

'use client'

import { useState } from 'react'
import type { Fund, AnnualRecord } from '@/data/funds'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface Props {
  fund: Fund
}

export function PerformanceDashboard({ fund }: Props) {
  const [selectedYear, setSelectedYear] = useState<number>(fund.annualReturns[0].year)

  const selected = fund.annualReturns.find((r) => r.year === selectedYear)!
  const allRets = fund.annualReturns.map((r) => r.ret)
  const maxAbsAnnual = Math.max(...allRets.map(Math.abs))

  // Cumulative NAV line from monthly returns of selected year
  const nav = navFromMonthly(selected.monthly)

  return (
    <div className="flex flex-col gap-6 border-t border-border pt-8 mt-2">

      {/* ── Key metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border rounded overflow-hidden">
        <Metric label="Since Inception" value={`+${fund.metrics.inceptionReturn}%`} accent />
        <Metric label="Sharpe Ratio" value={fund.metrics.sharpe.toFixed(2)} />
        <Metric label="Ann. Volatility" value={`${fund.metrics.volatility}%`} />
        <Metric label="Max Drawdown" value={`${fund.metrics.maxDrawdown}%`} negative />
        <Metric label="Inception" value={fund.metrics.inceptionDate} />
      </div>

      {/* ── Year tabs + bar chart ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted">Annual Returns</p>
          <div className="flex gap-1">
            {fund.annualReturns.map((r) => (
              <button
                key={r.year}
                onClick={() => setSelectedYear(r.year)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  selectedYear === r.year
                    ? 'bg-accent text-white'
                    : 'border border-border text-muted hover:border-accent hover:text-text'
                }`}
              >
                {r.year}
              </button>
            ))}
          </div>
        </div>

        {/* Annual bar chart */}
        <AnnualBars
          records={fund.annualReturns}
          selected={selectedYear}
          maxAbs={maxAbsAnnual}
          onSelect={setSelectedYear}
        />
      </div>

      {/* ── Monthly grid + NAV line ──────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Monthly return grid */}
        <div className="flex flex-col gap-2 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted">
            Monthly Returns — {selectedYear}
          </p>
          <MonthlyGrid monthly={selected.monthly} />
        </div>

        {/* NAV line chart */}
        <div className="flex flex-col gap-2 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted">
            Cumulative NAV — {selectedYear}
          </p>
          <NavLine nav={nav} />
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Metric({ label, value, accent, negative }: {
  label: string; value: string; accent?: boolean; negative?: boolean
}) {
  return (
    <div className="bg-surface px-4 py-3 flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-lg font-mono tabular-nums font-semibold ${
        accent ? 'text-accent' : negative ? 'text-error' : 'text-text'
      }`}>
        {value}
      </span>
    </div>
  )
}

function AnnualBars({ records, selected, maxAbs, onSelect }: {
  records: AnnualRecord[]
  selected: number
  maxAbs: number
  onSelect: (y: number) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const BAR_MAX_H = 80

  return (
    <div className="bg-surface rounded px-6 py-4">
      <div className="flex items-end justify-center gap-8" style={{ height: 120 }}>
        {records.map((r) => {
          const isSelected = r.year === selected
          const isHov = r.year === hovered
          const h = Math.max(8, (Math.abs(r.ret) / maxAbs) * BAR_MAX_H)
          const positive = r.ret >= 0

          return (
            <button
              key={r.year}
              onClick={() => onSelect(r.year)}
              onMouseEnter={() => setHovered(r.year)}
              onMouseLeave={() => setHovered(null)}
              className="flex flex-col items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-accent rounded"
              style={{ width: 56 }}
              aria-label={`${r.year}: ${r.ret >= 0 ? '+' : ''}${r.ret.toFixed(1)}%`}
            >
              {/* Value label */}
              <span className={`text-xs font-mono tabular-nums transition-opacity ${
                isHov || isSelected ? 'opacity-100' : 'opacity-0'
              } ${positive ? 'text-success' : 'text-error'}`}>
                {r.ret >= 0 ? '+' : ''}{r.ret.toFixed(1)}%
              </span>
              {/* Bar */}
              <div
                style={{ height: h, width: 32 }}
                className={`rounded transition-all ${
                  isSelected
                    ? positive ? 'bg-success' : 'bg-error'
                    : positive ? 'bg-success/30' : 'bg-error/30'
                } ${isHov && !isSelected ? 'brightness-125' : ''}`}
              />
              {/* Year label */}
              <span className={`text-xs font-mono ${isSelected ? 'text-text font-semibold' : 'text-muted'}`}>
                {r.year}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyGrid({ monthly }: { monthly: { month: number; ret: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const maxAbs = Math.max(...monthly.map((m) => Math.abs(m.ret)))

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {monthly.map((m) => {
        const positive = m.ret >= 0
        const intensity = Math.abs(m.ret) / maxAbs
        const isHov = hovered === m.month

        return (
          <div
            key={m.month}
            onMouseEnter={() => setHovered(m.month)}
            onMouseLeave={() => setHovered(null)}
            className="relative flex flex-col items-center justify-center py-3 rounded cursor-default select-none border border-transparent hover:border-border transition-colors"
            style={{
              backgroundColor: positive
                ? `rgba(34, 197, 94, ${0.06 + intensity * 0.2})`
                : `rgba(239, 68, 68, ${0.06 + intensity * 0.2})`,
            }}
          >
            <span className="text-xs text-muted">{MONTHS[m.month - 1]}</span>
            <span className={`text-xs font-mono tabular-nums font-semibold ${
              positive ? 'text-success' : 'text-error'
            }`}>
              {m.ret >= 0 ? '+' : ''}{m.ret.toFixed(1)}%
            </span>

            {/* Hover tooltip with absolute return */}
            {isHov && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface border border-border rounded text-xs text-text whitespace-nowrap z-10">
                {MONTHS[m.month - 1]}: {m.ret >= 0 ? '+' : ''}{m.ret.toFixed(2)}%
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function NavLine({ nav }: { nav: number[] }) {
  const W = 320
  const H = 80
  const PAD = { top: 8, bottom: 20, left: 32, right: 8 }

  const minV = Math.min(...nav)
  const maxV = Math.max(...nav)
  const range = maxV - minV || 1

  const pts = nav.map((v, i) => {
    const x = PAD.left + (i / (nav.length - 1)) * (W - PAD.left - PAD.right)
    const y = PAD.top + ((maxV - v) / range) * (H - PAD.top - PAD.bottom)
    return { x, y, v }
  })

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Fill under the line
  const fillD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${PAD.left.toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`

  const [tooltip, setTooltip] = useState<{ x: number; y: number; v: number; label: string } | null>(null)

  return (
    <div className="bg-surface rounded p-3">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Zero baseline */}
        {(() => {
          const zeroV = 100
          const zy = PTtoY(zeroV, minV, maxV, range, H, PAD)
          return (
            <line
              x1={PAD.left} y1={zy}
              x2={W - PAD.right} y2={zy}
              stroke="#222222" strokeWidth="1"
            />
          )
        })()}

        {/* Y axis labels */}
        <text x={0} y={PAD.top + 4} fill="#9CA3AF" fontSize="9" textAnchor="start">
          {maxV.toFixed(1)}
        </text>
        <text x={0} y={H - PAD.bottom - 2} fill="#9CA3AF" fontSize="9" textAnchor="start">
          {minV.toFixed(1)}
        </text>

        {/* X axis month labels */}
        {[0, 3, 6, 9, 11].map((i) => (
          <text
            key={i}
            x={PAD.left + (i / 11) * (W - PAD.left - PAD.right)}
            y={H - 4}
            fill="#9CA3AF"
            fontSize="9"
            textAnchor="middle"
          >
            {MONTHS[i]}
          </text>
        ))}

        {/* Fill */}
        <path d={fillD} fill="#DC2626" fillOpacity="0.06" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Hover dots */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill="transparent"
            onMouseEnter={() =>
              setTooltip({ x: p.x, y: p.y, v: p.v, label: MONTHS[i] })
            }
          />
        ))}

        {/* Active dot + tooltip */}
        {tooltip && (
          <>
            <circle cx={tooltip.x} cy={tooltip.y} r={3} fill="#DC2626" />
            <rect
              x={Math.min(tooltip.x - 22, W - 56)}
              y={tooltip.y - 22}
              width={50}
              height={16}
              rx={2}
              fill="#111111"
              stroke="#222222"
            />
            <text
              x={Math.min(tooltip.x - 22, W - 56) + 25}
              y={tooltip.y - 10}
              fill="#FFFFFF"
              fontSize="9"
              textAnchor="middle"
            >
              {tooltip.label} {tooltip.v.toFixed(2)}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function PTtoY(v: number, minV: number, maxV: number, range: number, H: number, PAD: { top: number; bottom: number }) {
  return PAD.top + ((maxV - v) / range) * (H - PAD.top - PAD.bottom)
}

/** Convert monthly % returns into cumulative NAV starting at 100 */
function navFromMonthly(monthly: { month: number; ret: number }[]): number[] {
  const sorted = [...monthly].sort((a, b) => a.month - b.month)
  const nav: number[] = [100]
  sorted.forEach((m) => {
    nav.push(nav[nav.length - 1] * (1 + m.ret / 100))
  })
  return nav
}


// ═══════════════════════════════════════════════════════════════════════════════
// §19  COMPONENTS — components/OracleDashboard.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/components/OracleDashboard.tsx

'use client'

import { useReadContracts } from 'wagmi'
import { useContractAddresses, navOracleAbi, fundVaultAbi, formatNAV } from '@/lib/contracts'

interface Props {
  navPerShare?: bigint
}

export function OracleDashboard({ navPerShare }: Props) {
  const { oracleAddress, vaultAddress } = useContractAddresses()

  const { data } = useReadContracts({
    contracts: [
      // 0: last nonce (counts how many signed NAV updates have been accepted)
      { address: oracleAddress, abi: navOracleAbi, functionName: 'lastNonce' },
      // 1: last time NAV was updated on the vault
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'navUpdatedAt' },
    ],
    query: { enabled: !!oracleAddress && !!vaultAddress, refetchInterval: 15_000 },
  })

  const lastNonce    = (data?.[0]?.result as bigint | undefined) ?? 0n
  const navUpdatedAt = (data?.[1]?.result as bigint | undefined) ?? 0n

  const nowSec  = BigInt(Math.floor(Date.now() / 1000))
  const ageSec  = navUpdatedAt > 0n && nowSec > navUpdatedAt ? Number(nowSec - navUpdatedAt) : null
  const ageLabel = ageSec === null ? '\u2014'
    : ageSec < 60   ? `${ageSec}s ago`
    : ageSec < 3600 ? `${Math.floor(ageSec / 60)}m ago`
    : `${Math.floor(ageSec / 3600)}h ago`

  // Countdown to next heartbeat (1h from last update)
  const HEARTBEAT_S = 3600
  const nextSec     = ageSec !== null ? Math.max(0, HEARTBEAT_S - ageSec) : HEARTBEAT_S
  const mm = String(Math.floor(nextSec / 60)).padStart(2, '0')
  const ss = String(nextSec % 60).padStart(2, '0')

  const displayNAV = navPerShare ? formatNAV(navPerShare) : '\u2014'

  return (
    <div className="border-t border-border pt-8 mt-2 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted">NAV Oracle</p>
        <span className="px-2 py-0.5 text-xs border border-accent/40 text-accent rounded font-mono">
          EIP-712 \u00b7 Chainlink Functions
        </span>
      </div>

      {/* Current answer + stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded overflow-hidden">
        {/* Current NAV */}
        <div className="bg-surface px-5 py-4 flex flex-col gap-1 sm:col-span-1">
          <span className="text-xs text-muted uppercase tracking-wider">Current Answer</span>
          <span className="text-3xl font-mono tabular-nums font-bold text-text">
            {displayNAV}
          </span>
          <span className="text-xs text-muted">NAV per share \u00b7 {ageLabel}</span>
        </div>

        {/* Update count */}
        <div className="bg-surface px-5 py-4 flex flex-col gap-3">
          <span className="text-xs text-muted uppercase tracking-wider">Signed Updates</span>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Accepted nonces</span>
              <span className="text-xs font-mono text-text">{lastNonce.toString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Heartbeat</span>
              <span className="text-xs font-mono text-text">1h</span>
            </div>
          </div>
        </div>

        {/* Next update countdown */}
        <div className="bg-surface px-5 py-4 flex flex-col gap-1">
          <span className="text-xs text-muted uppercase tracking-wider">Next Heartbeat</span>
          <span className="text-2xl font-mono tabular-nums font-bold text-accent">
            {ageSec !== null ? `${mm}:${ss}` : '\u2014'}
          </span>
          <span className="text-xs text-muted">Last updated {ageLabel}</span>
        </div>
      </div>

      {/* How it works */}
      <div className="border-l-2 border-accent/30 pl-4 flex flex-col gap-1">
        <p className="text-xs text-muted leading-relaxed">
          NAV is computed off-chain by a licensed auditor and signed via{' '}
          <span className="text-text font-medium">EIP-712</span>. On Base Sepolia,
          Chainlink Functions fetches and verifies the signature automatically each hour.
          On Arc, the admin submits signed payloads directly via{' '}
          <span className="text-text font-medium">submitSignedNAV</span> using the
          same auditor signature — the vault price updates either way.
        </p>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §20  PAGES — app/layout.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/layout.tsx

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { DynamicProviders } from '@/components/DynamicProviders'
import { Navbar } from '@/components/Navbar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ABRAND',
  description: 'Institutional liquidity, onchain.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-bg text-text flex flex-col">
        <DynamicProviders>
          <Navbar />
          <main role="main" className="flex-1">
            {children}
          </main>
        </DynamicProviders>
      </body>
    </html>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §21  PAGES — app/page.tsx  (Home / Fund Marketplace)
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/page.tsx

'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { funds } from '@/data/funds'
import { useProtocol } from '@/hooks/useProtocol'
import { formatUSDC } from '@/lib/contracts'

// ── Mini sparkline SVG ───────────────────────────────────────────────────────
const SPARKLINES: Record<string, string> = {
  'abrand-fund-i':     'M0,20 L10,18 L20,22 L30,16 L40,14 L50,18 L60,12 L70,14 L80,10',
  'apex-capital':      'M0,22 L10,16 L20,12 L30,8  L40,14 L50,6  L60,4  L70,8  L80,4',
  'fortress-fund-iii': 'M0,18 L10,17 L20,16 L30,17 L40,15 L50,16 L60,14 L70,15 L80,13',
}

export default function Home() {
  const { totalAssets, isLoading } = useProtocol()
  const fundsRef = useRef<HTMLDivElement>(null)
  const [showAllFunds, setShowAllFunds] = useState(true)

  const heroFund      = funds.find((f) => f.id === 'abrand-fund-i')!
  const bestFund      = [...funds].sort((a, b) => b.metrics.inceptionReturn - a.metrics.inceptionReturn)[0]
  const highestSharpe = [...funds].sort((a, b) => b.metrics.sharpe - a.metrics.sharpe)[0]
  const activeFunds   = funds.filter((f) => f.isActive)
  const displayedFunds = showAllFunds ? funds : activeFunds

  const liveAum = totalAssets > 0n && !isLoading
    ? formatUSDC(totalAssets)
    : '$2.4M'

  return (
    <div className="flex flex-col">

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[min(80vh,720px)] flex items-center overflow-hidden scanlines red-rule"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 65% 35%, rgba(220,38,38,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 20% 80%, rgba(220,38,38,0.03) 0%, transparent 50%), #0A0A0A',
        }}
      >
        {/* Grid background — offset for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            backgroundPosition: '24px 24px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 60% 40%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 60% 40%, black, transparent)',
          }}
        />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: copy ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-8">

            {/* Badge */}
            <div className="flex items-center gap-3 animate-fade-up">
              <div
                className="h-px w-8"
                style={{ background: 'linear-gradient(90deg, #DC2626, transparent)' }}
              />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-accent">
                Fund Marketplace \u00b7 Onchain
              </span>
            </div>

            {/* Headline */}
            <div className="flex flex-col gap-2 animate-fade-up-d1">
              <h1
                className="text-6xl lg:text-7xl font-bold tracking-tight leading-[1.0] text-text"
                style={{ fontFeatureSettings: '"ss01"' }}
              >
                Hedge funds.
              </h1>
              <h1
                className="text-6xl lg:text-7xl font-bold tracking-tight leading-[1.0] text-accent"
                style={{ fontFeatureSettings: '"ss01"' }}
              >
                For everyone.
              </h1>
            </div>

            {/* Sub */}
            <p className="text-lg text-muted max-w-md leading-relaxed animate-fade-up-d2">
              Browse institutional-grade strategies, review track records, and invest onchain in seconds.
              No prime broker. No minimums. No lockups.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-4 animate-fade-up-d3">
              <button
                onClick={() => fundsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-3 bg-accent text-white text-sm font-semibold rounded hover:bg-red-700 transition-all btn-glow"
              >
                Browse Funds
              </button>
              <Link
                href="#how-it-works"
                className="px-6 py-3 border border-border text-text text-sm font-semibold rounded hover:border-accent hover:text-accent transition-colors"
              >
                How it works
              </Link>
            </div>

            {/* Trust line */}
            <div className="flex items-center gap-3 text-xs text-muted animate-fade-up-d4">
              <span>Built on</span>
              <span className="text-text font-medium">Base</span>
              <span className="text-border">\u00b7</span>
              <span className="text-text font-medium">Chainlink</span>
              <span className="text-border">\u00b7</span>
              <span className="text-text font-medium">Bridge.xyz</span>
            </div>
          </div>

          {/* ── Right: hero card ───────────────────────────────────────────── */}
          <div className="hidden lg:flex justify-center items-center animate-fade-in">
            <div className="relative">

              {/* Glow behind card */}
              <div
                className="absolute inset-0 rounded blur-3xl opacity-30 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.4), transparent 70%)' }}
              />

              {/* Card */}
              <div
                className="relative rounded p-6 flex flex-col gap-5 w-80 animate-float hero-card"
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted uppercase tracking-wider font-mono">{heroFund.name}</span>
                    <span className="text-text font-semibold text-sm">{heroFund.strategy}</span>
                  </div>
                  <span
                    className="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded font-mono font-semibold"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    LIVE
                  </span>
                </div>

                {/* Big return number */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted uppercase tracking-wider font-mono">Since Inception</span>
                  <span className="text-5xl font-bold font-mono tabular-nums text-success">
                    +{heroFund.metrics.inceptionReturn}%
                  </span>
                  <span className="text-xs text-muted font-mono">{heroFund.metrics.inceptionDate} \u2014 Present</span>
                </div>

                {/* Sparkline */}
                <svg width="100%" height="40" viewBox="0 0 240 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,35 L30,30 L60,32 L90,20 L120,22 L150,12 L180,16 L210,8 L240,4"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0,35 L30,30 L60,32 L90,20 L120,22 L150,12 L180,16 L210,8 L240,4 L240,40 L0,40 Z"
                    fill="url(#sparkGrad)"
                  />
                </svg>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted font-mono">Sharpe</span>
                    <span className="text-text text-sm font-mono font-semibold">
                      {heroFund.metrics.sharpe.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted font-mono">Max DD</span>
                    <span className="text-error text-sm font-mono font-semibold">
                      {heroFund.metrics.maxDrawdown}%
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted font-mono">YTD</span>
                    <span className="text-success text-sm font-mono font-semibold">
                      {heroFund.ytd}
                    </span>
                  </div>
                </div>

                {/* Invest button */}
                <Link
                  href="/funds/abrand-fund-i"
                  className="w-full text-center py-2.5 text-sm font-semibold rounded text-white transition-colors"
                  style={{ background: '#DC2626' }}
                >
                  Invest Now \u2192
                </Link>
              </div>

              {/* Floating stat pill */}
              <div
                className="absolute -top-4 -right-4 px-3 py-2 rounded text-xs font-mono animate-float-d1"
                style={{
                  background: 'rgba(17,17,17,0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                <span className="text-muted">Min ticket </span>
                <span className="text-success font-semibold">$0</span>
              </div>

              {/* Floating bottom pill */}
              <div
                className="absolute -bottom-4 -left-4 px-3 py-2 rounded text-xs font-mono animate-float-d2"
                style={{
                  background: 'rgba(17,17,17,0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                <span className="text-muted">Lockup </span>
                <span className="text-text font-semibold">None</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 md:divide-x md:divide-border">
          <Stat label="Live AUM" value={liveAum} sub="across active funds" />
          <Stat label="Best return" value={`+${bestFund.metrics.inceptionReturn}%`} sub="since inception" accent />
          <Stat label="Highest Sharpe" value={highestSharpe.metrics.sharpe.toFixed(2)} sub={highestSharpe.name} />
          <Stat label="Min. investment" value="$0" sub="no accreditation needed" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FUND TABLE
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={fundsRef} className="max-w-6xl mx-auto w-full px-6 py-16 flex flex-col gap-6">

        {/* Section header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-px h-4 bg-accent" />
            <span className="text-xs font-mono uppercase tracking-wider text-muted">Live Funds</span>
          </div>
          <h2 className="text-2xl font-bold text-text tracking-tight">Available Strategies</h2>
          <p className="text-sm text-muted">
            Institutional funds, open to all. Review the strategy, then invest onchain.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-6 border-b border-border">
          <button
            onClick={() => setShowAllFunds(true)}
            className={`pb-3 text-sm -mb-px font-medium transition-colors ${showAllFunds ? 'text-text border-b-2 border-accent' : 'text-muted hover:text-text'}`}
          >
            All Funds
          </button>
          <button
            onClick={() => setShowAllFunds(false)}
            className={`pb-3 text-sm -mb-px font-medium transition-colors ${!showAllFunds ? 'text-text border-b-2 border-accent' : 'text-muted hover:text-text'}`}
          >
            Active ({activeFunds.length})
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm" role="table" aria-label="Available funds">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal w-[220px]">Fund</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal">Strategy</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal text-right">AUM</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal text-right">YTD</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal text-right hidden md:table-cell">Sharpe</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal text-right hidden lg:table-cell">Max DD</th>
                <th className="pb-3 w-24 text-xs uppercase tracking-wider text-muted font-normal text-center hidden sm:table-cell">Chart</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-muted font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedFunds.map((fund) => {
                const liveAumForFund =
                  fund.isActive && totalAssets > 0n && !isLoading
                    ? formatUSDC(totalAssets)
                    : null

                return (
                  <FundRow
                    key={fund.id}
                    id={fund.id}
                    name={fund.name}
                    strategy={fund.strategy}
                    aum={liveAumForFund ?? fund.aum}
                    ytd={fund.ytd}
                    ytdPositive={fund.ytdPositive}
                    sharpe={fund.metrics.sharpe}
                    maxDrawdown={fund.metrics.maxDrawdown}
                    isActive={fund.isActive}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative border-t border-border red-rule" style={{ background: '#0D0D0D' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col gap-12">

          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted">How it works</span>
            <h2 className="text-3xl font-bold text-text tracking-tight">Invest in 3 steps.</h2>
          </div>

          {/* Horizontal step strip */}
          <div className="grid grid-cols-1 md:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Browse & Research',
                body: 'Explore listed funds with full strategy docs, track records, Sharpe ratios, and drawdown analysis.',
              },
              {
                n: '02',
                title: 'Connect & Approve',
                body: 'Connect your wallet. Approve USDC spending \u2014 one transaction, no paperwork, no prime broker.',
              },
              {
                n: '03',
                title: 'Invest & Exit',
                body: 'Deposit USDC. Receive NAV-priced ERC4626 shares. Redeem anytime \u2014 funds wired via Bridge.xyz.',
              },
            ].map(({ n, title, body }, i) => (
              <div key={n} className="flex flex-col gap-4 border-t-2 border-border pt-6 pr-8 pb-6 md:border-t-0 md:border-l-2 md:pl-8 md:pr-0 first:border-l-0 first:pl-0">
                <span className="text-5xl font-bold font-mono tabular-nums text-accent leading-none" style={{ textShadow: '0 0 30px rgba(220,38,38,0.2)' }}>{n}</span>
                <div className="flex flex-col gap-2">
                  <h3 className="text-text font-semibold">{title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          VERSUS TABLE
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col gap-10">

          <div className="flex flex-col gap-2 max-w-lg">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-px h-4 bg-accent" />
              <span className="text-xs font-mono uppercase tracking-wider text-muted">Why ABRAND</span>
            </div>
            <h2 className="text-3xl font-bold text-text tracking-tight">
              The prime broker is dead.
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs uppercase tracking-wider text-muted font-normal w-1/3">Feature</th>
                  <th className="pb-3 text-center text-xs uppercase tracking-wider text-muted font-normal">Traditional</th>
                  <th className="pb-3 text-center text-xs uppercase tracking-wider text-accent font-semibold">ABRAND</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Minimum ticket',     '$1M+',        '$0'],
                  ['KYC / paperwork',    '4\u20138 weeks',   'Wallet connect'],
                  ['Lockup period',      '1\u20133 years',   'None'],
                  ['Settlement',         'T+30 wire',   'Instant onchain'],
                  ['Transparency',       'Quarterly PDF','Live NAV onchain'],
                  ['Access',             'Accredited only', 'Global, permissionless'],
                ].map(([feature, traditional, abrand]) => (
                  <tr key={feature} className="border-b border-border hover:bg-surface transition-colors">
                    <td className="py-4 text-muted">{feature}</td>
                    <td className="py-4 text-center text-muted font-mono">{traditional}</td>
                    <td className="py-4 text-center font-mono font-semibold text-accent versus-win">{abrand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          BUILT ON
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-border overflow-hidden" style={{ background: '#080808' }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted text-center mb-12">
            Built on
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-10">
            {/* Arc */}
            <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-text transition-colors" />
                <path d="M20 12L28 16.5V25.5L20 30L12 25.5V16.5L20 12Z" fill="currentColor" className="text-muted group-hover:text-accent transition-colors" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">Arc</span>
                <span className="text-[10px] font-mono text-muted">Settlement Layer</span>
              </div>
            </a>

            {/* Chainlink */}
            <a href="https://chain.link" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <path d="M20 4L33 12V28L20 36L7 28V12L20 4Z" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-[#375BD2] transition-colors" />
                <path d="M20 12L27 16V24L20 28L13 24V16L20 12Z" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-[#375BD2] transition-colors" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">Chainlink</span>
                <span className="text-[10px] font-mono text-muted">NAV Oracle</span>
              </div>
            </a>

            {/* Hedera */}
            <a href="https://hedera.com" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <rect x="8" y="8" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-text transition-colors" />
                <path d="M14 14V26M26 14V26M14 20H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted group-hover:text-text transition-colors" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">Hedera</span>
                <span className="text-[10px] font-mono text-muted">Consensus</span>
              </div>
            </a>

            {/* Bridge.xyz */}
            <div className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <path d="M6 26C6 26 13 18 20 18C27 18 34 26 34 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted group-hover:text-success transition-colors" />
                <circle cx="10" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-success transition-colors" />
                <circle cx="30" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-success transition-colors" />
                <line x1="10" y1="17" x2="10" y2="23" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-success transition-colors" />
                <line x1="30" y1="17" x2="30" y2="23" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-success transition-colors" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">Bridge.xyz</span>
                <span className="text-[10px] font-mono text-muted">USD Off-ramp</span>
              </div>
            </div>

            {/* ERC-4626 */}
            <div className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <path d="M20 4L36 20L20 36L4 20L20 4Z" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-[#627EEA] transition-colors" />
                <path d="M20 12L28 20L20 28L12 20L20 12Z" stroke="currentColor" strokeWidth="1" className="text-muted group-hover:text-[#627EEA] transition-colors" opacity="0.5" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">ERC-4626</span>
                <span className="text-[10px] font-mono text-muted">Vault Standard</span>
              </div>
            </div>
          </div>

          {/* Separator line */}
          <div className="mt-14 flex justify-center">
            <div className="h-px w-32" style={{ background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.3), transparent)' }} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative border-t border-border overflow-hidden scanlines"
        style={{
          background: 'radial-gradient(ellipse 50% 70% at 50% 90%, rgba(220,38,38,0.12) 0%, transparent 60%), #0A0A0A',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-28 flex flex-col items-center gap-8 text-center">
          <h2 className="text-5xl font-bold text-text tracking-tight leading-tight max-w-xl">
            Stop watching hedge funds win.
            <br />
            <span className="text-accent" style={{ textShadow: '0 0 40px rgba(220,38,38,0.3)' }}>Start participating.</span>
          </h2>
          <p className="text-muted text-lg max-w-md leading-relaxed">
            The same strategies used by the world's best managers.
            Now accessible to everyone, onchain.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fundsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3 bg-accent text-white font-semibold rounded hover:bg-red-700 transition-all btn-glow"
            >
              Browse Funds
            </button>
            <Link
              href="/funds/abrand-fund-i"
              className="px-8 py-3 border border-border text-text font-semibold rounded hover:border-accent hover:text-accent transition-colors"
            >
              View ABRAND Fund I
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-muted font-mono">
          <span>ABRAND \u00a9 2026 \u00b7 ETHGlobal Cannes</span>
          <div className="flex items-center gap-6">
            <span>Built on Arc Testnet</span>
            <span>ERC-4626</span>
          </div>
        </div>
      </footer>

    </div>
  )
}

// ── Stat ─────────────────────────────────────────────────────────────────────

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 md:pl-6 first:pl-0">
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted font-mono">{label}</span>
      <span className={`text-2xl font-bold font-mono tabular-nums ${accent ? 'text-accent stat-value' : 'text-text'}`}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  )
}


// ── FundRow ───────────────────────────────────────────────────────────────────

interface FundRowProps {
  id: string; name: string; strategy: string; aum: string
  ytd: string; ytdPositive: boolean; sharpe: number
  maxDrawdown: number; isActive: boolean
}

function FundRow({ id, name, strategy, aum, ytd, ytdPositive, sharpe, maxDrawdown, isActive }: FundRowProps) {
  const sparkPath = SPARKLINES[id]

  return (
    <tr className={`border-b border-border transition-all duration-150 ${isActive ? 'group hover:bg-surface/80 cursor-pointer fund-row-active' : 'opacity-30'}`}>
      <td className="py-4 pr-6">
        {isActive ? (
          <Link href={`/funds/${id}`} className="font-semibold text-text group-hover:text-accent transition-colors">
            {name}
          </Link>
        ) : (
          <span className="font-semibold text-text">{name}</span>
        )}
      </td>
      <td className="py-4 pr-6">
        <span className="px-2 py-0.5 text-xs border border-border text-muted rounded">
          {strategy}
        </span>
      </td>
      <td className="py-4 pr-6 font-mono tabular-nums text-text text-right">{aum}</td>
      <td className={`py-4 pr-6 font-mono tabular-nums font-semibold text-right ${ytdPositive ? 'text-success' : 'text-error'}`}>
        {ytd}
      </td>
      <td className="py-4 pr-6 font-mono tabular-nums text-text text-right hidden md:table-cell">
        {sharpe.toFixed(2)}
      </td>
      <td className="py-4 pr-6 font-mono tabular-nums text-error text-right hidden lg:table-cell">
        {maxDrawdown}%
      </td>
      <td className="py-4 pr-6 hidden sm:table-cell">
        <svg width="80" height="28" viewBox="0 0 80 28" className="overflow-visible">
          {sparkPath && (
            <path
              d={sparkPath}
              fill="none"
              stroke={ytdPositive ? '#22C55E' : '#EF4444'}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </svg>
      </td>
      <td className="py-4 text-right">
        {isActive ? (
          <Link
            href={`/funds/${id}`}
            className="inline-flex items-center px-4 py-1.5 text-xs font-medium border border-accent text-accent rounded hover:bg-accent hover:text-white transition-colors"
          >
            Invest
          </Link>
        ) : (
          <span className="inline-flex items-center px-4 py-1.5 text-xs border border-border text-muted rounded">
            Soon
          </span>
        )}
      </td>
    </tr>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §22  PAGES — app/funds/[id]/page.tsx  (Fund Detail + Deposit)
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/funds/[id]/page.tsx

'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useReadContract } from 'wagmi'
import { useProtocol } from '@/hooks/useProtocol'
import { useDepositFlow } from '@/hooks/useDepositFlow'
import { useAccount, useConnect } from 'wagmi'
import { AmountInput } from '@/components/AmountInput'
import { TxButton } from '@/components/TxButton'
import { StepIndicator } from '@/components/StepIndicator'
import { PerformanceDashboard } from '@/components/PerformanceDashboard'
import { OracleDashboard } from '@/components/OracleDashboard'
import { getFundById } from '@/data/funds'
import {
  formatUSDCRaw,
  formatShares,
  formatNAV,
  parseUSDC,
  fundVaultAbi,
  useContractAddresses,
} from '@/lib/contracts'

export default function FundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const fund = getFundById(id)

  if (!fund) notFound()

  return <FundDetail fund={fund} />
}

function FundDetail({ fund }: { fund: NonNullable<ReturnType<typeof getFundById>> }) {
  const { address, usdcBalance, shareBalance, navPerShare, isInvestor, isLoading, refetch } =
    useProtocol()
  const { connect, connectors } = useConnect()
  const { isConnected } = useAccount()
  const flow = useDepositFlow()
  const { vaultAddress } = useContractAddresses()

  const parsedAmount = parseUSDC(flow.amount)
  const { data: sharesPreview } = useReadContract({
    address: vaultAddress,
    abi: fundVaultAbi,
    functionName: 'convertToShares',
    args: [parsedAmount],
    query: { enabled: parsedAmount > 0n && !!vaultAddress && !!address },
  })

  const maxAmount = formatUSDCRaw(usdcBalance)
  const canDeposit = parsedAmount > 0n && parsedAmount <= usdcBalance
  const isDone = flow.state === 'DONE'

  return (
    <div className="min-h-[calc(100vh-64px)] px-6 py-10 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-8"
      >
        \u2190 All Funds
      </Link>

      {/* Fund header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold text-text">{fund.name}</h1>
          {!fund.isActive && (
            <span className="px-2 py-0.5 text-xs border border-muted text-muted rounded">
              Coming Soon
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="px-2 py-0.5 text-xs border border-border text-muted rounded">
            {fund.strategy}
          </span>
          <span className="text-sm font-mono tabular-nums text-muted">
            AUM <span className="text-text">{fund.aum}</span>
          </span>
          <span className={`text-sm font-mono tabular-nums ${fund.ytdPositive ? 'text-success' : 'text-error'}`}>
            YTD {fund.ytd}
          </span>
        </div>
      </div>

      {/* Two-column layout: strategy + deposit */}
      <div className="flex flex-col-reverse lg:flex-row gap-8 mb-10">
        {/* Left: Strategy docs (60%) */}
        <section
          aria-label="Strategy overview"
          className="lg:w-[60%] flex flex-col gap-4"
        >
          <p className="text-xs uppercase tracking-wider text-muted">Strategy Overview</p>
          <div className="border-l-2 border-accent bg-surface p-6 rounded-sm">
            {fund.description.map((para, i) => (
              <p key={i} className={`text-sm text-muted leading-relaxed ${i > 0 ? 'mt-4' : ''}`}>
                {para}
              </p>
            ))}
          </div>
        </section>

        {/* Right: Deposit form (40%) */}
        <section
          aria-label="Deposit form"
          className="lg:w-[40%] lg:max-w-[480px]"
        >
          {!fund.isActive ? (
            <div className="border border-border rounded-sm p-6 bg-surface">
              <p className="text-sm text-muted">
                This fund is not yet open for deposits. Check back soon.
              </p>
            </div>
          ) : !isConnected ? (
            /* Not connected */
            <div className="border border-border rounded-sm p-6 bg-surface flex flex-col gap-4">
              <p className="text-sm text-text font-medium">Connect your wallet to invest</p>
              <p className="text-xs text-muted">
                Connect to see your USDC balance and deposit into {fund.name}.
              </p>
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full min-h-[44px] px-4 py-3 bg-accent text-white text-sm font-medium rounded
                  hover:bg-red-700 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
              >
                Connect Wallet
              </button>
              <p className="text-xs text-muted text-center">
                Read-only until you approve. No transaction without your confirmation.
              </p>
            </div>
          ) : (
            /* Connected + whitelisted */
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col gap-5"
            >
              {/* Balances */}
              <div className="flex justify-between text-sm">
                <span className="text-muted">
                  USDC:{' '}
                  <span className="font-mono text-text tabular-nums">
                    {isLoading ? '...' : formatUSDCRaw(usdcBalance)}
                  </span>
                </span>
                <span className="text-muted">
                  Shares:{' '}
                  <span
                    className={`font-mono tabular-nums transition-colors duration-500 ${
                      isDone ? 'text-success' : 'text-text'
                    }`}
                  >
                    {isLoading ? '...' : formatShares(shareBalance)}
                  </span>
                </span>
              </div>

              {/* NAV */}
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>Current NAV</span>
                <span className="font-mono text-text tabular-nums">{formatNAV(navPerShare)}</span>
                <span>/ share</span>
              </div>

              {/* Amount input */}
              <AmountInput
                label="USDC amount"
                value={flow.amount}
                onChange={flow.setAmount}
                max={maxAmount}
                disabled={flow.isPending || isDone}
              />

              {/* Share preview */}
              {sharesPreview !== undefined && parsedAmount > 0n && (
                <p className="text-sm text-muted">
                  You will receive{' '}
                  <span className="font-mono text-text tabular-nums">
                    {formatShares(sharesPreview)}
                  </span>{' '}
                  shares at NAV {formatNAV(navPerShare)}
                </p>
              )}

              {/* Trust copy */}
              <p className="text-xs text-muted leading-relaxed">
                Shares are ERC4626 vault tokens representing a proportional claim on the fund. NAV
                appreciates as the fund generates returns.
              </p>

              {/* Step indicator */}
              <StepIndicator
                steps={[
                  {
                    label: 'Approve USDC',
                    done: ['APPROVE_CONFIRMED', 'DEPOSITING', 'DONE'].includes(flow.state),
                    active: ['IDLE', 'APPROVING', 'APPROVE_FAILED'].includes(flow.state),
                  },
                  {
                    label: 'Deposit',
                    done: flow.state === 'DONE',
                    active: ['APPROVE_CONFIRMED', 'DEPOSITING', 'DEPOSIT_FAILED'].includes(flow.state),
                  },
                ]}
              />
              <p className="text-xs text-muted">
                Two transactions \u2014 approve USDC, then deposit into vault.
              </p>

              {/* Error */}
              {flow.error && (
                <p role="alert" className="text-sm text-error">
                  {flow.error}
                </p>
              )}

              {/* TX status */}
              <output aria-live="polite" role="status" className="text-sm">
                {isDone && (
                  <span className="text-success">
                    Deposit confirmed. You now hold {formatShares(shareBalance)} shares.
                  </span>
                )}
              </output>

              {isDone ? (
                <button
                  type="button"
                  onClick={() => {
                    flow.reset()
                    refetch()
                  }}
                  className="w-full min-h-[44px] px-4 py-3 border border-accent text-accent text-sm rounded
                    hover:bg-accent hover:text-white transition-colors
                    focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
                >
                  Deposit more
                </button>
              ) : (
                <TxButton onClick={flow.startDeposit} disabled={!canDeposit} isPending={flow.isPending}>
                  {flow.buttonLabel}
                </TxButton>
              )}
            </form>
          )}
        </section>
      </div>

      {/* Performance dashboard */}
      <PerformanceDashboard fund={fund} />

      {/* NAV Oracle section (active funds only) */}
      {fund.isActive && <OracleDashboard navPerShare={navPerShare} />}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §23  PAGES — app/portfolio/page.tsx  (Portfolio Overview)
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/portfolio/page.tsx

'use client'

import Link from 'next/link'
import { useConnect, useAccount } from 'wagmi'
import { usePortfolio } from '@/hooks/usePortfolio'
import { funds } from '@/data/funds'
import { formatUSDCRaw, formatShares, formatNAV, truncateAddress } from '@/lib/contracts'

export default function PortfolioPage() {
  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const portfolio = usePortfolio()

  if (!isConnected) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <p className="text-3xl font-bold text-text">Your Portfolio</p>
          <p className="text-sm text-muted">
            Connect your wallet to view your positions, cost basis, and P&amp;L.
          </p>
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="min-h-[44px] px-6 py-3 bg-accent text-white text-sm font-medium rounded
              hover:bg-red-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  const {
    address,
    shareBalance,
    usdcBalance,
    navPerShare,
    positionValue,
    costBasis,
    pnlAbsolute,
    pnlPercent,
    ownershipPct,
    totalAssets,
    deposits,
    eventsLoading,
    hasPendingRedemption,
    pendingShares,
    pendingNavAtRequest,
    pendingRequestedAt,
    isLoading,
    currentBlock,
  } = portfolio

  const activeFund = funds.find((f) => f.isActive)
  const hasPosition = shareBalance > 0n
  const pnlPositive = pnlAbsolute >= 0n

  return (
    <div className="min-h-[calc(100vh-64px)] px-6 py-10 max-w-5xl mx-auto flex flex-col gap-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-text">{getGreeting()}</h1>
          <p className="text-xs font-mono text-muted">{address ? truncateAddress(address) : '...'}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded text-xs font-mono text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Block <span className="text-text ml-1">#{currentBlock.toString()}</span>
        </div>
      </div>

      {/* ── Summary stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Portfolio Value"
          value={isLoading ? '...' : `$${formatUSDCRaw(positionValue)}`}
          sub="USDC"
          accent={hasPosition}
        />
        <SummaryCard
          label="P&L"
          value={isLoading || deposits.length === 0 ? '...' :
            `${pnlPositive ? '+' : ''}$${formatUSDCRaw(pnlAbsolute < 0n ? -pnlAbsolute : pnlAbsolute)}`}
          sub={isLoading || deposits.length === 0 ? undefined :
            `${pnlPositive ? '+' : ''}${pnlPercent.toFixed(2)}% since deposit`}
          positive={pnlPositive}
          negative={!pnlPositive}
          showSign
        />
        <SummaryCard
          label="Shares Held"
          value={isLoading ? '...' : formatShares(shareBalance)}
          sub={`NAV ${isLoading ? '...' : formatNAV(navPerShare)}`}
        />
        <SummaryCard
          label="Vault Share"
          value={isLoading ? '...' : `${ownershipPct.toFixed(3)}%`}
          sub={`of $${formatUSDCRaw(totalAssets)} AUM`}
        />
      </div>

      {/* ── Position card ───────────────────────────────────────────────────── */}
      {activeFund && (
        <div className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-wider text-muted">Open Position</p>

          {hasPosition ? (
            <div className="bg-surface border border-border rounded p-6 flex flex-col gap-6">
              {/* Fund header */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <Link
                    href={`/funds/${activeFund.id}`}
                    className="font-semibold text-text hover:text-accent transition-colors"
                  >
                    {activeFund.name}
                  </Link>
                  <span className="text-xs text-muted">{activeFund.strategy}</span>
                </div>
                <span className="px-2 py-0.5 text-xs border border-success/40 text-success rounded">
                  Active
                </span>
              </div>

              {/* Position metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded overflow-hidden">
                <MetricCell label="Current Value" value={`$${formatUSDCRaw(positionValue)}`} />
                <MetricCell
                  label="Cost Basis"
                  value={eventsLoading ? '...' : `$${formatUSDCRaw(costBasis)}`}
                  sub="sum of deposits"
                />
                <MetricCell
                  label="Unrealized P&L"
                  value={eventsLoading ? '...' :
                    `${pnlPositive ? '+' : '-'}$${formatUSDCRaw(pnlAbsolute < 0n ? -pnlAbsolute : pnlAbsolute)}`}
                  sub={eventsLoading ? undefined : `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`}
                  accent={pnlPositive}
                  negative={!pnlPositive}
                />
                <MetricCell label="Current NAV" value={formatNAV(navPerShare)} sub="per share" />
              </div>

              {/* USDC balance */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Wallet USDC</span>
                <span className="font-mono tabular-nums text-text">
                  ${formatUSDCRaw(usdcBalance)}
                </span>
              </div>

              {/* CTA */}
              <div className="flex gap-3 flex-wrap">
                <Link
                  href={`/funds/${activeFund.id}`}
                  className="px-4 py-2 text-sm border border-accent text-accent rounded
                    hover:bg-accent hover:text-white transition-colors
                    focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
                >
                  Deposit more
                </Link>
                <Link
                  href="/redeem"
                  className="px-4 py-2 text-sm border border-border text-muted rounded
                    hover:border-accent hover:text-text transition-colors
                    focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
                >
                  Request redemption
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded p-8 flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-muted">You have no open position in {activeFund.name}.</p>
              <Link
                href={`/funds/${activeFund.id}`}
                className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-red-700 transition-colors"
              >
                Invest now
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Pending redemption ─────────────────────────────────────────────── */}
      {hasPendingRedemption && (
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-wider text-muted">Pending Redemption</p>
          <div className="bg-surface border border-accent/30 rounded p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm text-text font-medium">Redemption requested</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted">Shares queued</span>
                <span className="font-mono tabular-nums text-text">{formatShares(pendingShares)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted">NAV at request</span>
                <span className="font-mono tabular-nums text-text">{formatNAV(pendingNavAtRequest)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted">Requested at block</span>
                <span className="font-mono tabular-nums text-text">#{pendingRequestedAt.toString()}</span>
              </div>
            </div>
            <p className="text-xs text-muted">
              Expected USDC: <span className="text-text font-mono">
                ${formatUSDCRaw((pendingShares * pendingNavAtRequest) / 10n ** 18n)}
              </span> \u00b7 Fulfilled within 24h by fund manager.
            </p>
          </div>
        </div>
      )}

      {/* ── Transaction history ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted">Deposit History</p>
          <span className="text-xs font-mono text-muted">
            {eventsLoading ? 'loading\u2026' : `${deposits.length} transaction${deposits.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {eventsLoading ? (
          <div className="bg-surface border border-border rounded p-6 text-center text-sm text-muted">
            Reading chain events...
          </div>
        ) : deposits.length === 0 ? (
          <div className="bg-surface border border-border rounded p-6 text-center text-sm text-muted">
            No deposits found for this address.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted font-normal">Block</th>
                  <th className="text-left px-4 py-3 text-muted font-normal hidden sm:table-cell">Date</th>
                  <th className="text-right px-4 py-3 text-muted font-normal">USDC In</th>
                  <th className="text-right px-4 py-3 text-muted font-normal">Shares</th>
                  <th className="text-right px-4 py-3 text-muted font-normal hidden md:table-cell">NAV</th>
                  <th className="text-right px-4 py-3 text-muted font-normal hidden lg:table-cell">Tx</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((dep, i) => (
                  <tr key={dep.txHash + i} className="border-b border-border last:border-0 hover:bg-bg/60">
                    <td className="px-4 py-3 font-mono text-text">
                      #{dep.blockNumber.toString()}
                    </td>
                    <td className="px-4 py-3 text-muted hidden sm:table-cell">
                      {dep.blockTime
                        ? dep.blockTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text">
                      ${dep.formattedAssets}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text">
                      {dep.formattedShares}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted hidden md:table-cell">
                      {dep.formattedNav}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <a
                        href={`https://arcscan.io/tx/${dep.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-accent hover:underline"
                      >
                        {dep.txHash.slice(0, 6)}\u2026{dep.txHash.slice(-4)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, accent, positive, negative, showSign,
}: {
  label: string; value: string; sub?: string
  accent?: boolean; positive?: boolean; negative?: boolean; showSign?: boolean
}) {
  const color = accent
    ? 'text-accent'
    : positive
    ? 'text-success'
    : negative
    ? 'text-error'
    : 'text-text'

  return (
    <div className="bg-surface border border-border rounded px-4 py-4 flex flex-col gap-1">
      <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-mono tabular-nums font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}

function MetricCell({
  label, value, sub, accent, negative,
}: {
  label: string; value: string; sub?: string; accent?: boolean; negative?: boolean
}) {
  return (
    <div className="bg-bg px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-sm font-mono tabular-nums font-semibold ${
        accent ? 'text-success' : negative ? 'text-error' : 'text-text'
      }`}>
        {value}
      </span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}


// ═══════════════════════════════════════════════════════════════════════════════
// §24  PAGES — app/redeem/page.tsx  (Redemption Request)
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/redeem/page.tsx

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useReadContract } from 'wagmi'
import { useConnect } from 'wagmi'
import { useProtocol } from '@/hooks/useProtocol'
import { useRedeemFlow } from '@/hooks/useRedeemFlow'
import { AmountInput } from '@/components/AmountInput'
import { TxButton } from '@/components/TxButton'
import {
  formatShares,
  formatUSDCRaw,
  parseShares,
  fundVaultAbi,
  useContractAddresses,
} from '@/lib/contracts'

// Cooldown from the contract (5 minutes)
const REDEMPTION_COOLDOWN_SECS = 5 * 60

export default function RedeemPage() {
  const {
    address,
    shareBalance,
    navPerShare,
    hasPendingRedemption,
    pendingShares,
    pendingNavAtRequest,
    pendingRequestedAt,
    maxExitBps,
    maxExitShares,
    isLoading,
    refetch,
  } = useProtocol()

  const flow = useRedeemFlow()
  const { vaultAddress } = useContractAddresses()
  const { connect, connectors } = useConnect()

  const parsedAmount = parseShares(flow.amount)

  // Preview USDC out for the entered amount
  const { data: usdcPreview } = useReadContract({
    address: vaultAddress,
    abi: fundVaultAbi,
    functionName: 'convertToAssets',
    args: [parsedAmount],
    query: { enabled: parsedAmount > 0n && !!vaultAddress },
  })

  const exceedsExitCap = parsedAmount > 0n && maxExitShares > 0n && parsedAmount > maxExitShares
  const exceedsBalance  = parsedAmount > shareBalance
  const canRequest = parsedAmount > 0n && !exceedsBalance && !exceedsExitCap && !hasPendingRedemption

  // How many requests to fully exit
  const requestsNeeded = maxExitShares > 0n && shareBalance > maxExitShares
    ? Math.ceil(Number(shareBalance) / Number(maxExitShares))
    : 1

  // Pending payout: shares x navAtRequest / 1e18 -> USDC (6 dec)
  const pendingPayoutUsdc = pendingShares > 0n && pendingNavAtRequest > 0n
    ? Number((pendingShares * pendingNavAtRequest) / 10n ** 18n) / 1e6
    : 0

  if (!address) {
    return (
      <RedeemPageWrap>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-text tracking-tight">Withdraw Funds</h1>
            <p className="text-sm text-muted">Connect your wallet to see your positions.</p>
          </div>
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full min-h-[44px] px-4 py-3 bg-accent text-white text-sm font-semibold rounded
              hover:bg-red-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
          >
            Connect Wallet
          </button>
          <p className="text-xs text-muted text-center">
            Don&apos;t have shares yet?{' '}
            <Link href="/" className="text-accent hover:underline">Browse funds</Link>
          </p>
        </div>
      </RedeemPageWrap>
    )
  }

  // ── QUEUED state: redemption already submitted ─────────────────────────────
  if (!isLoading && (hasPendingRedemption || flow.isQueued)) {
    const shares    = hasPendingRedemption ? pendingShares : parseShares(flow.amount)
    const payout    = hasPendingRedemption
      ? pendingPayoutUsdc
      : usdcPreview ? Number(usdcPreview) / 1e6 : 0
    const requestTs = hasPendingRedemption ? Number(pendingRequestedAt) : Math.floor(Date.now() / 1000)

    return (
      <RedeemPageWrap>
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-2xl font-bold text-text tracking-tight">Redemption Queued</h1>
          <p className="text-sm text-muted">Your shares are escrowed. NAV is locked.</p>
        </div>

        {/* Summary card */}
        <div
          className="rounded p-5 flex flex-col gap-4"
          style={{ background: '#111', border: '1px solid rgba(220,38,38,0.25)' }}
        >
          <RedeemRow label="Shares escrowed"  value={formatShares(shares)} mono />
          <RedeemRow
            label="You will receive"
            value={`$${payout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`}
            mono
            accent
          />
          <RedeemRow
            label="NAV locked at"
            value={`$${(Number(hasPendingRedemption ? pendingNavAtRequest : navPerShare) / 1e6).toFixed(6)}`}
            mono
          />
          <RedeemRow
            label="Requested"
            value={requestTs > 0 ? new Date(requestTs * 1000).toLocaleString() : '\u2014'}
          />
        </div>

        {/* Cooldown countdown */}
        <CooldownBar requestedAt={requestTs} cooldownSecs={REDEMPTION_COOLDOWN_SECS} />

        {flow.error && (
          <p role="alert" className="text-sm text-error">{flow.error}</p>
        )}

        {flow.state === 'CANCELLED' && (
          <p className="text-sm text-success">Redemption cancelled. Shares returned to your wallet.</p>
        )}

        <button
          type="button"
          onClick={() => { flow.cancelRequest(); refetch() }}
          disabled={flow.isPending}
          className="w-full min-h-[44px] px-4 py-3 border border-border text-muted text-sm rounded
            hover:border-error hover:text-error transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {flow.isPending ? 'Cancelling\u2026' : 'Cancel Redemption'}
        </button>

        <p className="text-xs text-muted text-center">
          After the cooldown the fund manager will settle your redemption.{' '}
          <Link href="/convert" className="text-accent hover:underline">
            Convert USDC \u2192 USD
          </Link>{' '}
          once settled.
        </p>
      </RedeemPageWrap>
    )
  }

  // ── No shares ──────────────────────────────────────────────────────────────
  if (!isLoading && shareBalance === 0n) {
    return (
      <RedeemPageWrap>
        <h1 className="text-2xl font-bold text-text tracking-tight mb-4">Withdraw Funds</h1>
        <div className="p-4 border border-border rounded bg-surface text-sm text-muted">
          You have no shares to redeem.{' '}
          <Link href="/deposit" className="text-accent hover:underline">Deposit USDC</Link>{' '}
          to receive shares.
        </div>
      </RedeemPageWrap>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <RedeemPageWrap>
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-bold text-text tracking-tight">Withdraw Funds</h1>
        <p className="text-sm text-muted">Redeem your vault shares for USDC.</p>
      </div>

      {/* Exit rules banner */}
      <ExitRules maxExitBps={maxExitBps} cooldownSecs={REDEMPTION_COOLDOWN_SECS} />

      <form
        onSubmit={(e) => { e.preventDefault(); if (canRequest && !flow.isPending) flow.startRequest() }}
        className="flex flex-col gap-5"
      >
        {/* Balances row */}
        <div className="flex justify-between text-sm">
          <span className="text-muted">
            Balance:{' '}
            <span className="font-mono text-text tabular-nums">
              {isLoading ? '\u2026' : formatShares(shareBalance)} shares
            </span>
          </span>
          <span className="text-muted">
            NAV:{' '}
            <span className="font-mono text-text tabular-nums">
              ${(Number(navPerShare) / 1e6).toFixed(4)}
            </span>
          </span>
        </div>

        <AmountInput
          label="Shares to redeem"
          value={flow.amount}
          onChange={flow.setAmount}
          max={formatShares(shareBalance)}
          disabled={flow.isPending}
          symbol="shares"
        />

        {/* Exit cap warning */}
        {exceedsExitCap && maxExitShares > 0n && (
          <div
            className="rounded px-4 py-3 text-sm flex flex-col gap-1"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)' }}
          >
            <span className="text-error font-medium">
              Exceeds the {Number(maxExitBps) / 100}% exit cap
            </span>
            <span className="text-muted text-xs">
              Max per request: <span className="font-mono text-text">{formatShares(maxExitShares)} shares</span>
              {requestsNeeded > 1 && (
                <> \u2014 you need <span className="text-text font-semibold">{requestsNeeded} requests</span> to fully exit.</>
              )}
              {' '}Ask the fund admin to raise the exit cap if needed.
            </span>
          </div>
        )}

        {/* USDC preview */}
        {usdcPreview !== undefined && parsedAmount > 0n && !exceedsExitCap && (
          <div
            className="flex justify-between items-center px-4 py-3 rounded text-sm"
            style={{ background: '#111', border: '1px solid #222' }}
          >
            <span className="text-muted">You will receive</span>
            <span className="font-mono font-semibold text-text tabular-nums">
              {formatUSDCRaw(usdcPreview)} USDC
            </span>
          </div>
        )}

        {/* Info box */}
        <div className="p-3 rounded border border-border bg-surface text-xs text-muted leading-relaxed">
          NAV is locked at the moment you submit this request \u2014 your exact payout is guaranteed
          regardless of market moves after that point.
        </div>

        {flow.error && (
          <p role="alert" className="text-sm text-error">{flow.error}</p>
        )}

        <TxButton
          onClick={flow.startRequest}
          disabled={!canRequest}
          isPending={flow.isPending}
        >
          {flow.isPending ? 'Submitting\u2026' : 'Request Redemption'}
        </TxButton>
      </form>
    </RedeemPageWrap>
  )
}

// ── ExitRules banner ──────────────────────────────────────────────────────────

function ExitRules({ maxExitBps, cooldownSecs }: { maxExitBps: bigint; cooldownSecs: number }) {
  const pct = Number(maxExitBps) / 100
  const mins = Math.floor(cooldownSecs / 60)

  return (
    <div
      className="rounded px-4 py-3 flex flex-col sm:flex-row gap-3 sm:gap-6 text-xs"
      style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-accent font-mono font-semibold">EXIT RULES</span>
      </div>
      <RuleItem label={`Max ${pct}% of supply per request`} />
      <RuleItem label={`${mins}-min settlement cooldown`} />
      <RuleItem label="NAV locked at request time" />
    </div>
  )
}

function RuleItem({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span className="w-1 h-1 bg-accent flex-shrink-0" />
      <span>{label}</span>
    </span>
  )
}

// ── CooldownBar ───────────────────────────────────────────────────────────────

function CooldownBar({ requestedAt, cooldownSecs }: { requestedAt: number; cooldownSecs: number }) {
  const readyAt = requestedAt + cooldownSecs
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    if (now >= readyAt) return
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [readyAt, now])

  const remaining = Math.max(0, readyAt - now)
  const elapsed   = Math.min(cooldownSecs, cooldownSecs - remaining)
  const pct       = cooldownSecs > 0 ? Math.round((elapsed / cooldownSecs) * 100) : 100
  const isDone    = remaining === 0

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div
      className="rounded p-5 flex flex-col gap-3"
      style={{ background: '#111', border: '1px solid #222' }}
    >
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted">Settlement cooldown</span>
        {isDone ? (
          <span className="text-success font-semibold text-xs">
            \u2713 Ready \u2014 awaiting manager
          </span>
        ) : (
          <span className="font-mono tabular-nums text-text font-semibold">
            {mm}:{ss}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-px overflow-hidden" style={{ background: '#222' }}>
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: isDone ? '#22C55E' : '#DC2626',
          }}
        />
      </div>

      <p className="text-xs text-muted">
        {isDone
          ? 'The fund manager can now settle your redemption. You will receive USDC directly to your wallet.'
          : `The manager can settle your redemption in ${mm}:${ss}. You can cancel at any time before settlement.`}
      </p>
    </div>
  )
}

// ── RedeemRow ────────────────────────────────────────────────────────────────

function RedeemRow({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className={`${mono ? 'font-mono tabular-nums' : ''} ${accent ? 'text-accent font-semibold' : 'text-text'}`}>
        {value}
      </span>
    </div>
  )
}

// ── RedeemPageWrap ───────────────────────────────────────────────────────────

function RedeemPageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-[480px] flex flex-col gap-5">
        {children}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §25  PAGES — app/convert/page.tsx  (USDC to USD Off-ramp)
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/convert/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignMessage } from 'wagmi'
import { useProtocol } from '@/hooks/useProtocol'

type ConvertStep = 'amount' | 'beneficiary' | 'bank' | 'done'

interface ConvertFormData {
  amount: string
  name: string
  country: string
  bankName: string
  accountNumber: string
  routingNumber: string
}

function validateBank(data: ConvertFormData): string | null {
  if (!data.bankName.trim()) return 'Bank name is required.'
  if (!data.accountNumber.trim()) return 'Account number is required.'
  if (!/^\d{9}$/.test(data.routingNumber)) return 'Routing number must be 9 digits.'
  return null
}

export default function ConvertPage() {
  const { address } = useProtocol()
  const router = useRouter()
  const { signMessageAsync } = useSignMessage()

  const [step, setStep] = useState<ConvertStep>('amount')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [form, setForm] = useState<ConvertFormData>({
    amount: '',
    name: '',
    country: 'US',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
  })

  function update(field: keyof ConvertFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    setError(null)
    const bankError = validateBank(form)
    if (bankError) { setError(bankError); return }

    if (!address) { setError('Wallet not connected.'); return }

    try {
      setLoading(true)
      const ts = Date.now()
      const message = `ABRAND wire transfer ${form.amount} ${ts}`
      const signature = await signMessageAsync({ message })

      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: form.amount,
          address,
          signature,
          message,
          beneficiary: { name: form.name },
          bank: {
            name: form.bankName,
            account: form.accountNumber,
            routing: form.routingNumber,
            country: form.country,
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }

      const data = await res.json()
      setReference(data.reference ?? 'ABRAND-' + ts)
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!address) {
    return (
      <ConvertPageWrap>
        <p className="text-muted text-sm">Connect your wallet to continue.</p>
      </ConvertPageWrap>
    )
  }

  if (step === 'done') {
    return (
      <ConvertPageWrap>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-success">Wire initiated</h1>
          <p className="text-sm text-muted">
            Reference:{' '}
            <span className="font-mono text-text tabular-nums">{reference}</span>
          </p>
          <p className="text-sm text-muted">Funds arrive in 1\u20133 business days.</p>
          <p className="text-sm text-muted">
            You will receive a confirmation email from Bridge.xyz. No further action needed in this app.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 w-full min-h-[44px] px-4 py-3 border border-border text-muted text-sm rounded
              hover:text-text hover:border-text transition-colors
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
          >
            Back to home
          </button>
        </div>
      </ConvertPageWrap>
    )
  }

  const convertInputClass =
    'w-full bg-surface border border-border rounded px-4 py-3 text-text text-sm outline-none ' +
    'focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ' +
    'placeholder:text-muted'

  return (
    <ConvertPageWrap>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => router.push('/redeem')}
          className="text-sm text-muted hover:text-text transition-colors"
        >
          \u2190 Back to Redeem
        </button>
      </div>

      <h1 className="text-2xl font-semibold text-text mb-8">Convert to USD</h1>

      <form
        aria-label="Wire transfer form"
        onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
        className="flex flex-col gap-6"
      >
        {/* Step 1: Amount */}
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="text-sm font-medium text-text mb-2">Amount</legend>
          <ConvertField label="USDC amount">
            <input
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
              placeholder="0.00"
              className={convertInputClass}
              required
            />
          </ConvertField>
          <p className="text-xs text-muted">Estimated arrival: 1\u20133 business days.</p>
        </fieldset>

        <hr className="border-border" />

        {/* Step 2: Beneficiary */}
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="text-sm font-medium text-text mb-2">Beneficiary</legend>
          <ConvertField label="Full legal name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Jane Smith"
              className={convertInputClass}
              required
            />
          </ConvertField>
          <ConvertField label="Bank country">
            <select
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              className={convertInputClass}
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="EU">European Union</option>
            </select>
          </ConvertField>
        </fieldset>

        <hr className="border-border" />

        {/* Step 3: Bank */}
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="text-sm font-medium text-text mb-2">Bank details</legend>
          <ConvertField label="Bank name">
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => update('bankName', e.target.value)}
              placeholder="Chase Bank"
              className={convertInputClass}
              required
            />
          </ConvertField>
          <ConvertField label="Account number">
            <input
              type="password"
              inputMode="numeric"
              value={form.accountNumber}
              onChange={(e) => update('accountNumber', e.target.value)}
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              className={convertInputClass}
              required
            />
          </ConvertField>
          <ConvertField label="Routing number (9 digits)">
            <input
              type="text"
              inputMode="numeric"
              value={form.routingNumber}
              onChange={(e) => update('routingNumber', e.target.value)}
              placeholder="021000021"
              maxLength={9}
              className={convertInputClass}
              required
            />
          </ConvertField>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full min-h-[44px] px-4 py-3 bg-accent text-white text-sm font-medium rounded
            hover:bg-[#1e63b5] transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
        >
          {loading ? 'Initiating wire...' : 'Initiate Wire Transfer'}
        </button>
      </form>
    </ConvertPageWrap>
  )
}

function ConvertField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-muted">{label}</label>
      {children}
    </div>
  )
}

function ConvertPageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-[480px] flex flex-col gap-6">
        {children}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// §26  PAGES — app/manage/[id]/page.tsx  (Fund Manager Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/manage/[id]/page.tsx
//
// Full source: 536 lines — see /Users/julesfoa/Desktop/worktrees/frontend-8fd/src/app/manage/[id]/page.tsx
// Key sections: vault stats, propose NAV (with pending proposal display),
// fee configuration (management + performance fee BPS setters, collect fees),
// deploy capital (two modes: send to address or wire via Bridge.xyz),
// fulfill redemptions (enter investor address to settle at locked NAV).
//
// Imports: use, useState, Link, notFound, isAddress, useSignMessage, useConfig,
//   useChainId, waitForTransactionReceipt, useWriteContract, useConnect,
//   useAccount, useProtocol, useNavProposal, useVaultFees, TxButton,
//   getFundById, getVaultAddresses, fundVaultAbi, formatUSDC, formatUSDCRaw,
//   formatNAV, parseUSDC, truncateAddress
//
// Components: ManagerDashboard, StatCard, Section, TabBtn, Field, PageWrap


// ═══════════════════════════════════════════════════════════════════════════════
// §27  PAGES — app/audit/[id]/page.tsx  (Auditor Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/audit/[id]/page.tsx
//
// Full source: 402 lines — see /Users/julesfoa/Desktop/worktrees/frontend-8fd/src/app/audit/[id]/page.tsx
// Key sections: auditor status badges, NAV info panel, pending NAV review
// (approve/reject), NAV attestation via EIP-712 (signTypedData + onReport),
// dispute management (look up redemptions by address, flag for dispute).
//
// Imports: use, useState, notFound, useWriteContract, useReadContracts,
//   useSignTypedData, useChainId, useConfig, useAccount,
//   waitForTransactionReceipt, isAddress, parseUnits, encodeAbiParameters,
//   useProtocol, useNavProposal, TxButton, getFundById, getVaultAddresses,
//   truncateAddress, formatNAV, formatUSDC, formatShares, navConsumerAbi,
//   fundVaultAbi
//
// Components: AuditorDashboard, Badge, PageWrap


// ═══════════════════════════════════════════════════════════════════════════════
// §28  PAGES — app/admin/[id]/page.tsx  (Admin Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════
// File: src/app/admin/[id]/page.tsx
//
// Full source: 491 lines — see /Users/julesfoa/Desktop/worktrees/frontend-8fd/src/app/admin/[id]/page.tsx
// Key sections: NAV staleness banner with force refresh, oracle NAV push
// (fetch signed attestation from API + submitSignedNAV to NAVOracle),
// dispute resolution (lookup + dispute/approve/reject), exit cap config
// (10/25/50/100% presets), investor whitelist (grant/revoke INVESTOR_ROLE).
//
// Imports: use, useState, notFound, useWriteContract, useWaitForTransactionReceipt,
//   useReadContracts, useConfig, useChainId, useAccount,
//   waitForTransactionReceipt, isAddress, useProtocol, TxButton,
//   getFundById, getVaultAddresses, truncateAddress, formatNAV, formatUSDC,
//   formatShares, INVESTOR_ROLE, fundVaultAbi, navOracleAbi
//
// Components: AdminDashboard, PageWrap
