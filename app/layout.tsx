import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Muster',
  description:
    'Find, compare and hire a live ERC-8004 agent on BNB Smart Chain, in one place.',
  applicationName: 'Muster',
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
