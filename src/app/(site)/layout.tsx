// src/app/(site)/layout.tsx
import type { ReactNode } from 'react'
import { Providers } from '@/context/Providers'
import { AgeGate } from '@/components/AgeGate'
import { Header } from '@/components/Header'
import { CookieBanner } from '@/components/CookieBanner'
import { BottomNav, Footer, Sidebar } from '@/components/Shell'
import { AdSlot, Interstitial, StickyMobileAd } from '@/components/Ads'
import { InstallPrompt, Prompts } from '@/components/Growth'
import { MiniPlayer } from '@/components/MiniPlayer'
import { Lifecycle } from '@/components/Lifecycle'

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AgeGate>
        <Header />
        <InstallPrompt />
        <AdSlot id="header" className="px-4 pt-3" />
        <div className="mx-auto flex max-w-[1600px]">
          <Sidebar />
          {/* min-h-screen keeps the footer below the first screen, so it never jumps when content loads */}
          <main className="min-h-screen min-w-0 flex-1 p-4">{children}</main>
        </div>
        <AdSlot id="footer" className="px-4 pb-4" />
        <Footer />
        <StickyMobileAd />
        <Interstitial />
        <BottomNav />
        <MiniPlayer />
        <CookieBanner />
        <Prompts />
        <Lifecycle />
      </AgeGate>
    </Providers>
  )
}
