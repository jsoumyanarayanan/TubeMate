// src/components/Growth.tsx
// Phase 11 growth pieces kept in one file: conversion prompts, install prompt, go-live alerts,
// rising performers, and the footer's popular searches and language switcher.
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import rooms from '@/data/rooms.json'
import { getRisingPerformers, popularTags } from '@/lib/api'
import { track } from '@/lib/analytics'
import { hasAgeConsent } from '@/lib/ageVerification'
import { useExperiment } from '@/lib/experiment'
import { titleCase } from '@/lib/format'
import { bump, count, oncePerDay } from '@/lib/growth'
import { locales, localeNames } from '@/lib/i18n'
import { useData, useStored } from '@/lib/store'
import { useAuth, usePaywall } from '@/context/Providers'
import { Modal } from '@/components/Modal'

const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'
const plain = 'min-h-11 rounded-lg border border-line px-4 text-sm'
const signupCopy = { a: 'Create a free account to keep your history, favourites and playlists.', b: 'Join free to save favourites and collect daily reward tokens.' }

// Conversion prompts. Each one is dismissible and shows at most once per 24 hours:
// a soft sign-up wall after 5 videos for guests, a premium trial banner after 3 ad views,
// and an exit offer on the pricing page.
export function Prompts() {
  const { ready, user, openLogin } = useAuth()
  const { openPremium } = usePaywall()
  const path = usePathname()
  const [show, setShow] = useState<'signup' | 'trial' | 'exit' | null>(null)
  const variant = useExperiment('signup_wall_copy', ['a', 'b'] as const)
  const live = useRef({ user, show })
  live.current = { user, show }
  // Set at once when a prompt opens, so two triggers in the same moment cannot both pass.
  const busy = useRef(false)
  useEffect(() => {
    busy.current = !!show
  }, [show])
  const counted = useRef('')

  const open = (name: 'signup' | 'trial' | 'exit') => {
    if (busy.current || !oncePerDay(name)) return
    busy.current = true
    setShow(name)
    track('prompt_shown', { name })
  }

  // Sign-up wall: count videos opened by a guest and prompt from the sixth one.
  useEffect(() => {
    if (!ready || user || !path.startsWith('/video/') || counted.current === path) return
    counted.current = path
    if (bump('tm_guest_views') > 5) open('signup')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ready])

  // Trial banner: adEvents.ts counts impressions and fires tm:adview.
  useEffect(() => {
    const onAd = () => {
      // Wait until the age gate and cookie banner are out of the way.
      if (!hasAgeConsent() || !localStorage.getItem('tm_cookie_choice')) return
      if (live.current.user?.isPremium || count('tm_ad_views') < 3 || busy.current) return
      if (oncePerDay('trial')) {
        busy.current = true
        bump('tm_ad_views', 0)
        setShow('trial')
        track('prompt_shown', { name: 'trial' })
      }
    }
    window.addEventListener('tm:adview', onAd)
    return () => window.removeEventListener('tm:adview', onAd)
  }, [])

  // Exit offer: the pointer leaves through the top of the pricing page. Desktop only, touch has no such signal.
  useEffect(() => {
    if (path !== '/premium') return
    const onOut = (e: MouseEvent) => !e.relatedTarget && e.clientY <= 0 && !live.current.user?.isPremium && open('exit')
    document.addEventListener('mouseout', onOut)
    return () => document.removeEventListener('mouseout', onOut)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  // Mock go-live alert for members who opted in. A real push service replaces this.
  const [alerts] = useStored('tm_push_live', false)
  const [following] = useStored<string[]>('tm_following', [])
  useEffect(() => {
    if (!alerts || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (rooms.some((r) => r.isLive && following.includes(r.performerId)) && oncePerDay('golive'))
      new Notification('TM', { body: 'Someone you follow is online now.' }) // discreet wording on purpose
  }, [alerts, following])

  const close = () => setShow(null)
  const act = (fn: () => void) => () => (close(), fn())
  if (show === 'signup')
    return (
      <Modal title="Enjoying the videos?" onClose={close}>
        <p className="text-sm text-muted">{signupCopy[variant]}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={act(openLogin)} className={primary}>
            Sign up free
          </button>
          <button onClick={close} className={plain}>
            Not now
          </button>
        </div>
      </Modal>
    )
  if (show === 'exit')
    return (
      <Modal title="Before you go" onClose={close}>
        <p className="text-sm text-muted">The Monthly plan starts with a 7-day free trial. No ads, HD and 4K, and you can cancel anytime.</p>
        <div className="mt-4 flex gap-2">
          <button onClick={act(openPremium)} className={primary}>
            Start free trial
          </button>
          <button onClick={close} className={plain}>
            No thanks
          </button>
        </div>
      </Modal>
    )
  if (show === 'trial')
    return (
      <div role="region" aria-label="Premium trial" className="fixed inset-x-2 bottom-32 z-40 mx-auto flex max-w-2xl items-center gap-2 rounded-xl border border-accent bg-surface p-3 text-sm md:bottom-4">
        <p className="min-w-0 flex-1">Tired of ads? Try Premium free for 7 days. Cancel anytime.</p>
        <button onClick={act(openPremium)} className={primary}>
          Try Premium
        </button>
        <button onClick={close} aria-label="Dismiss" className="grid size-11 shrink-0 place-items-center">
          <X size={18} />
        </button>
      </div>
    )
  return null
}

// "Add to home screen" strip. Shows only when the browser says the site can be installed.
type InstallEvent = Event & { prompt: () => Promise<unknown> }
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [hidden, setHidden] = useStored('tm_install_hidden', false)
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      setEvent(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])
  if (!event || hidden) return null
  return (
    <div role="region" aria-label="Install" className="flex flex-wrap items-center justify-center gap-2 border-b border-line bg-surface px-4 py-2 text-sm">
      <span className="text-muted">Add this site to your home screen. It appears as "TM" with a plain icon.</span>
      <button onClick={() => event.prompt().finally(() => setEvent(null))} className={primary}>
        Add to home screen
      </button>
      <button onClick={() => setHidden(true)} className={plain}>
        Not now
      </button>
    </div>
  )
}

// Browser notification opt-in for followed performers going live.
export function GoLiveOptIn() {
  const [on, setOn] = useStored('tm_push_live', false)
  const [note, setNote] = useState('')
  const [supported, setSupported] = useState(false)
  useEffect(() => setSupported(typeof Notification !== 'undefined'), [])
  if (!supported) return null
  const toggle = async () => {
    if (on) return setOn(false)
    const granted = (await Notification.requestPermission()) === 'granted'
    setOn(granted)
    setNote(granted ? '' : 'Notifications are blocked in your browser settings.')
  }
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-surface p-3 text-sm">
      <p className="min-w-0 flex-1 text-muted">{note || 'Get a discreet browser alert when a performer you follow goes live. One a day at most.'}</p>
      <button onClick={toggle} aria-pressed={on} className={on ? plain : primary}>
        {on ? 'Turn alerts off' : 'Turn alerts on'}
      </button>
    </div>
  )
}

