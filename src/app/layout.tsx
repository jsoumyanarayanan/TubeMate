// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { SITE_URL } from '@/lib/seo'
import { QuickExit } from '@/components/Discreet'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'TUBEMATE', template: '%s | TUBEMATE' },
  description: 'Adults only (18+).',
  // RTA label so parental filters can block the site. Root level, so every page carries it.
  other: { rating: 'RTA-5042-1996-1400-1577-RTA' },
}
export const viewport: Viewport = { themeColor: '#0b0b0f' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <QuickExit />
      </body>
    </html>
  )
}
