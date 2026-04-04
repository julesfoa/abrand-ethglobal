export interface MonthlyReturn {
  month: number   // 1–12
  ret: number     // e.g. 1.8 means +1.8%
}

export interface AnnualRecord {
  year: number
  ret: number
  monthly: MonthlyReturn[]
}

export interface FundMetrics {
  sharpe: number
  maxDrawdown: number   // negative, e.g. -4.2
  volatility: number    // annualised, e.g. 8.3
  inceptionDate: string // "Jan 2021"
  inceptionReturn: number // cumulative since inception, e.g. 48.7
}

export interface Fund {
  id: string
  name: string
  strategy: string
  aum: string
  ytd: string
  ytdPositive: boolean
  description: string[]
  isActive: boolean
  metrics: FundMetrics
  annualReturns: AnnualRecord[]
}

// ─── ABRAND Fund I ────────────────────────────────────────────────────────────
const abrandMonthly2026: MonthlyReturn[] = [
  { month: 1,  ret:  2.4 },
  { month: 2,  ret:  1.1 },
  { month: 3,  ret: -0.3 },
]
const abrandMonthly2025: MonthlyReturn[] = [
  { month: 1,  ret:  1.6 },
  { month: 2,  ret:  0.7 },
  { month: 3,  ret:  1.3 },
  { month: 4,  ret: -0.5 },
  { month: 5,  ret:  0.9 },
  { month: 6,  ret:  1.8 },
  { month: 7,  ret: -0.2 },
  { month: 8,  ret:  1.4 },
  { month: 9,  ret:  0.6 },
  { month: 10, ret: -0.7 },
  { month: 11, ret:  2.1 },
  { month: 12, ret:  1.5 },
]
const abrandMonthly2024: MonthlyReturn[] = [
  { month: 1,  ret:  1.8 },
  { month: 2,  ret:  0.9 },
  { month: 3,  ret: -0.4 },
  { month: 4,  ret:  0.7 },
  { month: 5,  ret:  1.2 },
  { month: 6,  ret: -0.8 },
  { month: 7,  ret:  0.9 },
  { month: 8,  ret:  0.3 },
  { month: 9,  ret: -0.6 },
  { month: 10, ret:  0.8 },
  { month: 11, ret:  1.1 },
  { month: 12, ret: -1.7 },
]
const abrandMonthly2023: MonthlyReturn[] = [
  { month: 1,  ret:  2.1 },
  { month: 2,  ret:  1.4 },
  { month: 3,  ret: -0.6 },
  { month: 4,  ret:  1.3 },
  { month: 5,  ret:  0.8 },
  { month: 6,  ret:  1.1 },
  { month: 7,  ret: -0.3 },
  { month: 8,  ret:  1.6 },
  { month: 9,  ret:  0.7 },
  { month: 10, ret: -0.9 },
  { month: 11, ret:  2.4 },
  { month: 12, ret:  2.5 },
]
const abrandMonthly2022: MonthlyReturn[] = [
  { month: 1,  ret:  0.6 },
  { month: 2,  ret:  0.4 },
  { month: 3,  ret:  1.2 },
  { month: 4,  ret: -0.8 },
  { month: 5,  ret:  0.9 },
  { month: 6,  ret:  0.3 },
  { month: 7,  ret:  0.8 },
  { month: 8,  ret: -0.2 },
  { month: 9,  ret:  0.7 },
  { month: 10, ret:  1.1 },
  { month: 11, ret:  0.6 },
  { month: 12, ret:  0.2 },
]
const abrandMonthly2021: MonthlyReturn[] = [
  { month: 1,  ret:  3.2 },
  { month: 2,  ret:  1.8 },
  { month: 3,  ret:  2.1 },
  { month: 4,  ret:  1.4 },
  { month: 5,  ret: -0.7 },
  { month: 6,  ret:  2.3 },
  { month: 7,  ret:  1.6 },
  { month: 8,  ret:  1.9 },
  { month: 9,  ret: -1.2 },
  { month: 10, ret:  2.4 },
  { month: 11, ret:  1.8 },
  { month: 12, ret:  1.8 },
]

