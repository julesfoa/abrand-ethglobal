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
              </span> · Fulfilled within 24h by fund manager.
            </p>
          </div>
        </div>
      )}

      {/* ── Transaction history ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted">Deposit History</p>
          <span className="text-xs font-mono text-muted">
            {eventsLoading ? 'loading…' : `${deposits.length} transaction${deposits.length !== 1 ? 's' : ''}`}
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
                        : '—'}
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
                        {dep.txHash.slice(0, 6)}…{dep.txHash.slice(-4)}
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
