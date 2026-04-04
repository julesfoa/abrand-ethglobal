'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useReadContract } from 'wagmi'
import { useProtocol } from '@/hooks/useProtocol'
import { useDepositFlow } from '@/hooks/useDepositFlow'
import { useAccount, useConnect } from 'wagmi'
import { AmountInput } from '@/components/AmountInput'
import { TxButton } from '@/components/TxButton'
import { StepIndicator } from '@/components/StepIndicator'
import { PerformanceDashboard } from '@/components/PerformanceDashboard'
import { OracleDashboard } from '@/components/OracleDashboard'
import { getFundById } from '@/data/funds'
import {
  formatUSDCRaw,
  formatShares,
  formatNAV,
  parseUSDC,
  fundVaultAbi,
  useContractAddresses,
} from '@/lib/contracts'

export default function FundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const fund = getFundById(id)

  if (!fund) notFound()

  return <FundDetail fund={fund} />
}

function FundDetail({ fund }: { fund: NonNullable<ReturnType<typeof getFundById>> }) {
  const { address, usdcBalance, shareBalance, navPerShare, isInvestor, isLoading, refetch } =
    useProtocol()
  const { connect, connectors } = useConnect()
  const { isConnected } = useAccount()
  const flow = useDepositFlow()
  const { vaultAddress } = useContractAddresses()

  const parsedAmount = parseUSDC(flow.amount)
  const { data: sharesPreview } = useReadContract({
    address: vaultAddress,
    abi: fundVaultAbi,
    functionName: 'convertToShares',
    args: [parsedAmount],
    query: { enabled: parsedAmount > 0n && !!vaultAddress && !!address },
  })

  const maxAmount = formatUSDCRaw(usdcBalance)
  const canDeposit = parsedAmount > 0n && parsedAmount <= usdcBalance
  const isDone = flow.state === 'DONE'

  return (
    <div className="min-h-[calc(100vh-64px)] px-6 py-10 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-8"
      >
        ← All Funds
      </Link>

      {/* Fund header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold text-text">{fund.name}</h1>
          {!fund.isActive && (
            <span className="px-2 py-0.5 text-xs border border-muted text-muted rounded">
              Coming Soon
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="px-2 py-0.5 text-xs border border-border text-muted rounded">
            {fund.strategy}
          </span>
          <span className="text-sm font-mono tabular-nums text-muted">
            AUM <span className="text-text">{fund.aum}</span>
          </span>
          <span className={`text-sm font-mono tabular-nums ${fund.ytdPositive ? 'text-success' : 'text-error'}`}>
            YTD {fund.ytd}
          </span>
        </div>
      </div>

      {/* Two-column layout: strategy + deposit — above the charts */}
      {/* flex-col-reverse on mobile puts deposit CTA above strategy text */}
      <div className="flex flex-col-reverse lg:flex-row gap-8 mb-10">
        {/* Left: Strategy docs (60%) */}
        <section
          aria-label="Strategy overview"
          className="lg:w-[60%] flex flex-col gap-4"
        >
          <p className="text-xs uppercase tracking-wider text-muted">Strategy Overview</p>
          <div className="border-l-2 border-accent bg-surface p-6 rounded-sm">
            {fund.description.map((para, i) => (
              <p key={i} className={`text-sm text-muted leading-relaxed ${i > 0 ? 'mt-4' : ''}`}>
                {para}
              </p>
            ))}
          </div>
        </section>

        {/* Right: Deposit form (40%) */}
        <section
          aria-label="Deposit form"
          className="lg:w-[40%] lg:max-w-[480px]"
        >
          {!fund.isActive ? (
            <div className="border border-border rounded-sm p-6 bg-surface">
              <p className="text-sm text-muted">
                This fund is not yet open for deposits. Check back soon.
              </p>
            </div>
          ) : !isConnected ? (
            /* Not connected */
            <div className="border border-border rounded-sm p-6 bg-surface flex flex-col gap-4">
              <p className="text-sm text-text font-medium">Connect your wallet to invest</p>
              <p className="text-xs text-muted">
                Connect to see your USDC balance and deposit into {fund.name}.
              </p>
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full min-h-[44px] px-4 py-3 bg-accent text-white text-sm font-medium rounded
                  hover:bg-red-700 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
              >
                Connect Wallet
              </button>
              <p className="text-xs text-muted text-center">
                Read-only until you approve. No transaction without your confirmation.
              </p>
            </div>
          ) : (
            /* Connected + whitelisted */
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col gap-5"
            >
              {/* Balances */}
              <div className="flex justify-between text-sm">
                <span className="text-muted">
                  USDC:{' '}
                  <span className="font-mono text-text tabular-nums">
                    {isLoading ? '...' : formatUSDCRaw(usdcBalance)}
                  </span>
                </span>
                <span className="text-muted">
                  Shares:{' '}
                  <span
                    className={`font-mono tabular-nums transition-colors duration-500 ${
                      isDone ? 'text-success' : 'text-text'
                    }`}
                  >
                    {isLoading ? '...' : formatShares(shareBalance)}
                  </span>
                </span>
              </div>

              {/* NAV */}
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>Current NAV</span>
                <span className="font-mono text-text tabular-nums">{formatNAV(navPerShare)}</span>
                <span>/ share</span>
              </div>

              {/* Amount input */}
              <AmountInput
                label="USDC amount"
                value={flow.amount}
                onChange={flow.setAmount}
                max={maxAmount}
                disabled={flow.isPending || isDone}
              />

              {/* Share preview */}
              {sharesPreview !== undefined && parsedAmount > 0n && (
                <p className="text-sm text-muted">
                  You will receive{' '}
                  <span className="font-mono text-text tabular-nums">
                    {formatShares(sharesPreview)}
                  </span>{' '}
                  shares at NAV {formatNAV(navPerShare)}
                </p>
              )}

              {/* Trust copy */}
              <p className="text-xs text-muted leading-relaxed">
                Shares are ERC4626 vault tokens representing a proportional claim on the fund. NAV
                appreciates as the fund generates returns.
              </p>

              {/* Step indicator */}
              <StepIndicator
                steps={[
                  {
                    label: 'Approve USDC',
                    done: ['APPROVE_CONFIRMED', 'DEPOSITING', 'DONE'].includes(flow.state),
                    active: ['IDLE', 'APPROVING', 'APPROVE_FAILED'].includes(flow.state),
                  },
                  {
                    label: 'Deposit',
                    done: flow.state === 'DONE',
                    active: ['APPROVE_CONFIRMED', 'DEPOSITING', 'DEPOSIT_FAILED'].includes(flow.state),
                  },
                ]}
              />
              <p className="text-xs text-muted">
                Two transactions — approve USDC, then deposit into vault.
              </p>

              {/* Error */}
              {flow.error && (
                <p role="alert" className="text-sm text-error">
                  {flow.error}
                </p>
              )}

              {/* TX status */}
              <output aria-live="polite" role="status" className="text-sm">
                {isDone && (
                  <span className="text-success">
                    Deposit confirmed. You now hold {formatShares(shareBalance)} shares.
                  </span>
                )}
              </output>

              {isDone ? (
                <button
                  type="button"
                  onClick={() => {
                    flow.reset()
                    refetch()
                  }}
                  className="w-full min-h-[44px] px-4 py-3 border border-accent text-accent text-sm rounded
                    hover:bg-accent hover:text-white transition-colors
                    focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
                >
                  Deposit more
                </button>
              ) : (
                <TxButton onClick={flow.startDeposit} disabled={!canDeposit} isPending={flow.isPending}>
                  {flow.buttonLabel}
                </TxButton>
              )}
            </form>
          )}
        </section>
      </div>

      {/* Performance dashboard */}
      <PerformanceDashboard fund={fund} />

      {/* NAV Oracle section (active funds only) */}
      {fund.isActive && <OracleDashboard navPerShare={navPerShare} />}
    </div>
  )
}
