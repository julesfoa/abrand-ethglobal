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
