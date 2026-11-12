// src/components/Room.tsx
// Live room: simulated stream, chat, tipping, goal, leaderboard, private and spy shows.
'use client'
import { track } from '@/lib/analytics'
import { record } from '@/lib/reco/events'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Flag, VolumeX } from 'lucide-react'
import rooms from '@/data/rooms.json'
import { dbGet, addModeration } from '@/lib/db'
import { duration } from '@/lib/format'
import { useMeter } from '@/lib/meter'
import { useStored } from '@/lib/store'
import { useAuth, useWallet } from '@/context/Providers'
import { GiftPicker } from '@/components/Extras'
import { FollowButton } from '@/components/FollowButton'
import { Modal } from '@/components/Modal'

type Msg = { id: number; name: string; text: string; kind: 'chat' | 'tip' | 'system'; badge?: string }
const blockedWords = ['spamword', 'badword']
const clean = (text: string) => blockedWords.reduce((t, w) => t.replace(new RegExp(w, 'gi'), '***'), text)
const btn = 'min-h-11 rounded-lg border border-line px-3 text-sm'
const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'

export function Room({ slug }: { slug: string }) {
  const room = rooms.find((r) => r.slug === slug)
  const { user, openLogin } = useAuth()
  const wallet = useWallet()
  const [clubs] = useStored<string[]>('tm_fanclubs', [])
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, name: '', text: 'Welcome to the room. Be respectful.', kind: 'system' }])
  const [goal, setGoal] = useState(room?.tipGoal.current ?? 0)
  const [board, setBoard] = useState<Record<string, number>>({ 'Member 21': 320, 'Member 48': 180, 'Member 07': 90 })
  const [muted, setMuted] = useState<string[]>([])
  const [mode, setMode] = useState<'private' | 'spy' | null>(null)
  const [confirm, setConfirm] = useState<'private' | 'spy' | null>(null)
  const [custom, setCustom] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const say = (m: Omit<Msg, 'id'>) => setMsgs((all) => [...all.slice(-80), { ...m, id: Date.now() + Math.random() }])

  // Mock chat traffic
  useEffect(() => {
    let n = 0
    const id = setInterval(() => say({ name: `Member ${String((n * 17 + 11) % 90).padStart(2, '0')}`, text: `Demo chat message ${++n}`, kind: 'chat', badge: n % 4 === 0 ? 'Top tipper' : undefined }), 3000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' }) // returns a promise in newer browsers, so do not return it
  }, [msgs])

  const rate = mode === 'spy' ? room?.spyRatePerMin ?? 0 : room?.privateRatePerMin ?? 0
  const meter = useMeter({
    rate,
    active: !!mode,
    reason: `${mode === 'spy' ? 'Spy on private show' : 'Private show'}: ${room?.title}`,
    onEnd: (why) => {
      setMode(null)
      say({ name: '', text: why, kind: 'system' })
    },
  })

  if (!room) return <p className="py-20 text-center text-muted">Room not found.</p>
  const performer = dbGet('performers').find((p) => p.id === room.performerId)!
  const member = clubs.includes(performer.id)
  const reached = goal >= room.tipGoal.target

  const tip = (tokens: number, label = 'tipped') => {
    if (!user) return openLogin()
    if (!tokens || tokens < 1) return
    if (!wallet.debit(tokens, `Tip in ${room.title}`)) return
    track('tip', { where: 'room', room: room.slug, tokens })
    record('tip', { performer: room.performerId })
    say({ name: user.name, text: `${label} ${tokens} tokens`, kind: 'tip' })
    setGoal((g) => g + tokens)
    setBoard((b) => ({ ...b, [user.name]: (b[user.name] ?? 0) + tokens }))
  }
  const start = () => {
    if (!user) return openLogin()
    if (!wallet.canAfford(confirm === 'spy' ? room.spyRatePerMin : room.privateRatePerMin)) return wallet.openTopUp()
    setMode(confirm)
    setConfirm(null)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <video src="/placeholder/sample.mp4" poster="/placeholder/thumb.svg" autoPlay muted loop playsInline className="size-full" />
          <span className="absolute left-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-white">{mode ? mode.toUpperCase() : 'LIVE'}</span>
          <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px]">{mode === 'private' ? 'Only you' : `${room.viewers} watching`}</span>
          {mode && (
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-3 bg-black/80 p-2 text-sm">
              <span className="tabular-nums">{duration(meter.sec)}</span>
              <span>{meter.spent} tokens spent</span>
              <span className={meter.low ? 'font-semibold text-amber-400' : 'text-muted'}>{meter.low ? `Low balance: ${meter.minutesLeft} min left` : `${meter.minutesLeft} min left`}</span>
              <button onClick={wallet.openTopUp} className="ml-auto min-h-11 rounded-lg border border-line px-3">
                Top up
              </button>
              <button
                onClick={() => {
                  setMode(null)
                  say({ name: '', text: 'Private session ended.', kind: 'system' })
                }}
                className="min-h-11 rounded-lg bg-accent px-3 font-semibold text-white"
              >
                End
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={performer.avatar} alt="" className="size-11 rounded-full" />
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold">{room.title}</h1>
            <Link href={`/performer/${performer.slug}`} className="text-sm text-muted">
              {performer.name} · verified
            </Link>
          </div>
          <FollowButton performerId={performer.id} />
        </div>

        <div className="mt-3 rounded-lg bg-surface p-3">
          <div className="flex justify-between text-sm">
            <span>{room.tipGoal.label}</span>
            <span className="tabular-nums text-muted">
              {Math.min(goal, room.tipGoal.target)} / {room.tipGoal.target}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded bg-line" role="progressbar" aria-valuenow={goal} aria-valuemax={room.tipGoal.target}>
            <div className={`h-full bg-accent transition-all ${reached ? 'animate-pulse' : ''}`} style={{ width: `${Math.min(100, (goal / room.tipGoal.target) * 100)}%` }} />
          </div>
          {reached && <p className="mt-2 text-sm font-semibold text-accent">Goal reached. Thank you!</p>}
        </div>

        <div className="mt-3 grid gap-3 rounded-lg bg-surface p-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {[10, 50, 100].map((n) => (
              <button key={n} onClick={() => tip(n)} className={primary}>
                Tip {n}
              </button>
            ))}
            <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Custom" aria-label="Custom tip" className="min-h-11 w-24 rounded-lg border border-line bg-ink px-3" />
            <button onClick={() => (tip(Number(custom)), setCustom(''))} className={btn}>
              Send tip
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {room.tipMenu.map((m) => (
              <button key={m.label} onClick={() => tip(m.tokens, `requested "${m.label}" for`)} className={btn}>
                {m.label} · {m.tokens}
              </button>
            ))}
          </div>
          <GiftPicker onGift={(g) => tip(g.tokens, `sent ${g.icon} ${g.name} worth`)} />
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <button onClick={() => setConfirm('private')} disabled={!!mode} className={`${btn} disabled:opacity-40`}>
              Start private show · {room.privateRatePerMin} tokens per minute
            </button>
            <button onClick={() => setConfirm('spy')} disabled={!!mode} className={`${btn} disabled:opacity-40`}>
              Spy · {room.spyRatePerMin} per minute
            </button>
            <button onClick={() => (user ? wallet.debit(20, `Paid message in ${room.title}`) && say({ name: '', text: 'Your private message was sent to the host.', kind: 'system' }) : openLogin())} className={btn}>
              Message host · 20
            </button>
            <Link href={`/performer/${performer.slug}`} className={`${btn} grid place-items-center`}>
              {member ? 'Fan club member' : `Fan club · ${room.fanClubPrice} a month`}
            </Link>
          </div>
        </div>
      </div>

      <aside className="grid content-start gap-3">
        <section aria-label="Chat" className="flex h-[420px] flex-col rounded-lg bg-surface">
          <div className="flex-1 space-y-1 overflow-y-auto p-3 text-sm" aria-live="polite">
            {msgs.filter((m) => !muted.includes(m.name)).map((m) =>
              m.kind === 'system' ? (
                <p key={m.id} className="text-xs text-muted">
                  {m.text}
                </p>
              ) : (
                <p key={m.id} className={`group ${m.kind === 'tip' ? 'rounded bg-accent/20 px-2 py-1 font-medium' : ''}`}>
                  <span className="text-muted">{m.name}</span>
                  {(m.badge || (m.name === user?.name && member)) && <span className="ml-1 rounded bg-line px-1 text-[10px]">{m.badge ?? 'Fan club'}</span>} {clean(m.text)}
                  {m.kind === 'chat' && m.name !== user?.name && (
                    <span className="ml-1 hidden gap-1 group-hover:inline-flex group-focus-within:inline-flex">
                      <button onClick={() => setMuted((x) => [...x, m.name])} aria-label={`Mute ${m.name}`} title="Mute or block">
                        <VolumeX size={14} />
                      </button>
                      <button onClick={() => (addModeration({ kind: 'report', subject: room.id, detail: `Chat message by ${m.name}` }), say({ name: '', text: 'Message reported.', kind: 'system' }))} aria-label="Report message" title="Report">
                        <Flag size={14} />
                      </button>
                    </span>
                  )}
                </p>
              ),
            )}
            <div ref={end} />
          </div>
          <form
            className="flex gap-2 border-t border-line p-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!user) return openLogin()
              const input = e.currentTarget.elements.namedItem('text') as HTMLInputElement
              if (input.value.trim()) say({ name: user.name, text: input.value.trim(), kind: 'chat' })
              input.value = ''
            }}
          >
            <input name="text" maxLength={200} placeholder={user ? 'Say something' : 'Sign up to chat'} aria-label="Chat message" className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 text-sm" />
            <button className={primary}>Send</button>
          </form>
        </section>

        <section className="rounded-lg bg-surface p-3 text-sm">
          <h2 className="mb-2 font-semibold">Top tippers</h2>
          <ol className="grid gap-1">
            {Object.entries(board).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n], i) => (
              <li key={name} className="flex justify-between">
                <span>
                  {i + 1}. {name}
                </span>
                <span className="tabular-nums text-muted">{n}</span>
              </li>
            ))}
          </ol>
        </section>
      </aside>

      {confirm && (
        <Modal title={confirm === 'spy' ? 'Spy on a private show' : 'Start a private show'} onClose={() => setConfirm(null)}>
          <p className="text-sm text-muted">
            You pay {confirm === 'spy' ? room.spyRatePerMin : room.privateRatePerMin} tokens at the start of each minute. Your balance is {wallet.balance} tokens. The session ends by itself when your tokens run out, and you can end it at any time.
          </p>
          <button onClick={start} className={`${primary} mt-4 w-full`}>
            Start now
          </button>
        </Modal>
      )}
    </div>
  )
}
