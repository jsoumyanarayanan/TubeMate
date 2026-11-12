// src/components/Calls.tsx
// Paid one-to-one calls. No real connection: the remote side is a placeholder and billing is simulated.
'use client'
import { track } from '@/lib/analytics'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Star, Video as Cam, VideoOff } from 'lucide-react'
import { dbGet } from '@/lib/db'
import { duration } from '@/lib/format'
import { useMeter } from '@/lib/meter'
import { useStored } from '@/lib/store'
import { useAuth, useWallet } from '@/context/Providers'
import { GiftPicker } from '@/components/Extras'

export type Booking = { id: string; performerId: string; slot: string; deposit: number }
type CallLog = { id: string; performerId: string; at: string; kind: string; sec: number; tokens: number; bundleMinutes: number }
const DEPOSIT = 20
const btn = 'min-h-11 rounded-lg border border-line px-4 text-sm'
const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:bg-line disabled:text-muted'
const round = 'grid size-12 place-items-center rounded-full border border-line'

export function CallFlow({ slug }: { slug: string }) {
  const performer = dbGet('performers').find((p) => p.slug === slug)
  const { user, openLogin } = useAuth()
  const wallet = useWallet()
  const [bookings, setBookings] = useStored<Booking[]>('tm_bookings', [])
  const [, setLog] = useStored<CallLog[]>('tm_call_log', [])
  const [bundle] = useStored('tm_call_minutes', 0)
  const [stage, setStage] = useState<'profile' | 'check' | 'call' | 'receipt'>('profile')
  const [kind, setKind] = useState<'audio' | 'video'>('video')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [camNote, setCamNote] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [ended, setEnded] = useState('')
  const [receipt, setReceipt] = useState({ sec: 0, tokens: 0, bundleMinutes: 0 })
  const [stars, setStars] = useState(0)
  const self = useRef<HTMLVideoElement>(null)

  const rate = kind === 'video' ? performer?.videoRatePerMin ?? 0 : performer?.audioRatePerMin ?? 0
  const meter = useMeter({ rate, active: stage === 'call', reason: `${kind} call with ${performer?.name}`, useBundle: true, onEnd: (why) => finish(why) })
  const snapshot = useRef(meter)
  snapshot.current = meter

  useEffect(() => {
    if (self.current) self.current.srcObject = stream
  }, [stream, stage])
  const stop = () => {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream])

  if (!performer || !performer.callsEnabled) return <p className="py-20 text-center text-muted">This performer does not take calls.</p>

  // Local preview only. Nothing is sent anywhere.
  const check = async (k: 'audio' | 'video') => {
    if (!user) return openLogin()
    setKind(k)
    setAgreed(false)
    setCamNote('')
    setStage('check')
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ audio: true, video: k === 'video' }))
    } catch {
      setKind('audio')
      setCamNote('Camera or microphone access was not granted. You can still make an audio call.')
    }
  }
  function finish(why = '') {
    const m = snapshot.current
    const result = { sec: m.sec, tokens: m.spent, bundleMinutes: m.bundleUsed }
    setReceipt(result)
    setLog((l) => [{ id: crypto.randomUUID(), performerId: performer!.id, at: new Date().toISOString(), kind, ...result }, ...l])
    setEnded(why)
    setStars(0)
    stop()
    setStage('receipt')
  }
  const free = performer.slots.filter((s) => !bookings.some((b) => b.performerId === performer.id && b.slot === s))
  const book = (slot: string) => {
    if (!user) return openLogin()
    if (wallet.debit(DEPOSIT, `Call booking deposit: ${performer.name}, ${slot}`)) setBookings((b) => [...b, { id: crypto.randomUUID(), performerId: performer.id, slot, deposit: DEPOSIT }])
  }
  const minutes = bundle + Math.floor(wallet.balance / Math.max(rate, 1))

  if (stage === 'check')
    return (
      <div className="mx-auto grid max-w-xl gap-4 text-sm">
        <h1 className="text-lg font-semibold">Before you call {performer.name}</h1>
        <div className="aspect-video overflow-hidden rounded-lg bg-surface">
          {stream && kind === 'video' ? <video ref={self} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" /> : <div className="grid size-full place-items-center text-muted">{kind === 'audio' ? 'Audio call. No camera needed.' : 'Waiting for camera'}</div>}
        </div>
        {camNote && <p className="rounded-lg bg-amber-400/15 p-3 text-amber-300">{camNote}</p>}
        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-surface p-4 text-center">
          <div>
            <dt className="text-xs text-muted">Rate</dt>
            <dd className="font-semibold">{rate} per minute</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Your balance</dt>
            <dd className="font-semibold">{wallet.balance} tokens</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">That buys</dt>
            <dd className="font-semibold">{minutes} minutes</dd>
          </div>
        </dl>
        {bundle > 0 && <p className="text-muted">Your {bundle} bundle minutes are used before tokens.</p>}
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 size-4 accent-accent" />
          <span>I agree to the call rules: no recording, respectful conduct, and either side can end the call at any time.</span>
        </label>
        <div className="flex gap-2">
          <button disabled={!agreed || minutes < 1} onClick={() => (track('call_start', { performer: performer.slug, kind }), setStage('call'))} className={primary}>
            Start {kind} call
          </button>
          {minutes < 1 && (
            <button onClick={wallet.openTopUp} className={btn}>
              Buy tokens
            </button>
          )}
          <button onClick={() => (stop(), setStage('profile'))} className={btn}>
            Back
          </button>
        </div>
      </div>
    )

  if (stage === 'call')
    return (
      <div className="mx-auto grid max-w-3xl gap-3">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={kind === 'video' ? '/placeholder/thumb.svg' : performer.avatar} alt="" className={kind === 'video' ? 'size-full object-cover' : 'absolute inset-0 m-auto size-32 rounded-full'} />
          <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs">{performer.name} · demo connection</span>
          {kind === 'video' && stream && <video ref={self} autoPlay muted playsInline className="absolute bottom-2 right-2 w-28 -scale-x-100 rounded-lg border border-line" />}
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-surface p-3 text-sm">
          <span className="text-lg font-semibold tabular-nums" aria-label="Call time">{duration(meter.sec)}</span>
          <span>
            {meter.spent} tokens{meter.bundleUsed > 0 && ` + ${meter.bundleUsed} bundle min`}
          </span>
          <span className={meter.low ? 'font-semibold text-amber-400' : 'text-muted'}>{meter.minutesLeft} min left</span>
          {meter.low && (
            <button onClick={wallet.openTopUp} className="min-h-11 rounded-lg bg-amber-400 px-3 font-semibold text-black">
              Top up without hanging up
            </button>
          )}
        </div>
        <div className="flex justify-center gap-3">
          <button onClick={() => (setMicOn(!micOn), stream?.getAudioTracks().forEach((t) => (t.enabled = !micOn)))} aria-label={micOn ? 'Mute' : 'Unmute'} className={round}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button onClick={() => setKind(kind === 'video' ? 'audio' : 'video')} aria-label={kind === 'video' ? 'Switch to audio' : 'Switch to video'} title="The new rate applies from the next minute" className={round}>
            {kind === 'video' ? <Cam size={20} /> : <VideoOff size={20} />}
          </button>
          <button onClick={() => finish()} aria-label="End call" className="grid size-12 place-items-center rounded-full bg-accent text-white">
            <PhoneOff size={20} />
          </button>
        </div>
        <GiftPicker onGift={(g) => wallet.debit(g.tokens, `Gift during call: ${g.name}`)} />
      </div>
    )

  if (stage === 'receipt')
    return (
      <div className="mx-auto grid max-w-md gap-4 text-sm">
        <h1 className="text-lg font-semibold">Call ended</h1>
        {ended && <p className="rounded-lg bg-amber-400/15 p-3 text-amber-300">{ended}</p>}
        <dl className="grid gap-2 rounded-lg bg-surface p-4">
          {[['With', performer.name], ['Duration', duration(receipt.sec)], ['Tokens charged', String(receipt.tokens)], ['Bundle minutes used', String(receipt.bundleMinutes)]].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-1" role="group" aria-label="Rate this call">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`} aria-pressed={stars >= n} className="grid size-11 place-items-center">
              <Star size={22} className={stars >= n ? 'fill-accent text-accent' : 'text-muted'} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[20, 50].map((n) => (
            <button key={n} onClick={() => wallet.debit(n, `Tip after call: ${performer.name}`) && track('tip', { where: 'call', performer: performer.slug, tokens: n })} className={btn}>
              Tip {n}
            </button>
          ))}
          <button onClick={() => check(kind)} className={primary}>
            Call again
          </button>
          <button onClick={() => setStage('profile')} className={btn}>
            Book next
          </button>
        </div>
      </div>
    )

  return (
    <div className="mx-auto grid max-w-2xl gap-4 text-sm">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={performer.avatar} alt="" className="size-20 rounded-full" />
        <div>
          <h1 className="text-lg font-semibold">{performer.name}</h1>
          <p className="text-muted">
            <span className={`mr-1 inline-block size-2 rounded-full ${performer.status === 'online' ? 'bg-green-500' : performer.status === 'busy' ? 'bg-amber-400' : 'bg-line'}`} />
            {performer.status} · {performer.rating} stars · {performer.callCount} calls · {performer.languages.join(', ')}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['audio', 'video'] as const).map((k) => (
          <div key={k} className="grid gap-2 rounded-lg bg-surface p-4">
            <p className="capitalize text-muted">{k} call</p>
            <p className="text-lg font-semibold">{k === 'audio' ? performer.audioRatePerMin : performer.videoRatePerMin} tokens per minute</p>
            <button disabled={performer.status !== 'online'} onClick={() => check(k)} className={primary}>
              {performer.status === 'online' ? 'Call now' : 'Not available now'}
            </button>
          </div>
        ))}
      </div>
      <section className="rounded-lg bg-surface p-4">
        <h2 className="mb-1 font-semibold">Book a time</h2>
        <p className="mb-3 text-muted">A {DEPOSIT}-token deposit holds the slot. It is refunded in full if you cancel at least 24 hours before.</p>
        <div className="flex flex-wrap gap-2">
          {free.map((s) => (
            <button key={s} onClick={() => book(s)} className={btn}>
              {s}
            </button>
          ))}
          {!free.length && <p className="text-muted">No open slots.</p>}
        </div>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Reviews</h2>
        {[5, 5, 4].map((n, i) => (
          <p key={i} className="border-b border-line py-2 text-muted">
            {'★'.repeat(n)} Demo review {i + 1}
          </p>
        ))}
      </section>
      <Link href="/calls/plans" className="text-accent underline">
        Save with a monthly minute bundle
      </Link>
    </div>
  )
}

