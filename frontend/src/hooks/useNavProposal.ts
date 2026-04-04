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
