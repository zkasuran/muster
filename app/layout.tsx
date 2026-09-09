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
  metadataBase: new URL(process.env.MUSTER_ORIGIN_URL ?? 'https://muster.zkasuran.dev'),
  title: { default: 'Muster', template: '%s · Muster' },
  description:
    'Find, compare and hire a live ERC-8004 agent on BNB Smart Chain, in one place.',
  applicationName: 'Muster',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Muster',
    description: 'Find, compare and hire a live ERC-8004 agent on BNB Smart Chain. Every row carries how much is actually known about it.',
    url: '/',
    siteName: 'Muster',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Set the theme class before first paint so there is no flash of the wrong mode. Dark is the
  // default because BNB Chain's brand canvas is dark; a saved choice or the OS preference overrides.
  const noFlash = `(function(){try{var t=localStorage.getItem('muster-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body className="font-sans" suppressHydrationWarning>{children}</body>
    </html>
  )
}
