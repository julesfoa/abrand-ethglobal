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
