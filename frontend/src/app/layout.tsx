import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { DynamicProviders } from '@/components/DynamicProviders'
import { Navbar } from '@/components/Navbar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ABRAND',
  description: 'Institutional liquidity, onchain.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-bg text-text flex flex-col">
        <DynamicProviders>
          <Navbar />
          <main role="main" className="flex-1">
            {children}
          </main>
        </DynamicProviders>
      </body>
    </html>
  )
}
