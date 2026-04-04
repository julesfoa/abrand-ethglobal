# ABRAND Design System

## Visual Direction

Black, red, white. Terminal-meets-institutional. Bloomberg data density, not DeFi splash screens.
The fund table IS the product — everything else is chrome.

---

## Color Tokens

```css
--bg:        #0A0A0A   /* pure black page background */
--surface:   #111111   /* table row hover, panel background */
--border:    #222222   /* subtle borders, table dividers */
--border-red:#DC2626   /* red divider lines (hero separator, active row) */
--text:      #FFFFFF   /* primary text */
--muted:     #9CA3AF   /* secondary / labels / placeholder */
--accent:    #DC2626   /* red — CTAs, fund names on hover, key numbers */
--positive:  #22C55E   /* positive YTD returns */
--negative:  #EF4444   /* negative YTD returns */
--success:   #22C55E   /* confirmed transactions */
--error:     #EF4444   /* errors */
```

Tailwind config extension:
```js
colors: {
  bg: '#0A0A0A',
  surface: '#111111',
  border: '#222222',
  'border-red': '#DC2626',
  text: '#FFFFFF',
  muted: '#9CA3AF',
  accent: '#DC2626',
  positive: '#22C55E',
  negative: '#EF4444',
  success: '#22C55E',
  error: '#EF4444',
}
```

---

## Typography

**Font:** Geist (`geist` npm package or `next/font/local`)

| Role | Size | Weight | Notes |
|---|---|---|---|
| Display | 48–64px | 700 | ABRAND logotype |
| Heading | 24–32px | 600 | Section titles, fund names on detail page |
| Body | 16px | 400 | 1.5 line-height — strategy docs, trust copy |
| Small | 14px | 400 | Table labels, captions, badges |
| Table | 14px | 400 | Fund table rows — tabular-nums |
| Mono | 14–16px | 400 | Addresses, amounts — `font-mono tabular-nums` |

No system font stacks. No Inter as fallback — Geist only.

---

## Spacing Scale

Base unit: 4px.

Allowed values: `4 8 12 16 24 32 48 64px`. No arbitrary values.

---

## Border Radius

- Inputs, buttons, badges: `4px`
- Panels: `4px` — keep sharp
- **No large radius** — no `rounded-xl`, `rounded-2xl`, `rounded-full`

---

## Fund Directory Table

The primary UI surface. Think Bloomberg, not Notion.

```
FUND NAME          STRATEGY          AUM         YTD
────────────────────────────────────────────────────── ← red divider (#DC2626)
Apex Capital       Long/Short Eq.    $1.2B       +14.2%    [Invest →]
Renaissance Alpha  Quant Macro       $890M       +22.1%    [Invest →]
Fortress Fund III  Credit Arb.       $340M       +8.7%     [Invest →]
```

- Header row: `--muted` text, `text-xs uppercase tracking-wider`
- Row hover: `--surface` background, fund name turns `--accent` (red)
- YTD positive: `--positive` (green). YTD negative: `--negative` (red).
- Invest button: `border border-accent text-accent` (outlined red), 32px height
- Row divider: `1px solid #222222`
- Table top separator: `1px solid #DC2626` (red)
- Active/selected row: `border-l-2 border-accent` left indicator

---

## Components

### Buttons
- Primary: `bg-accent text-white`, 44px min height, 4px radius, 16px horizontal padding
- Secondary: `border border-accent text-accent bg-transparent`
- Table action: `border border-accent text-accent`, 32px height (desktop table context)
- Tertiary: text-only, `text-accent`
- Disabled: `opacity-40 cursor-not-allowed`
- Loading: spinner icon + disabled state

### Inputs
- Border: `1px solid var(--border)`
- Radius: 4px
- Padding: 16px horizontal, 12px vertical
- Label: always above input, never floating
- Focus: `border-accent outline-none ring-2 ring-accent ring-offset-2 ring-offset-bg`
- Background: `--bg` (pure black inside form)

### Navbar
- Height: 64px
- Background: `--bg` (pure black)
- Border-bottom: `1px solid #222222`
- Layout: `ABRAND` logotype left (white, 700 weight) | [Connect Wallet] right (outlined red button)
- No center stat

### Fund Detail Page Header
- Fund name: 32–48px, white, 700 weight
- Strategy tag: badge, `border border-muted text-muted text-xs`, 4px radius
- AUM + YTD: prominent mono numbers, YTD colored by sign

### Strategy Docs Block
- Background: `--surface` (#111111)
- Border-left: `2px solid #DC2626`
- Padding: 24px
- Text: body size, `--muted` color
- No card shadow, no rounded corners

### Form Pages (deposit on /funds/[id])
- Max-width: 480px
- Right column on desktop (alongside docs on left), full-width on mobile
- Single-column

### Addresses
- Always truncated: `0x1234...5678`
- Font: monospace
- Clickable: copy to clipboard + link to Basescan

---

## Anti-Slop Rules

- No purple/violet/indigo — ever
- No 3-column icon-card grid
- No icons in colored circles
- Form inputs left-aligned, NOT centered
- The fund table IS the hero — no separate hero section with decorative imagery
- No generic DeFi copy ("unlock the power", "gateway", "revolutionize")
- Amounts/addresses always in monospace
- No decorative blobs, no wavy SVG dividers
- No centered headings everywhere
- No bubbly border-radius
- No emoji as design elements

---

## Accessibility Baseline

- Focus rings: `2px solid #DC2626, offset 2px` — never `outline: none`
- Touch targets: 44px minimum (exception: table Invest button = 32px, desktop-primary)
- Color contrast: `--text` (#FFFFFF) on `--bg` (#0A0A0A) = 21:1 (WCAG AAA) ✓
- `--muted` (#9CA3AF) on `--bg` (#0A0A0A) = 5.8:1 (WCAG AA) ✓
- `--accent` (#DC2626) on `--bg` (#0A0A0A) = 5.2:1 (WCAG AA) ✓
- `aria-busy="true"` on buttons during transactions
- `aria-live="polite"` on transaction status regions
- `inputMode="decimal"` on amount inputs
- Fund table: use native `<table><thead><tbody><tr><td>` — not div soup
