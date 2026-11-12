// src/components/Ads.tsx
// Every ad is a labelled placeholder box. The ad network tag replaces the inner box of AdSlot.
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/context/Providers'
import { adConfig, maybePopunder } from '@/lib/ads'
import { trackClick, trackImpression } from '@/lib/adEvents'
import { topCategory } from '@/lib/lifecycle/signals'

// True when the slot is enabled in ads.json and the member is not premium.
export function useAd(id: string) {
  const { user } = useAuth()
  const config = adConfig(id)
  return config && !user?.isPremium ? config : null
}

// Fixed heights so the page never jumps when a slot loads.
const sizes: Record<string, string> = {
  '728x90': 'h-[50px] max-w-[320px] md:h-[90px] md:max-w-[728px]',
  '300x250': 'h-[250px] max-w-[300px]',
  '320x50': 'h-[50px] max-w-[320px]',
}

export function AdSlot({ id, className = '' }: { id: string; className?: string }) {
  const ad = useAd(id)
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  // Ads by interest: the viewer's top category, read after mount so server and client markup match.
  const [interest, setInterest] = useState<string | null>(null)
  useEffect(() => setInterest(topCategory()), [])
  useEffect(() => {
    if (!ad || seen || !ref.current) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      setSeen(true)
      trackImpression(id)
    }, { rootMargin: '200px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [ad, seen, id])
  if (!ad) return null

  return (
    <div className={`mx-auto w-full ${className}`}>
      <div className="mx-auto flex max-w-[728px] justify-between text-[11px] text-muted">
        <span>Ad</span>
        <Link href="/premium" className="underline">
          Remove ads
        </Link>
      </div>
      {/* Ad network tag goes here */}
      <div
        ref={ref}
        data-interest={interest ?? undefined}
        onClick={() => trackClick(id)}
        className={`mx-auto grid w-full place-items-center rounded border border-dashed border-line bg-surface text-xs text-muted ${sizes[ad.size] ?? ''}`}
      >
        {seen ? `${id} · ${ad.size}${interest ? ` · interest: ${interest}` : ''}` : ''}
      </div>
    </div>
  )
}

// In-grid tile styled like a video card.
export function NativeAd() {
  return (
    <div onClick={() => trackClick('native')}>
      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-line bg-surface text-xs text-muted">native · card</div>
      <p className="mt-2 text-sm font-medium">Partner offer title</p>
      <p className="text-xs text-muted">
        Sponsored ·{' '}
        <Link href="/premium" className="underline">
          Remove ads
        </Link>
      </p>
    </div>
  )
}

export function StickyMobileAd() {
  const ad = useAd('sticky-mobile')
  const [closed, setClosed] = useState(false)
  if (!ad || closed) return null
  return (
    <div className="fixed inset-x-0 bottom-14 z-30 flex items-center justify-center gap-1 border-t border-line bg-ink py-1 md:hidden">
      <div onClick={() => trackClick('sticky-mobile')} className="grid h-[50px] w-[320px] max-w-[80vw] place-items-center rounded border border-dashed border-line bg-surface text-xs text-muted">
        Ad · sticky-mobile · 320x50
      </div>
      <button onClick={() => setClosed(true)} aria-label="Close ad" className="grid size-11 place-items-center">
        <X size={18} />
      </button>
    </div>
  )
}

// Full-screen ad between page views, limited by frequencyCapMin in ads.json.
export function Interstitial() {
  const ad = useAd('interstitial')
  const path = usePathname()
  const first = useRef(true)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!ad) return
    maybePopunder()
    let last = 0
    try {
      last = Number(localStorage.getItem('tm_interstitial') ?? 0)
    } catch {}
    if (Date.now() - last < (ad.frequencyCapMin ?? 10) * 60000) return
    try {
      localStorage.setItem('tm_interstitial', String(Date.now()))
    } catch {}
    setOpen(true)
    trackImpression('interstitial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
  if (!ad || !open) return null
  return (
    <div role="dialog" aria-label="Advertisement" className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>Ad</span>
          <button autoFocus onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-1 rounded-lg border border-line px-4 text-fg">
            <X size={16} /> Close
          </button>
        </div>
        <div onClick={() => trackClick('interstitial')} className="grid aspect-video place-items-center rounded-lg border border-dashed border-line bg-surface text-sm text-muted">
          interstitial · full
        </div>
      </div>
    </div>
  )
}

// Home page row of affiliate offers, hidden for premium members.
export function PartnerOffers() {
  const ad = useAd('partner-offers')
  if (!ad) return null
  return (
    <section aria-labelledby="row-partners">
      <h2 id="row-partners" className="mb-2 text-lg font-semibold">
        Partner offers
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} onClick={() => trackClick('partner-offers')} className="rounded-lg border border-dashed border-line bg-surface p-4 text-sm">
            <p className="font-medium">Partner offer {n}</p>
            <p className="text-xs text-muted">Sponsored · affiliate link</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SponsoredResult() {
  const ad = useAd('sponsored-search')
  if (!ad) return null
  return (
    <div onClick={() => trackClick('sponsored-search')} className="mb-4 rounded-lg border border-dashed border-line bg-surface p-3 text-sm">
      <span className="mr-2 rounded bg-line px-1.5 py-0.5 text-[11px] font-semibold">Sponsored</span>
      Partner result title
    </div>
  )
}
