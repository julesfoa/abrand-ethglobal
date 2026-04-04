'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignMessage } from 'wagmi'
import { useProtocol } from '@/hooks/useProtocol'

type Step = 'amount' | 'beneficiary' | 'bank' | 'done'

interface FormData {
  amount: string
  name: string
  country: string
  bankName: string
  accountNumber: string
  routingNumber: string
}

function validateBank(data: FormData): string | null {
  if (!data.bankName.trim()) return 'Bank name is required.'
  if (!data.accountNumber.trim()) return 'Account number is required.'
  if (!/^\d{9}$/.test(data.routingNumber)) return 'Routing number must be 9 digits.'
  return null
}

export default function ConvertPage() {
  const { address } = useProtocol()
  const router = useRouter()
  const { signMessageAsync } = useSignMessage()

  const [step, setStep] = useState<Step>('amount')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    amount: '',
    name: '',
    country: 'US',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
  })

  function update(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    setError(null)
    const bankError = validateBank(form)
    if (bankError) { setError(bankError); return }

    if (!address) { setError('Wallet not connected.'); return }

    try {
      setLoading(true)
      const ts = Date.now()
      const message = `ABRAND wire transfer ${form.amount} ${ts}`
      const signature = await signMessageAsync({ message })

      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: form.amount,
          address,
          signature,
          message,
          beneficiary: { name: form.name },
          bank: {
            name: form.bankName,
            account: form.accountNumber,
            routing: form.routingNumber,
            country: form.country,
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }

      const data = await res.json()
      setReference(data.reference ?? 'ABRAND-' + ts)
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!address) {
    return (
      <PageWrap>
        <p className="text-muted text-sm">Connect your wallet to continue.</p>
      </PageWrap>
    )
  }

  if (step === 'done') {
    return (
      <PageWrap>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-success">Wire initiated</h1>
          <p className="text-sm text-muted">
            Reference:{' '}
            <span className="font-mono text-text tabular-nums">{reference}</span>
          </p>
          <p className="text-sm text-muted">Funds arrive in 1–3 business days.</p>
          <p className="text-sm text-muted">
            You will receive a confirmation email from Bridge.xyz. No further action needed in this app.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 w-full min-h-[44px] px-4 py-3 border border-border text-muted text-sm rounded
              hover:text-text hover:border-text transition-colors
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
          >
            Back to home
          </button>
        </div>
      </PageWrap>
    )
  }

  return (
    <PageWrap>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => router.push('/redeem')}
          className="text-sm text-muted hover:text-text transition-colors"
        >
          ← Back to Redeem
        </button>
      </div>

      <h1 className="text-2xl font-semibold text-text mb-8">Convert to USD</h1>

      <form
        aria-label="Wire transfer form"
        onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
        className="flex flex-col gap-6"
      >
        {/* Step 1: Amount */}
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="text-sm font-medium text-text mb-2">Amount</legend>
          <Field label="USDC amount">
            <input
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
              placeholder="0.00"
              className={inputClass}
              required
            />
          </Field>
          <p className="text-xs text-muted">Estimated arrival: 1–3 business days.</p>
        </fieldset>

        <hr className="border-border" />

        {/* Step 2: Beneficiary */}
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="text-sm font-medium text-text mb-2">Beneficiary</legend>
          <Field label="Full legal name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Jane Smith"
              className={inputClass}
              required
            />
          </Field>
          <Field label="Bank country">
            <select
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              className={inputClass}
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="EU">European Union</option>
            </select>
          </Field>
        </fieldset>

        <hr className="border-border" />

        {/* Step 3: Bank */}
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="text-sm font-medium text-text mb-2">Bank details</legend>
          <Field label="Bank name">
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => update('bankName', e.target.value)}
              placeholder="Chase Bank"
              className={inputClass}
              required
            />
          </Field>
          <Field label="Account number">
            <input
              type="password"
              inputMode="numeric"
              value={form.accountNumber}
              onChange={(e) => update('accountNumber', e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              required
            />
          </Field>
          <Field label="Routing number (9 digits)">
            <input
              type="text"
              inputMode="numeric"
              value={form.routingNumber}
              onChange={(e) => update('routingNumber', e.target.value)}
              placeholder="021000021"
              maxLength={9}
              className={inputClass}
              required
            />
          </Field>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full min-h-[44px] px-4 py-3 bg-accent text-white text-sm font-medium rounded
            hover:bg-[#1e63b5] transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
        >
          {loading ? 'Initiating wire...' : 'Initiate Wire Transfer'}
        </button>
      </form>
    </PageWrap>
  )
}

const inputClass =
  'w-full bg-surface border border-border rounded px-4 py-3 text-text text-sm outline-none ' +
  'focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ' +
  'placeholder:text-muted'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-muted">{label}</label>
      {children}
    </div>
  )
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-[480px] flex flex-col gap-6">
        {children}
      </div>
    </div>
  )
}
