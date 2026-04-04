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

  // Pending payout: shares × navAtRequest / 1e18 → USDC (6 dec)
  const pendingPayoutUsdc = pendingShares > 0n && pendingNavAtRequest > 0n
    ? Number((pendingShares * pendingNavAtRequest) / 10n ** 18n) / 1e6
    : 0

  if (!address) {
    return (
      <PageWrap>
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
      </PageWrap>
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
      <PageWrap>
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-2xl font-bold text-text tracking-tight">Redemption Queued</h1>
          <p className="text-sm text-muted">Your shares are escrowed. NAV is locked.</p>
        </div>

        {/* Summary card */}
        <div
          className="rounded p-5 flex flex-col gap-4"
          style={{ background: '#111', border: '1px solid rgba(220,38,38,0.25)' }}
        >
          <Row label="Shares escrowed"  value={formatShares(shares)} mono />
          <Row
            label="You will receive"
            value={`$${payout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`}
            mono
            accent
          />
          <Row
            label="NAV locked at"
            value={`$${(Number(hasPendingRedemption ? pendingNavAtRequest : navPerShare) / 1e6).toFixed(6)}`}
            mono
          />
          <Row
            label="Requested"
            value={requestTs > 0 ? new Date(requestTs * 1000).toLocaleString() : '—'}
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
          {flow.isPending ? 'Cancelling…' : 'Cancel Redemption'}
        </button>

        <p className="text-xs text-muted text-center">
          After the cooldown the fund manager will settle your redemption.{' '}
          <Link href="/convert" className="text-accent hover:underline">
            Convert USDC → USD
          </Link>{' '}
          once settled.
        </p>
      </PageWrap>
    )
  }

  // ── No shares ──────────────────────────────────────────────────────────────
  if (!isLoading && shareBalance === 0n) {
    return (
      <PageWrap>
        <h1 className="text-2xl font-bold text-text tracking-tight mb-4">Withdraw Funds</h1>
        <div className="p-4 border border-border rounded bg-surface text-sm text-muted">
          You have no shares to redeem.{' '}
          <Link href="/deposit" className="text-accent hover:underline">Deposit USDC</Link>{' '}
          to receive shares.
        </div>
      </PageWrap>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <PageWrap>
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
              {isLoading ? '…' : formatShares(shareBalance)} shares
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
                <> — you need <span className="text-text font-semibold">{requestsNeeded} requests</span> to fully exit.</>
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
          NAV is locked at the moment you submit this request — your exact payout is guaranteed
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
          {flow.isPending ? 'Submitting…' : 'Request Redemption'}
        </TxButton>
      </form>
    </PageWrap>
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
            ✓ Ready — awaiting manager
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

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className={`${mono ? 'font-mono tabular-nums' : ''} ${accent ? 'text-accent font-semibold' : 'text-text'}`}>
        {value}
      </span>
    </div>
  )
}

// ── PageWrap ──────────────────────────────────────────────────────────────────

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-[480px] flex flex-col gap-5">
        {children}
      </div>
    </div>
  )
}
