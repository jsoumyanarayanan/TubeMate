// src/components/Lifecycle.tsx
// Mounted once in the site layout. Counts the visit, runs the return triggers, shows the one
// contextual offer, and the optional session reminder. Every box can be dismissed.
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth, usePaywall, useWallet } from '@/context/Providers'
import { read, write } from '@/lib/growth'
import { closeOffer, currentOffer, subscribe, type Shown } from '@/lib/lifecycle/offers'
import { runTriggers } from '@/lib/lifecycle/notify'
import { trackVisit } from '@/lib/lifecycle/stage'

const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'
const box = 'fixed inset-x-2 bottom-32 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-xl border border-accent bg-surface p-3 text-sm md:bottom-4'

const pad = (n: number) => String(n).padStart(2, '0')
function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

export function Lifecycle() {
  useEffect(() => {
    trackVisit()
    runTriggers()
  }, [])
  return (
    <>
      <OfferCard />
      <SessionReminder />
    </>
  )
}

function OfferCard() {
  const { openLogin } = useAuth()
  const paywall = usePaywall()
  const wallet = useWallet()
  const [offer, setOffer] = useState<Shown | null>(null)
  const [left, setLeft] = useState(0)

  // Sync on mount too: a signal can fire before this component subscribes.
  useEffect(() => {
    const sync = () => setOffer(currentOffer())
    sync()
    const off = subscribe(sync)
    return () => {
      off()
    }
  }, [])

  useEffect(() => {
    if (!offer?.endsAt) return
    const end = Date.parse(offer.endsAt)
    const tick = () => {
      const ms = end - Date.now()
      setLeft(ms)
      if (ms <= 0) closeOffer()
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [offer])

  if (!offer) return null

  const run = () => {
    if (offer.action === 'login') openLogin()
    else if (offer.action === 'tokens') wallet.openTopUp()
    else if (offer.action === 'premium') paywall.openPremium()
    else if (offer.action === 'follow' && offer.data.id) {
      const following = read<string[]>('tm_following', [])
      if (!following.includes(offer.data.id)) write('tm_following', [...following, offer.data.id])
    }
    closeOffer(true)
  }
  const btn = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'

  return (
    <div role="region" aria-label="Offer" className={box}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{offer.title}</p>
        <p className="text-muted">{offer.body}</p>
        {offer.endsAt && <p className="mt-1 text-xs text-accent">Ends in {countdown(left)}</p>}
      </div>
      {offer.href ? (
        <Link href={offer.href} onClick={() => closeOffer(true)} className={btn}>
          {offer.cta}
        </Link>
      ) : (
        <button onClick={run} className={btn}>
          {offer.cta}
        </button>
      )}
      <button onClick={() => closeOffer()} aria-label="Dismiss offer" className="grid size-11 shrink-0 place-items-center">
        <X size={18} />
      </button>
    </div>
  )
}

// Optional reminder after a set number of minutes in one browser session. Shown once per session.
function SessionReminder() {
  const [minutes, setMinutes] = useState(0)
  useEffect(() => {
    const mins = read<number>('tm_session_reminder', 0)
    if (!mins) return
    try {
      if (!sessionStorage.getItem('tm_session_start')) sessionStorage.setItem('tm_session_start', String(Date.now()))
    } catch {
      return
    }
    const start = Number(sessionStorage.getItem('tm_session_start'))
    const t = setInterval(() => {
      if (Date.now() - start < mins * 60000 || sessionStorage.getItem('tm_session_reminded')) return
      sessionStorage.setItem('tm_session_reminded', '1')
      setMinutes(mins)
      clearInterval(t)
    }, 5000)
    return () => clearInterval(t)
  }, [])
  if (!minutes) return null
  return (
    <div role="status" className={box}>
      <p className="min-w-0 flex-1">You have been watching for {minutes} minutes. Time for a break?</p>
      <button onClick={() => setMinutes(0)} aria-label="Dismiss reminder" className="grid size-11 shrink-0 place-items-center">
        <X size={18} />
      </button>
    </div>
  )
}
