// src/components/Header.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Coins, Menu, Search, X } from 'lucide-react'
import { useAuth, useWallet } from '@/context/Providers'
import { PrivacyMenu } from '@/components/Discreet'
import { MoodPicker } from '@/components/Mood'

const links = [
  ['Home', '/'],
  ['For You', '/foryou'],
  ['Categories', '/categories'],
  ['Performers', '/performers'],
  ['Live', '/live'],
  ['Calls', '/calls'],
  ['AI Characters', '/ai'],
  ['Series', '/series'],
  ['Pay-per-view', '/ppv'],
  ['Premium', '/premium'],
] as const

export function Header() {
  const [open, setOpen] = useState(false)
  const { user, openLogin, logout } = useAuth()
  const { balance, openTopUp } = useWallet()

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2">
        <Link href="/" className="text-xl font-bold text-accent">
          TUBEMATE
        </Link>

        <form action="/search" role="search" className="mx-auto hidden w-full max-w-xl md:block">
          <label className="flex items-center gap-2 rounded-full border border-line bg-surface px-4">
            <Search size={18} className="text-muted" aria-hidden />
            <span className="sr-only">Search videos</span>
            <input name="q" placeholder="Search" className="min-h-11 w-full bg-transparent outline-none" />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/search" aria-label="Search" className="grid size-11 place-items-center md:hidden">
            <Search size={20} />
          </Link>
          <button onClick={user ? openTopUp : openLogin} className="flex min-h-11 items-center gap-1 rounded-full border border-line px-3 text-sm">
            <Coins size={16} className="text-accent" aria-hidden /> {balance}
            <span className="hidden sm:inline">tokens</span>
          </button>
          {user ? (
            <Link href="/account" className="hidden min-h-11 items-center rounded-full border border-line px-4 text-sm md:flex">
              {user.name}
              {user.isPremium && <span className="ml-2 rounded bg-accent px-1.5 text-[11px] font-semibold text-white">Premium</span>}
            </Link>
          ) : (
            <button onClick={openLogin} className="hidden min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-white md:block">
              Log in
            </button>
          )}
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            aria-expanded={open}
            className="grid size-11 place-items-center md:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <nav
        aria-label="Main"
        className={`${open ? 'grid' : 'hidden'} border-t border-line px-4 py-2 md:mx-auto md:flex md:max-w-[1600px] md:flex-wrap md:gap-1 md:border-0 md:px-4 md:py-0`}
      >
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded px-3 text-sm text-muted hover:text-fg"
          >
            {label}
          </Link>
        ))}
        <span className="grid md:ml-auto md:flex">
          <MoodPicker />
          <PrivacyMenu />
        </span>
        <button onClick={user ? logout : openLogin} className="min-h-11 px-3 text-left text-sm text-accent md:hidden">
          {user ? 'Log out' : 'Log in'}
        </button>
      </nav>
    </header>
  )
}
