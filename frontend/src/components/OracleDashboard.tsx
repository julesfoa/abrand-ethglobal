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
  const ageLabel = ageSec === null ? '—'
    : ageSec < 60   ? `${ageSec}s ago`
    : ageSec < 3600 ? `${Math.floor(ageSec / 60)}m ago`
    : `${Math.floor(ageSec / 3600)}h ago`

  // Countdown to next heartbeat (1h from last update)
  const HEARTBEAT_S = 3600
  const nextSec     = ageSec !== null ? Math.max(0, HEARTBEAT_S - ageSec) : HEARTBEAT_S
  const mm = String(Math.floor(nextSec / 60)).padStart(2, '0')
  const ss = String(nextSec % 60).padStart(2, '0')

  const displayNAV = navPerShare ? formatNAV(navPerShare) : '—'

  return (
    <div className="border-t border-border pt-8 mt-2 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted">NAV Oracle</p>
        <span className="px-2 py-0.5 text-xs border border-accent/40 text-accent rounded font-mono">
          EIP-712 · Chainlink Functions
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
          <span className="text-xs text-muted">NAV per share · {ageLabel}</span>
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
            {ageSec !== null ? `${mm}:${ss}` : '—'}
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
