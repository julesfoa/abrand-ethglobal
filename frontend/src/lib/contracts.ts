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
