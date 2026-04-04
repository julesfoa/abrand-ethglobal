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
