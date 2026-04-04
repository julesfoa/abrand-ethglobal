'use client'

interface AmountInputProps {
  label: string
  value: string
  onChange: (v: string) => void
  max?: string
  disabled?: boolean
  symbol?: string
}

export function AmountInput({
  label,
  value,
  onChange,
  max,
  disabled,
  symbol = 'USDC',
}: AmountInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-muted">{label}</label>
      <div className="flex items-center border border-border rounded bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="0.00"
          className="flex-1 bg-transparent px-4 py-3 text-text font-mono tabular-nums outline-none placeholder:text-muted disabled:opacity-50"
        />
        {max !== undefined && !disabled && (
          <button
            type="button"
            onClick={() => onChange(max)}
            className="px-4 py-3 text-xs text-accent hover:text-text transition-colors"
          >
            MAX
          </button>
        )}
        <span className="px-4 py-3 text-sm text-muted border-l border-border">{symbol}</span>
      </div>
    </div>
  )
}
