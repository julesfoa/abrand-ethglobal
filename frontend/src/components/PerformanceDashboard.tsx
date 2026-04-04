'use client'

import { useState } from 'react'
import type { Fund, AnnualRecord } from '@/data/funds'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface Props {
  fund: Fund
}

export function PerformanceDashboard({ fund }: Props) {
  const [selectedYear, setSelectedYear] = useState<number>(fund.annualReturns[0].year)

  const selected = fund.annualReturns.find((r) => r.year === selectedYear)!
  const allRets = fund.annualReturns.map((r) => r.ret)
  const maxAbsAnnual = Math.max(...allRets.map(Math.abs))

  // Cumulative NAV line from monthly returns of selected year
  const nav = navFromMonthly(selected.monthly)

  return (
    <div className="flex flex-col gap-6 border-t border-border pt-8 mt-2">

      {/* ── Key metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border rounded overflow-hidden">
        <Metric label="Since Inception" value={`+${fund.metrics.inceptionReturn}%`} accent />
        <Metric label="Sharpe Ratio" value={fund.metrics.sharpe.toFixed(2)} />
        <Metric label="Ann. Volatility" value={`${fund.metrics.volatility}%`} />
        <Metric label="Max Drawdown" value={`${fund.metrics.maxDrawdown}%`} negative />
        <Metric label="Inception" value={fund.metrics.inceptionDate} />
      </div>

      {/* ── Year tabs + bar chart ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted">Annual Returns</p>
          <div className="flex gap-1">
            {fund.annualReturns.map((r) => (
              <button
                key={r.year}
                onClick={() => setSelectedYear(r.year)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  selectedYear === r.year
                    ? 'bg-accent text-white'
                    : 'border border-border text-muted hover:border-accent hover:text-text'
                }`}
              >
                {r.year}
              </button>
            ))}
          </div>
        </div>

        {/* Annual bar chart */}
        <AnnualBars
          records={fund.annualReturns}
          selected={selectedYear}
          maxAbs={maxAbsAnnual}
          onSelect={setSelectedYear}
        />
      </div>

      {/* ── Monthly grid + NAV line ──────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Monthly return grid */}
        <div className="flex flex-col gap-2 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted">
            Monthly Returns — {selectedYear}
          </p>
          <MonthlyGrid monthly={selected.monthly} />
        </div>

        {/* NAV line chart */}
        <div className="flex flex-col gap-2 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted">
            Cumulative NAV — {selectedYear}
          </p>
          <NavLine nav={nav} />
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Metric({ label, value, accent, negative }: {
  label: string; value: string; accent?: boolean; negative?: boolean
}) {
  return (
    <div className="bg-surface px-4 py-3 flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-lg font-mono tabular-nums font-semibold ${
        accent ? 'text-accent' : negative ? 'text-error' : 'text-text'
      }`}>
        {value}
      </span>
    </div>
  )
}

function AnnualBars({ records, selected, maxAbs, onSelect }: {
  records: AnnualRecord[]
  selected: number
  maxAbs: number
  onSelect: (y: number) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const BAR_MAX_H = 80

  return (
    <div className="bg-surface rounded px-6 py-4">
      <div className="flex items-end justify-center gap-8" style={{ height: 120 }}>
        {records.map((r) => {
          const isSelected = r.year === selected
          const isHov = r.year === hovered
          const h = Math.max(8, (Math.abs(r.ret) / maxAbs) * BAR_MAX_H)
          const positive = r.ret >= 0

          return (
            <button
              key={r.year}
              onClick={() => onSelect(r.year)}
              onMouseEnter={() => setHovered(r.year)}
              onMouseLeave={() => setHovered(null)}
              className="flex flex-col items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-accent rounded"
              style={{ width: 56 }}
              aria-label={`${r.year}: ${r.ret >= 0 ? '+' : ''}${r.ret.toFixed(1)}%`}
            >
              {/* Value label */}
              <span className={`text-xs font-mono tabular-nums transition-opacity ${
                isHov || isSelected ? 'opacity-100' : 'opacity-0'
              } ${positive ? 'text-success' : 'text-error'}`}>
                {r.ret >= 0 ? '+' : ''}{r.ret.toFixed(1)}%
              </span>
              {/* Bar */}
              <div
                style={{ height: h, width: 32 }}
                className={`rounded transition-all ${
                  isSelected
                    ? positive ? 'bg-success' : 'bg-error'
                    : positive ? 'bg-success/30' : 'bg-error/30'
                } ${isHov && !isSelected ? 'brightness-125' : ''}`}
              />
              {/* Year label */}
              <span className={`text-xs font-mono ${isSelected ? 'text-text font-semibold' : 'text-muted'}`}>
                {r.year}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyGrid({ monthly }: { monthly: { month: number; ret: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const maxAbs = Math.max(...monthly.map((m) => Math.abs(m.ret)))

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {monthly.map((m) => {
        const positive = m.ret >= 0
        const intensity = Math.abs(m.ret) / maxAbs
        const isHov = hovered === m.month

        return (
          <div
            key={m.month}
            onMouseEnter={() => setHovered(m.month)}
            onMouseLeave={() => setHovered(null)}
            className="relative flex flex-col items-center justify-center py-3 rounded cursor-default select-none border border-transparent hover:border-border transition-colors"
            style={{
              backgroundColor: positive
                ? `rgba(34, 197, 94, ${0.06 + intensity * 0.2})`
                : `rgba(239, 68, 68, ${0.06 + intensity * 0.2})`,
            }}
          >
            <span className="text-xs text-muted">{MONTHS[m.month - 1]}</span>
            <span className={`text-xs font-mono tabular-nums font-semibold ${
              positive ? 'text-success' : 'text-error'
            }`}>
              {m.ret >= 0 ? '+' : ''}{m.ret.toFixed(1)}%
            </span>

            {/* Hover tooltip with absolute return */}
            {isHov && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface border border-border rounded text-xs text-text whitespace-nowrap z-10">
                {MONTHS[m.month - 1]}: {m.ret >= 0 ? '+' : ''}{m.ret.toFixed(2)}%
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function NavLine({ nav }: { nav: number[] }) {
  const W = 320
  const H = 80
  const PAD = { top: 8, bottom: 20, left: 32, right: 8 }

  const minV = Math.min(...nav)
  const maxV = Math.max(...nav)
  const range = maxV - minV || 1

  const pts = nav.map((v, i) => {
    const x = PAD.left + (i / (nav.length - 1)) * (W - PAD.left - PAD.right)
    const y = PAD.top + ((maxV - v) / range) * (H - PAD.top - PAD.bottom)
    return { x, y, v }
  })

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Fill under the line
  const fillD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${PAD.left.toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`

  const [tooltip, setTooltip] = useState<{ x: number; y: number; v: number; label: string } | null>(null)

  return (
    <div className="bg-surface rounded p-3">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Zero baseline */}
        {(() => {
          const zeroV = 100
          const zy = PTtoY(zeroV, minV, maxV, range, H, PAD)
          return (
            <line
              x1={PAD.left} y1={zy}
              x2={W - PAD.right} y2={zy}
              stroke="#222222" strokeWidth="1"
            />
          )
        })()}

        {/* Y axis labels */}
        <text x={0} y={PAD.top + 4} fill="#9CA3AF" fontSize="9" textAnchor="start">
          {maxV.toFixed(1)}
        </text>
        <text x={0} y={H - PAD.bottom - 2} fill="#9CA3AF" fontSize="9" textAnchor="start">
          {minV.toFixed(1)}
        </text>

        {/* X axis month labels */}
        {[0, 3, 6, 9, 11].map((i) => (
          <text
            key={i}
            x={PAD.left + (i / 11) * (W - PAD.left - PAD.right)}
            y={H - 4}
            fill="#9CA3AF"
            fontSize="9"
            textAnchor="middle"
          >
            {MONTHS[i]}
          </text>
        ))}

        {/* Fill */}
        <path d={fillD} fill="#DC2626" fillOpacity="0.06" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Hover dots */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill="transparent"
            onMouseEnter={() =>
              setTooltip({ x: p.x, y: p.y, v: p.v, label: MONTHS[i] })
            }
          />
        ))}

        {/* Active dot + tooltip */}
        {tooltip && (
          <>
            <circle cx={tooltip.x} cy={tooltip.y} r={3} fill="#DC2626" />
            <rect
              x={Math.min(tooltip.x - 22, W - 56)}
              y={tooltip.y - 22}
              width={50}
              height={16}
              rx={2}
              fill="#111111"
              stroke="#222222"
            />
            <text
              x={Math.min(tooltip.x - 22, W - 56) + 25}
              y={tooltip.y - 10}
              fill="#FFFFFF"
              fontSize="9"
              textAnchor="middle"
            >
              {tooltip.label} {tooltip.v.toFixed(2)}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function PTtoY(v: number, minV: number, maxV: number, range: number, H: number, PAD: { top: number; bottom: number }) {
  return PAD.top + ((maxV - v) / range) * (H - PAD.top - PAD.bottom)
}

/** Convert monthly % returns into cumulative NAV starting at 100 */
function navFromMonthly(monthly: { month: number; ret: number }[]): number[] {
  const sorted = [...monthly].sort((a, b) => a.month - b.month)
  const nav: number[] = [100]
  sorted.forEach((m) => {
    nav.push(nav[nav.length - 1] * (1 + m.ret / 100))
  })
  return nav
}