export function RisingPerformers() {
  const list = useData(getRisingPerformers)
  return (
    <section aria-labelledby="rising" className="mb-6">
      <h2 id="rising" className="mb-2 text-lg font-semibold">
        Rising performers
      </h2>
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {(list ?? Array.from({ length: 5 }, () => null)).map((p, i) =>
          p ? (
            <li key={p.id}>
              <Link href={`/performer/${p.slug}`} className="flex min-h-14 items-center gap-3 rounded-lg bg-surface px-3 text-sm hover:bg-line">
                <span className="w-5 text-center font-bold text-accent">{i + 1}</span>
                {p.name}
              </Link>
            </li>
          ) : (
            <li key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
          ),
        )}
      </ol>
    </section>
  )
}

export function FooterLinks() {
  const tags = useData(async () => popularTags()) ?? []
  return (
    <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-2 px-2">
      <span className="text-fg">Popular searches</span>
      {tags.map((t) => (
        <Link key={t} href={`/search?q=${t}`} className="flex min-h-11 items-center px-2 hover:text-fg">
          {titleCase(t)}
        </Link>
      ))}
      <label className="ml-auto flex items-center gap-2">
        Language
        <select defaultValue="en" className="min-h-11 rounded-lg border border-line bg-surface px-3">
          {locales.map((l) => (
            <option key={l} value={l}>
              {localeNames[l]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
