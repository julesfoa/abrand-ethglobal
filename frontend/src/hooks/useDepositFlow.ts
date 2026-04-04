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
