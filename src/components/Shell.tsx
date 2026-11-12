// src/components/Shell.tsx
// Sidebar, footer, mobile bottom nav and skeleton. Small pieces kept in one file.
'use client'
import Link from 'next/link'
import { Home, Radio, Sparkles, User, Wallet } from 'lucide-react'
import { getCategories } from '@/lib/api'
import { useData } from '@/lib/store'
import { NewsletterBox } from '@/components/Extras'
import { AdSlot } from '@/components/Ads'
import { FooterLinks } from '@/components/Growth'

export function Sidebar() {
  const categories = useData(getCategories) ?? []
  return (
    <aside className="sticky top-[105px] hidden h-[calc(100vh-105px)] w-56 shrink-0 overflow-y-auto border-r border-line p-3 lg:block">
      <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">Categories</h2>
      <nav aria-label="Categories" className="grid">
        {categories.map((c) => (
          <Link key={c.slug} href={`/category/${c.slug}`} className="rounded px-2 py-2 text-sm text-muted hover:bg-surface hover:text-fg">
            {c.name}
          </Link>
        ))}
      </nav>
      <AdSlot id="sidebar" className="mt-4" />
    </aside>
  )
}

const legal = [
  ['Terms', '/terms'],
  ['Privacy', '/privacy'],
  ['Cookies', '/cookies'],
  ['Safety', '/safety'],
  ['Report Abuse', '/report-abuse'],
  ['Feed settings', '/account/feed'],
  ['Referrals', '/referrals'],
  ['Affiliates', '/affiliates'],
  ['Store', '/store'],
  ['Redeem', '/redeem'],
  ['2257 Statement', '/2257'],
  ['Content Removal', '/content-removal'],
  ['Parental Controls', '/parental-controls'],
  ['Contact', '/contact'],
] as const

export function Footer() {
  return (
    <footer className="border-t border-line px-4 pb-24 pt-6 text-sm text-muted md:pb-6">
      <nav aria-label="Legal" className="mx-auto flex max-w-[1600px] flex-wrap gap-x-2">
        {legal.map(([label, href]) => (
          <Link key={href} href={href} className="flex min-h-11 items-center px-2 hover:text-fg">
            {label}
          </Link>
        ))}
      </nav>
      <FooterLinks />
      <NewsletterBox />
      <p className="mx-auto max-w-[1600px] px-2 pt-2">Adults only (18+). All performers are verified adults.</p>
    </footer>
  )
}

const tabs = [
  ['For You', '/foryou', Sparkles],
  ['Home', '/', Home],
  ['Live', '/live', Radio],
  ['Wallet', '/wallet', Wallet],
  ['Account', '/account', User],
] as const

export function BottomNav() {
  return (
    <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-ink md:hidden">
      {tabs.map(([label, href, Icon]) => (
        <Link key={href} href={href} className="grid min-h-14 place-items-center content-center gap-0.5 text-xs text-muted">
          <Icon size={20} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div aria-busy="true" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video rounded-lg bg-surface" />
          <div className="mt-2 h-3 w-3/4 rounded bg-surface" />
          <div className="mt-1 h-3 w-1/2 rounded bg-surface" />
        </div>
      ))}
    </div>
  )
}
