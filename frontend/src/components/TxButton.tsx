'use client'

interface TxButtonProps {
  onClick: () => void
  disabled?: boolean
  isPending?: boolean
  children: React.ReactNode
}

export function TxButton({ onClick, disabled, isPending, children }: TxButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isPending}
      aria-busy={isPending}
      className="w-full min-h-[44px] px-4 py-3 bg-accent text-white text-sm font-medium rounded
        hover:bg-red-700 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
    >
      {isPending ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
