'use client'

import dynamic from 'next/dynamic'

const Providers = dynamic(() => import('./Providers').then((m) => m.Providers), { ssr: false })

export function DynamicProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
