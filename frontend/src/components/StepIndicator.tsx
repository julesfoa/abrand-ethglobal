interface Step {
  label: string
  done: boolean
  active: boolean
}

export function StepIndicator({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              ${step.done ? 'bg-success text-bg' : step.active ? 'bg-accent text-white' : 'bg-border text-muted'}`}
          >
            {step.done ? '✓' : i + 1}
          </div>
          <span className={`text-sm ${step.active ? 'text-text' : 'text-muted'}`}>
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="text-border mx-1">→</span>}
        </div>
      ))}
    </div>
  )
}
