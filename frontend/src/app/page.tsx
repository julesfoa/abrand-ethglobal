'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { funds } from '@/data/funds'
import { useProtocol } from '@/hooks/useProtocol'
import { formatUSDC } from '@/lib/contracts'

// ── Mini sparkline SVG ───────────────────────────────────────────────────────
const SPARKLINES: Record<string, string> = {
  'abrand-fund-i':     'M0,20 L10,18 L20,22 L30,16 L40,14 L50,18 L60,12 L70,14 L80,10',
  'apex-capital':      'M0,22 L10,16 L20,12 L30,8  L40,14 L50,6  L60,4  L70,8  L80,4',
  'fortress-fund-iii': 'M0,18 L10,17 L20,16 L30,17 L40,15 L50,16 L60,14 L70,15 L80,13',
}

export default function Home() {
  const { totalAssets, isLoading } = useProtocol()
  const fundsRef = useRef<HTMLDivElement>(null)
  const [showAllFunds, setShowAllFunds] = useState(true)

  const heroFund      = funds.find((f) => f.id === 'abrand-fund-i')!
  const bestFund      = [...funds].sort((a, b) => b.metrics.inceptionReturn - a.metrics.inceptionReturn)[0]
  const highestSharpe = [...funds].sort((a, b) => b.metrics.sharpe - a.metrics.sharpe)[0]
  const activeFunds   = funds.filter((f) => f.isActive)
  const displayedFunds = showAllFunds ? funds : activeFunds

  const liveAum = totalAssets > 0n && !isLoading
    ? formatUSDC(totalAssets)
    : '$2.4M'

  return (
    <div className="flex flex-col">

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[min(80vh,720px)] flex items-center overflow-hidden scanlines red-rule"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 65% 35%, rgba(220,38,38,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 20% 80%, rgba(220,38,38,0.03) 0%, transparent 50%), #0A0A0A',
        }}
      >
        {/* Grid background — offset for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            backgroundPosition: '24px 24px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 60% 40%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 60% 40%, black, transparent)',
          }}
        />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: copy ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-8">

            {/* Badge */}
            <div className="flex items-center gap-3 animate-fade-up">
              <div
                className="h-px w-8"
                style={{ background: 'linear-gradient(90deg, #DC2626, transparent)' }}
              />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-accent">
                Fund Marketplace · Onchain
              </span>
            </div>

            {/* Headline */}
            <div className="flex flex-col gap-2 animate-fade-up-d1">
              <h1
                className="text-6xl lg:text-7xl font-bold tracking-tight leading-[1.0] text-text"
                style={{ fontFeatureSettings: '"ss01"' }}
              >
                Hedge funds.
              </h1>
              <h1
                className="text-6xl lg:text-7xl font-bold tracking-tight leading-[1.0] text-accent"
                style={{ fontFeatureSettings: '"ss01"' }}
              >
                For everyone.
              </h1>
            </div>

            {/* Sub */}
            <p className="text-lg text-muted max-w-md leading-relaxed animate-fade-up-d2">
              Browse institutional-grade strategies, review track records, and invest onchain in seconds.
              No prime broker. No minimums. No lockups.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-4 animate-fade-up-d3">
              <button
                onClick={() => fundsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-3 bg-accent text-white text-sm font-semibold rounded hover:bg-red-700 transition-all btn-glow"
              >
                Browse Funds
              </button>
              <Link
                href="#how-it-works"
                className="px-6 py-3 border border-border text-text text-sm font-semibold rounded hover:border-accent hover:text-accent transition-colors"
              >
                How it works
              </Link>
            </div>

            {/* Trust line */}
            <div className="flex items-center gap-3 text-xs text-muted animate-fade-up-d4">
              <span>Built on</span>
              <span className="text-text font-medium">Base</span>
              <span className="text-border">·</span>
              <span className="text-text font-medium">Chainlink</span>
              <span className="text-border">·</span>
              <span className="text-text font-medium">Bridge.xyz</span>
            </div>
          </div>

          {/* ── Right: hero card ───────────────────────────────────────────── */}
          <div className="hidden lg:flex justify-center items-center animate-fade-in">
            <div className="relative">

              {/* Glow behind card */}
              <div
                className="absolute inset-0 rounded blur-3xl opacity-30 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.4), transparent 70%)' }}
              />

              {/* Card */}
              <div
                className="relative rounded p-6 flex flex-col gap-5 w-80 animate-float hero-card"
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted uppercase tracking-wider font-mono">{heroFund.name}</span>
                    <span className="text-text font-semibold text-sm">{heroFund.strategy}</span>
                  </div>
                  <span
                    className="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded font-mono font-semibold"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    LIVE
                  </span>
                </div>

                {/* Big return number */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted uppercase tracking-wider font-mono">Since Inception</span>
                  <span className="text-5xl font-bold font-mono tabular-nums text-success">
                    +{heroFund.metrics.inceptionReturn}%
                  </span>
                  <span className="text-xs text-muted font-mono">{heroFund.metrics.inceptionDate} — Present</span>
                </div>

                {/* Sparkline */}
                <svg width="100%" height="40" viewBox="0 0 240 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,35 L30,30 L60,32 L90,20 L120,22 L150,12 L180,16 L210,8 L240,4"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0,35 L30,30 L60,32 L90,20 L120,22 L150,12 L180,16 L210,8 L240,4 L240,40 L0,40 Z"
                    fill="url(#sparkGrad)"
                  />
                </svg>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted font-mono">Sharpe</span>
                    <span className="text-text text-sm font-mono font-semibold">
                      {heroFund.metrics.sharpe.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted font-mono">Max DD</span>
                    <span className="text-error text-sm font-mono font-semibold">
                      {heroFund.metrics.maxDrawdown}%
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted font-mono">YTD</span>
                    <span className="text-success text-sm font-mono font-semibold">
                      {heroFund.ytd}
                    </span>
                  </div>
                </div>

                {/* Invest button */}
                <Link
                  href="/funds/abrand-fund-i"
                  className="w-full text-center py-2.5 text-sm font-semibold rounded text-white transition-colors"
                  style={{ background: '#DC2626' }}
                >
                  Invest Now →
                </Link>
              </div>

              {/* Floating stat pill */}
              <div
                className="absolute -top-4 -right-4 px-3 py-2 rounded text-xs font-mono animate-float-d1"
                style={{
                  background: 'rgba(17,17,17,0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                <span className="text-muted">Min ticket </span>
                <span className="text-success font-semibold">$0</span>
              </div>

              {/* Floating bottom pill */}
              <div
                className="absolute -bottom-4 -left-4 px-3 py-2 rounded text-xs font-mono animate-float-d2"
                style={{
                  background: 'rgba(17,17,17,0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                <span className="text-muted">Lockup </span>
                <span className="text-text font-semibold">None</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 md:divide-x md:divide-border">
          <Stat label="Live AUM" value={liveAum} sub="across active funds" />
          <Stat label="Best return" value={`+${bestFund.metrics.inceptionReturn}%`} sub="since inception" accent />
          <Stat label="Highest Sharpe" value={highestSharpe.metrics.sharpe.toFixed(2)} sub={highestSharpe.name} />
          <Stat label="Min. investment" value="$0" sub="no accreditation needed" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FUND TABLE
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={fundsRef} className="max-w-6xl mx-auto w-full px-6 py-16 flex flex-col gap-6">

        {/* Section header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-px h-4 bg-accent" />
            <span className="text-xs font-mono uppercase tracking-wider text-muted">Live Funds</span>
          </div>
          <h2 className="text-2xl font-bold text-text tracking-tight">Available Strategies</h2>
          <p className="text-sm text-muted">
            Institutional funds, open to all. Review the strategy, then invest onchain.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-6 border-b border-border">
          <button
            onClick={() => setShowAllFunds(true)}
            className={`pb-3 text-sm -mb-px font-medium transition-colors ${showAllFunds ? 'text-text border-b-2 border-accent' : 'text-muted hover:text-text'}`}
          >
            All Funds
          </button>
          <button
            onClick={() => setShowAllFunds(false)}
            className={`pb-3 text-sm -mb-px font-medium transition-colors ${!showAllFunds ? 'text-text border-b-2 border-accent' : 'text-muted hover:text-text'}`}
          >
            Active ({activeFunds.length})
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm" role="table" aria-label="Available funds">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal w-[220px]">Fund</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal">Strategy</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal text-right">AUM</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal text-right">YTD</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal text-right hidden md:table-cell">Sharpe</th>
                <th className="pb-3 pr-6 text-xs uppercase tracking-wider text-muted font-normal text-right hidden lg:table-cell">Max DD</th>
                <th className="pb-3 w-24 text-xs uppercase tracking-wider text-muted font-normal text-center hidden sm:table-cell">Chart</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-muted font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedFunds.map((fund) => {
                const liveAumForFund =
                  fund.isActive && totalAssets > 0n && !isLoading
                    ? formatUSDC(totalAssets)
                    : null

                return (
                  <FundRow
                    key={fund.id}
                    id={fund.id}
                    name={fund.name}
                    strategy={fund.strategy}
                    aum={liveAumForFund ?? fund.aum}
                    ytd={fund.ytd}
                    ytdPositive={fund.ytdPositive}
                    sharpe={fund.metrics.sharpe}
                    maxDrawdown={fund.metrics.maxDrawdown}
                    isActive={fund.isActive}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative border-t border-border red-rule" style={{ background: '#0D0D0D' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col gap-12">

          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted">How it works</span>
            <h2 className="text-3xl font-bold text-text tracking-tight">Invest in 3 steps.</h2>
          </div>

          {/* Horizontal step strip — no card grid, no icon circles */}
          <div className="grid grid-cols-1 md:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Browse & Research',
                body: 'Explore listed funds with full strategy docs, track records, Sharpe ratios, and drawdown analysis.',
              },
              {
                n: '02',
                title: 'Connect & Approve',
                body: 'Connect your wallet. Approve USDC spending — one transaction, no paperwork, no prime broker.',
              },
              {
                n: '03',
                title: 'Invest & Exit',
                body: 'Deposit USDC. Receive NAV-priced ERC4626 shares. Redeem anytime — funds wired via Bridge.xyz.',
              },
            ].map(({ n, title, body }, i) => (
              <div key={n} className="flex flex-col gap-4 border-t-2 border-border pt-6 pr-8 pb-6 md:border-t-0 md:border-l-2 md:pl-8 md:pr-0 first:border-l-0 first:pl-0">
                <span className="text-5xl font-bold font-mono tabular-nums text-accent leading-none" style={{ textShadow: '0 0 30px rgba(220,38,38,0.2)' }}>{n}</span>
                <div className="flex flex-col gap-2">
                  <h3 className="text-text font-semibold">{title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          VERSUS TABLE
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col gap-10">

          <div className="flex flex-col gap-2 max-w-lg">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-px h-4 bg-accent" />
              <span className="text-xs font-mono uppercase tracking-wider text-muted">Why ABRAND</span>
            </div>
            <h2 className="text-3xl font-bold text-text tracking-tight">
              The prime broker is dead.
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs uppercase tracking-wider text-muted font-normal w-1/3">Feature</th>
                  <th className="pb-3 text-center text-xs uppercase tracking-wider text-muted font-normal">Traditional</th>
                  <th className="pb-3 text-center text-xs uppercase tracking-wider text-accent font-semibold">ABRAND</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Minimum ticket',     '$1M+',        '$0'],
                  ['KYC / paperwork',    '4–8 weeks',   'Wallet connect'],
                  ['Lockup period',      '1–3 years',   'None'],
                  ['Settlement',         'T+30 wire',   'Instant onchain'],
                  ['Transparency',       'Quarterly PDF','Live NAV onchain'],
                  ['Access',             'Accredited only', 'Global, permissionless'],
                ].map(([feature, traditional, abrand]) => (
                  <tr key={feature} className="border-b border-border hover:bg-surface transition-colors">
                    <td className="py-4 text-muted">{feature}</td>
                    <td className="py-4 text-center text-muted font-mono">{traditional}</td>
                    <td className="py-4 text-center font-mono font-semibold text-accent versus-win">{abrand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          BUILT ON
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-border overflow-hidden" style={{ background: '#080808' }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted text-center mb-12">
            Built on
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-10">
            {/* Arc */}
            <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-text transition-colors" />
                <path d="M20 12L28 16.5V25.5L20 30L12 25.5V16.5L20 12Z" fill="currentColor" className="text-muted group-hover:text-accent transition-colors" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">Arc</span>
                <span className="text-[10px] font-mono text-muted">Settlement Layer</span>
              </div>
            </a>

            {/* Chainlink */}
            <a href="https://chain.link" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <path d="M20 4L33 12V28L20 36L7 28V12L20 4Z" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-[#375BD2] transition-colors" />
                <path d="M20 12L27 16V24L20 28L13 24V16L20 12Z" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-[#375BD2] transition-colors" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">Chainlink</span>
                <span className="text-[10px] font-mono text-muted">NAV Oracle</span>
              </div>
            </a>

            {/* Hedera */}
            <a href="https://hedera.com" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <rect x="8" y="8" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-text transition-colors" />
                <path d="M14 14V26M26 14V26M14 20H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted group-hover:text-text transition-colors" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">Hedera</span>
                <span className="text-[10px] font-mono text-muted">Consensus</span>
              </div>
            </a>

            {/* Bridge.xyz */}
            <div className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <path d="M6 26C6 26 13 18 20 18C27 18 34 26 34 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted group-hover:text-success transition-colors" />
                <circle cx="10" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-success transition-colors" />
                <circle cx="30" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-success transition-colors" />
                <line x1="10" y1="17" x2="10" y2="23" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-success transition-colors" />
                <line x1="30" y1="17" x2="30" y2="23" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-success transition-colors" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">Bridge.xyz</span>
                <span className="text-[10px] font-mono text-muted">USD Off-ramp</span>
              </div>
            </div>

            {/* ERC-4626 */}
            <div className="group flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-all duration-300">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <path d="M20 4L36 20L20 36L4 20L20 4Z" stroke="currentColor" strokeWidth="1.5" className="text-muted group-hover:text-[#627EEA] transition-colors" />
                <path d="M20 12L28 20L20 28L12 20L20 12Z" stroke="currentColor" strokeWidth="1" className="text-muted group-hover:text-[#627EEA] transition-colors" opacity="0.5" />
              </svg>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-semibold tracking-wide text-text">ERC-4626</span>
                <span className="text-[10px] font-mono text-muted">Vault Standard</span>
              </div>
            </div>
          </div>

          {/* Separator line */}
          <div className="mt-14 flex justify-center">
            <div className="h-px w-32" style={{ background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.3), transparent)' }} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative border-t border-border overflow-hidden scanlines"
        style={{
          background: 'radial-gradient(ellipse 50% 70% at 50% 90%, rgba(220,38,38,0.12) 0%, transparent 60%), #0A0A0A',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-28 flex flex-col items-center gap-8 text-center">
          <h2 className="text-5xl font-bold text-text tracking-tight leading-tight max-w-xl">
            Stop watching hedge funds win.
            <br />
            <span className="text-accent" style={{ textShadow: '0 0 40px rgba(220,38,38,0.3)' }}>Start participating.</span>
          </h2>
          <p className="text-muted text-lg max-w-md leading-relaxed">
            The same strategies used by the world's best managers.
            Now accessible to everyone, onchain.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fundsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3 bg-accent text-white font-semibold rounded hover:bg-red-700 transition-all btn-glow"
            >
              Browse Funds
            </button>
            <Link
              href="/funds/abrand-fund-i"
              className="px-8 py-3 border border-border text-text font-semibold rounded hover:border-accent hover:text-accent transition-colors"
            >
              View ABRAND Fund I
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-muted font-mono">
          <span>ABRAND © 2026 · ETHGlobal Cannes</span>
          <div className="flex items-center gap-6">
            <span>Built on Arc Testnet</span>
            <span>ERC-4626</span>
          </div>
        </div>
      </footer>

    </div>
  )
}

// ── Stat ─────────────────────────────────────────────────────────────────────

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 md:pl-6 first:pl-0">
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted font-mono">{label}</span>
      <span className={`text-2xl font-bold font-mono tabular-nums ${accent ? 'text-accent stat-value' : 'text-text'}`}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  )
}


// ── FundRow ───────────────────────────────────────────────────────────────────

interface FundRowProps {
  id: string; name: string; strategy: string; aum: string
  ytd: string; ytdPositive: boolean; sharpe: number
  maxDrawdown: number; isActive: boolean
}

function FundRow({ id, name, strategy, aum, ytd, ytdPositive, sharpe, maxDrawdown, isActive }: FundRowProps) {
  const sparkPath = SPARKLINES[id]

  return (
    <tr className={`border-b border-border transition-all duration-150 ${isActive ? 'group hover:bg-surface/80 cursor-pointer fund-row-active' : 'opacity-30'}`}>
      <td className="py-4 pr-6">
        {isActive ? (
          <Link href={`/funds/${id}`} className="font-semibold text-text group-hover:text-accent transition-colors">
            {name}
          </Link>
        ) : (
          <span className="font-semibold text-text">{name}</span>
        )}
      </td>
      <td className="py-4 pr-6">
        <span className="px-2 py-0.5 text-xs border border-border text-muted rounded">
          {strategy}
        </span>
      </td>
      <td className="py-4 pr-6 font-mono tabular-nums text-text text-right">{aum}</td>
      <td className={`py-4 pr-6 font-mono tabular-nums font-semibold text-right ${ytdPositive ? 'text-success' : 'text-error'}`}>
        {ytd}
      </td>
      <td className="py-4 pr-6 font-mono tabular-nums text-text text-right hidden md:table-cell">
        {sharpe.toFixed(2)}
      </td>
      <td className="py-4 pr-6 font-mono tabular-nums text-error text-right hidden lg:table-cell">
        {maxDrawdown}%
      </td>
      <td className="py-4 pr-6 hidden sm:table-cell">
        <svg width="80" height="28" viewBox="0 0 80 28" className="overflow-visible">
          {sparkPath && (
            <path
              d={sparkPath}
              fill="none"
              stroke={ytdPositive ? '#22C55E' : '#EF4444'}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </svg>
      </td>
      <td className="py-4 text-right">
        {isActive ? (
          <Link
            href={`/funds/${id}`}
            className="inline-flex items-center px-4 py-1.5 text-xs font-medium border border-accent text-accent rounded hover:bg-accent hover:text-white transition-colors"
          >
            Invest
          </Link>
        ) : (
          <span className="inline-flex items-center px-4 py-1.5 text-xs border border-border text-muted rounded">
            Soon
          </span>
        )}
      </td>
    </tr>
  )
}
