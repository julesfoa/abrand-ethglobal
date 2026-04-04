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
