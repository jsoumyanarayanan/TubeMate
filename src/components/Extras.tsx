// src/components/Extras.tsx
// Small revenue features from Phase 9 that sit inside other pages.
'use client'
import Link from 'next/link'
import { useState } from 'react'
import gifts from '@/data/gifts.json'
import type { Performer } from '@/lib/api'
import { useStored } from '@/lib/store'
import { useAuth, useWallet } from '@/context/Providers'

const btn = 'min-h-11 rounded-lg border border-line px-4 text-sm'
const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'
export const today = () => new Date().toISOString().slice(0, 10)

// Virtual gifts for live rooms, calls and messages.
export function GiftPicker({ onGift }: { onGift: (gift: (typeof gifts)[number]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Gifts">
      {gifts.map((g) => (
        <button key={g.id} onClick={() => onGift(g)} title={g.name} className="grid min-h-11 min-w-14 place-items-center rounded-lg border border-line px-2 text-xs hover:border-accent">
          <span className="text-lg leading-none">{g.icon}</span>
          {g.tokens}
        </button>
      ))}
    </div>
  )
}

// Daily check-in streak that grants a few tokens.
export function DailyReward() {
  const { user, openLogin } = useAuth()
  const { credit } = useWallet()
  const [streak, setStreak] = useStored('tm_streak', { last: '', days: 0 })
  const claimed = streak.last === today()
  const claim = () => {
    if (!user) return openLogin()
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
    const days = streak.last === yesterday ? streak.days + 1 : 1
    setStreak({ last: today(), days })
    credit(Math.min(5 + days, 15), `Daily reward, day ${days}`, 'bonus')
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface p-4 text-sm">
      <div>
        <p className="font-medium">Daily reward</p>
        <p className="text-muted">{claimed ? `Claimed today. Streak: ${streak.days} days.` : 'Check in each day for free tokens. Longer streaks pay more.'}</p>
      </div>
      <button onClick={claim} disabled={claimed} className={`${primary} disabled:bg-line disabled:text-muted`}>
        {claimed ? 'Come back tomorrow' : 'Claim tokens'}
      </button>
    </div>
  )
}

export function NewsletterBox() {
  const [done, setDone] = useStored('tm_newsletter', false)
  return (
    <form
      className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-2 py-3"
      onSubmit={(e) => {
        e.preventDefault()
        setDone(true)
      }}
    >
      {done ? (
        <p>
          You are subscribed to the newsletter.{' '}
          <Link href="/newsletter" className="underline">
            Preview
          </Link>
        </p>
      ) : (
        <>
          <label htmlFor="nl" className="text-fg">
            Newsletter
          </label>
          <input id="nl" type="email" required placeholder="Email" className="min-h-11 rounded-lg border border-line bg-surface px-3" />
          <label className="flex items-center gap-2">
            <input type="checkbox" required className="size-4 accent-accent" /> I agree to receive emails
          </label>
          <button className={btn}>Subscribe</button>
        </>
      )}
    </form>
  )
}

type Request = { id: string; performerId: string; kind: string; note: string; tokens: number; status: 'requested' | 'accepted' | 'delivered' }

// Fan club, members-only feed and custom requests on the performer page.
export function PerformerExtras({ performer }: { performer: Performer }) {
  const { user, openLogin } = useAuth()
  const { debit } = useWallet()
  const [clubs, setClubs] = useStored<string[]>('tm_fanclubs', [])
  const [requests, setRequests] = useStored<Request[]>('tm_requests', [])
  const [panel, setPanel] = useState<'feed' | 'request' | null>(null)
  const member = clubs.includes(performer.id)
  const mine = requests.filter((r) => r.performerId === performer.id)
  const steps = ['requested', 'accepted', 'delivered'] as const

  const join = () => {
    if (!user) return openLogin()
    if (member) return setClubs((c) => c.filter((id) => id !== performer.id))
    if (debit(performer.fanClubPrice, `Fan club: ${performer.name} (monthly)`)) setClubs((c) => [...c, performer.id])
  }

  return (
    <div className="mb-6 grid gap-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={join} className={member ? btn : primary}>
          {member ? 'Leave fan club' : `Join fan club · ${performer.fanClubPrice} tokens a month`}
        </button>
        <button onClick={() => setPanel(panel === 'feed' ? null : 'feed')} aria-expanded={panel === 'feed'} className={btn}>
          Members feed
        </button>
        <button onClick={() => setPanel(panel === 'request' ? null : 'request')} aria-expanded={panel === 'request'} className={btn}>
          Custom request
        </button>
        <Link href={`/messages?to=${performer.id}`} className={`${btn} grid place-items-center`}>
          Message
        </Link>
        {member && <span className="grid min-h-11 place-items-center rounded-full bg-accent/20 px-3 text-xs font-semibold text-accent">Fan club member</span>}
      </div>

      {panel === 'feed' && (
        <div className="grid gap-2 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg bg-surface p-4 text-sm">
              {member ? (
                <>
                  <p className="font-medium">Members post {n}</p>
                  <p className="text-muted">Demo members-only post. Members also get cheaper calls and tips.</p>
                </>
              ) : (
                <>
                  <p className="font-medium blur-sm">Members post {n}</p>
                  <p className="text-muted">Join the fan club to read this post.</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {panel === 'request' && (
        <div className="grid gap-3 rounded-lg bg-surface p-4 text-sm">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!user) return openLogin()
              const data = new FormData(e.currentTarget)
              const kind = data.get('kind') as string
              const tokens = kind === 'Video' ? 500 : 200
              if (!debit(tokens, `Custom ${kind.toLowerCase()} request to ${performer.name}`)) return
              setRequests((r) => [{ id: crypto.randomUUID(), performerId: performer.id, kind, note: data.get('note') as string, tokens, status: 'requested' }, ...r])
              e.currentTarget.reset()
            }}
          >
            <label className="grid gap-1 text-xs text-muted">
              Type
              <select name="kind" className="min-h-11 rounded-lg border border-line bg-ink px-3 text-sm text-fg">
                <option>Video</option>
                <option>Audio</option>
              </select>
            </label>
            <label className="grid min-w-0 flex-1 gap-1 text-xs text-muted">
              What you would like
              <input name="note" required maxLength={200} className="min-h-11 rounded-lg border border-line bg-ink px-3 text-sm text-fg" />
            </label>
            <button className={primary}>Send request</button>
          </form>
          <p className="text-xs text-muted">Quoted price: 500 tokens for video, 200 for audio. The performer can decline, and declined requests are refunded.</p>
          {mine.map((r) => (
            <div key={r.id} className="rounded-lg border border-line p-3">
              <p>
                {r.kind}: {r.note}
              </p>
              <ol className="mt-2 flex gap-2 text-xs">
                {steps.map((s, i) => (
                  <li key={s} className={`rounded-full px-2 py-1 capitalize ${steps.indexOf(r.status) >= i ? 'bg-accent text-white' : 'bg-line text-muted'}`}>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