// ─── Apex Capital ─────────────────────────────────────────────────────────────
const apexMonthly2026: MonthlyReturn[] = [
  { month: 1,  ret:  4.8 },
  { month: 2,  ret:  2.3 },
  { month: 3,  ret: -1.1 },
]
const apexMonthly2025: MonthlyReturn[] = [
  { month: 1,  ret:  3.6 },
  { month: 2,  ret:  1.9 },
  { month: 3,  ret:  2.4 },
  { month: 4,  ret: -1.8 },
  { month: 5,  ret:  3.2 },
  { month: 6,  ret:  1.1 },
  { month: 7,  ret: -0.7 },
  { month: 8,  ret:  2.9 },
  { month: 9,  ret:  1.6 },
  { month: 10, ret: -0.4 },
  { month: 11, ret:  4.1 },
  { month: 12, ret:  3.3 },
]
const apexMonthly2024: MonthlyReturn[] = [
  { month: 1,  ret:  3.2 },
  { month: 2,  ret:  2.1 },
  { month: 3,  ret:  1.8 },
  { month: 4,  ret: -1.2 },
  { month: 5,  ret:  2.8 },
  { month: 6,  ret: -0.4 },
  { month: 7,  ret:  3.1 },
  { month: 8,  ret:  1.9 },
  { month: 9,  ret: -0.8 },
  { month: 10, ret:  2.6 },
  { month: 11, ret:  4.2 },
  { month: 12, ret:  2.8 },
]
const apexMonthly2023: MonthlyReturn[] = [
  { month: 1,  ret:  4.1 },
  { month: 2,  ret:  2.8 },
  { month: 3,  ret: -1.4 },
  { month: 4,  ret:  3.2 },
  { month: 5,  ret:  1.9 },
  { month: 6,  ret:  2.7 },
  { month: 7,  ret: -0.6 },
  { month: 8,  ret:  3.8 },
  { month: 9,  ret:  1.4 },
  { month: 10, ret: -1.1 },
  { month: 11, ret:  5.6 },
  { month: 12, ret:  6.0 },
]
const apexMonthly2022: MonthlyReturn[] = [
  { month: 1,  ret:  1.8 },
  { month: 2,  ret: -0.9 },
  { month: 3,  ret:  2.6 },
  { month: 4,  ret:  1.4 },
  { month: 5,  ret: -1.8 },
  { month: 6,  ret:  1.2 },
  { month: 7,  ret:  2.1 },
  { month: 8,  ret:  0.8 },
  { month: 9,  ret:  1.7 },
  { month: 10, ret:  2.4 },
  { month: 11, ret:  1.6 },
  { month: 12, ret:  1.3 },
]

// ─── Fortress Fund III ────────────────────────────────────────────────────────
const fortressMonthly2026: MonthlyReturn[] = [
  { month: 1,  ret:  0.9 },
  { month: 2,  ret:  0.7 },
  { month: 3,  ret:  0.5 },
]
const fortressMonthly2025: MonthlyReturn[] = [
  { month: 1,  ret:  0.8 },
  { month: 2,  ret:  0.6 },
  { month: 3,  ret:  0.9 },
  { month: 4,  ret: -0.1 },
  { month: 5,  ret:  0.7 },
  { month: 6,  ret:  0.8 },
  { month: 7,  ret:  0.5 },
  { month: 8,  ret:  0.9 },
  { month: 9,  ret:  0.6 },
  { month: 10, ret:  0.4 },
  { month: 11, ret:  1.0 },
  { month: 12, ret:  0.7 },
]
const fortressMonthly2024: MonthlyReturn[] = [
  { month: 1,  ret:  0.8 },
  { month: 2,  ret:  0.6 },
  { month: 3,  ret:  0.7 },
  { month: 4,  ret:  0.4 },
  { month: 5,  ret:  0.9 },
  { month: 6,  ret:  0.8 },
  { month: 7,  ret:  0.6 },
  { month: 8,  ret:  0.7 },
  { month: 9,  ret:  0.5 },
  { month: 10, ret:  0.8 },
  { month: 11, ret:  1.1 },
  { month: 12, ret:  0.8 },
]
const fortressMonthly2023: MonthlyReturn[] = [
  { month: 1,  ret:  0.7 },
  { month: 2,  ret:  0.5 },
  { month: 3,  ret:  0.6 },
  { month: 4,  ret: -0.3 },
  { month: 5,  ret:  0.8 },
  { month: 6,  ret:  0.7 },
  { month: 7,  ret:  0.6 },
  { month: 8,  ret:  0.8 },
  { month: 9,  ret:  0.5 },
  { month: 10, ret:  0.4 },
  { month: 11, ret:  0.9 },
  { month: 12, ret:  1.0 },
]
const fortressMonthly2022: MonthlyReturn[] = [
  { month: 1,  ret:  0.4 },
  { month: 2,  ret:  0.3 },
  { month: 3,  ret:  0.5 },
  { month: 4,  ret: -0.2 },
  { month: 5,  ret:  0.4 },
  { month: 6,  ret:  0.3 },
  { month: 7,  ret:  0.4 },
  { month: 8,  ret:  0.3 },
  { month: 9,  ret:  0.2 },
  { month: 10, ret:  0.5 },
  { month: 11, ret:  0.6 },
  { month: 12, ret:  0.4 },
]