// Account tab: bookings, call history and the minute bundle.
export function AccountCalls() {
  const { credit } = useWallet()
  const [bookings, setBookings] = useStored<Booking[]>('tm_bookings', [])
  const [log] = useStored<CallLog[]>('tm_call_log', [])
  const [bundle] = useStored('tm_call_minutes', 0)
  const name = (id: string) => dbGet('performers').find((p) => p.id === id)?.name ?? id
  return (
    <div className="grid max-w-2xl gap-5 text-sm">
      <div className="rounded-lg bg-surface p-4">
        <p className="text-muted">Minute bundle</p>
        <p className="text-lg font-semibold">{bundle} minutes left</p>
        <Link href="/calls/plans" className="text-accent underline">
          Get a bundle
        </Link>
      </div>
      <section>
        <h2 className="mb-2 font-semibold">Upcoming bookings</h2>
        {bookings.length ? (
          bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between border-b border-line py-2">
              <span>
                {name(b.performerId)} · {b.slot}
              </span>
              <button
                onClick={() => {
                  setBookings((all) => all.filter((x) => x.id !== b.id))
                  credit(b.deposit, `Refund: cancelled booking with ${name(b.performerId)}`, 'bonus')
                }}
                className={btn}
              >
                Cancel and refund {b.deposit}
              </button>
            </div>
          ))
        ) : (
          <p className="text-muted">No bookings.</p>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Call history</h2>
        {log.length ? (
          log.map((c) => (
            <p key={c.id} className="flex justify-between border-b border-line py-2">
              <span>
                {c.at.slice(0, 10)} · {name(c.performerId)} · {c.kind}
              </span>
              <span className="tabular-nums text-muted">
                {duration(c.sec)} · {c.tokens} tokens{c.bundleMinutes ? ` + ${c.bundleMinutes} min` : ''}
              </span>
            </p>
          ))
        ) : (
          <p className="text-muted">No calls yet.</p>
        )}
      </section>
    </div>
  )
}
