import type { Metadata } from 'next'
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

// Typefaces from the Opensource UI design reference: Instrument Serif for brand display,
// Geist for UI text, Geist Mono for figures. Mono matters here beyond taste, because a
// buyer compares APYs and health factors down a column.
const display = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display-loaded',
  display: 'swap',
})
const sans = Geist({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-loaded', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Muster', template: '%s · Muster' },
  description:
    'Find, compare and hire a live ERC-8004 agent on BNB Smart Chain, in one place.',
  applicationName: 'Muster',
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
