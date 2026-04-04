'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'abrand-auth'
const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'abrand2026'

export function PasswordGate({ children, label }: { children: React.ReactNode; label: string }) {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === 'true') {
      setAuthed(true)
    }
  }, [])

  if (authed) return <>{children}</>

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      setAuthed(true)
    } else {
      setError(true)
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-text">{label}</h1>
          <p className="text-sm text-muted">Enter the password to continue.</p>
        </div>

        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Password"
          autoFocus
          className={`w-full bg-surface border rounded px-4 py-3 text-text text-sm outline-none
            placeholder:text-muted transition-colors
            focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg
            ${error ? 'border-error' : 'border-border focus:border-accent'}`}
        />

        {error && (
          <p className="text-sm text-error">Wrong password.</p>
        )}

        <button
          type="submit"
          className="w-full min-h-[44px] px-4 py-3 bg-accent text-white text-sm font-semibold rounded
            hover:bg-red-700 transition-colors
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
        >
          Unlock
        </button>
      </form>
    </div>
  )
}