export const funds: Fund[] = [
  {
    id: 'abrand-fund-i',
    name: 'ABRAND Fund I',
    strategy: 'Long/Short Equity',
    aum: '$1.2M',
    ytd: '+3.2%',
    ytdPositive: true,
    isActive: true,
    metrics: {
      sharpe: 1.84,
      maxDrawdown: -4.2,
      volatility: 8.3,
      inceptionDate: 'Jan 2021',
      inceptionReturn: 68.4,
    },
    annualReturns: [
      { year: 2026, ret: 3.2,  monthly: abrandMonthly2026 },
      { year: 2025, ret: 10.5, monthly: abrandMonthly2025 },
      { year: 2024, ret: 4.2,  monthly: abrandMonthly2024 },
      { year: 2023, ret: 12.1, monthly: abrandMonthly2023 },
      { year: 2022, ret: 5.8,  monthly: abrandMonthly2022 },
      { year: 2021, ret: 18.4, monthly: abrandMonthly2021 },
    ],
    description: [
      'ABRAND Fund I deploys a systematic long-short equity strategy focused on US mid-cap stocks with strong momentum and improving earnings quality. The fund uses a factor-based model combining price momentum, earnings revisions, and balance sheet quality to construct a market-neutral portfolio with a target beta of 0.1–0.3.',
      'Capital is deployed across two books: a long book targeting high-conviction opportunities with 2–4% position sizes, and a short book hedging sector and factor exposures. Gross exposure is maintained between 150% and 200%, with net exposure capped at 30%. The fund rebalances monthly.',
      'Investors deposit USDC onchain and receive ERC4626 vault shares priced at the current NAV. Returns are reflected in NAV appreciation — no distributions. Redemptions are processed within 24 hours of request, with proceeds delivered in USDC or wired to your bank account via Bridge.xyz.',
    ],
  },
  {
    id: 'apex-capital',
    name: 'Apex Capital',
    strategy: 'Quant Macro',
    aum: '$890M',
    ytd: '+6.0%',
    ytdPositive: true,
    isActive: false,
    metrics: {
      sharpe: 2.41,
      maxDrawdown: -8.6,
      volatility: 14.7,
      inceptionDate: 'Mar 2019',
      inceptionReturn: 198.6,
    },
    annualReturns: [
      { year: 2026, ret: 6.0,  monthly: apexMonthly2026 },
      { year: 2025, ret: 21.2, monthly: apexMonthly2025 },
      { year: 2024, ret: 22.1, monthly: apexMonthly2024 },
      { year: 2023, ret: 28.4, monthly: apexMonthly2023 },
      { year: 2022, ret: 14.2, monthly: apexMonthly2022 },
    ],
    description: [
      "Apex Capital runs a quantitative global macro strategy across equities, fixed income, currencies, and commodities. The fund's models analyze cross-asset momentum and mean-reversion signals across 50+ liquid markets, with a strong track record in trending regimes.",
      'Onchain access to Apex Capital is coming soon. Join the waitlist to be notified when deposits open.',
    ],
  },
  {
    id: 'fortress-fund-iii',
    name: 'Fortress Fund III',
    strategy: 'Credit Arbitrage',
    aum: '$340M',
    ytd: '+2.1%',
    ytdPositive: true,
    isActive: false,
    metrics: {
      sharpe: 3.12,
      maxDrawdown: -1.8,
      volatility: 3.2,
      inceptionDate: 'Jun 2020',
      inceptionReturn: 44.8,
    },
    annualReturns: [
      { year: 2026, ret: 2.1,  monthly: fortressMonthly2026 },
      { year: 2025, ret: 7.8,  monthly: fortressMonthly2025 },
      { year: 2024, ret: 8.7,  monthly: fortressMonthly2024 },
      { year: 2023, ret: 7.2,  monthly: fortressMonthly2023 },
      { year: 2022, ret: 4.1,  monthly: fortressMonthly2022 },
    ],
    description: [
      'Fortress Fund III exploits pricing inefficiencies in investment-grade and high-yield credit markets, focusing on basis trades between cash bonds and CDS. The fund targets low-volatility absolute returns with limited market directionality.',
      'Onchain access to Fortress Fund III is coming soon. Join the waitlist to be notified when deposits open.',
    ],
  },
]

export function getFundById(id: string): Fund | undefined {
  return funds.find((f) => f.id === id)
}
