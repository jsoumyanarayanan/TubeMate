// src/app/(site)/together/page.tsx
// Watch together: a private room for two. Play, pause and seek are mirrored and there is a side chat.
// The demo syncs through BroadcastChannel, so it works between two tabs of one browser.
// A real room uses a WebSocket channel on the server in the same place. Premium feature.
'use client'
import { useEffect, useRef, useState } from 'react'
import { getVideo } from '@/lib/api'
import { playerSource } from '@/lib/playerSource'
import { useData } from '@/lib/store'
import { useAuth, usePaywall } from '@/context/Providers'

type Msg = { from: string; kind: 'hello' | 'welcome' | 'full' | 'play' | 'pause' | 'seek' | 'chat'; t?: number; text?: string; name?: string; to?: string }
const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'

export default function TogetherPage({ searchParams }: { searchParams: { room?: string; v?: string } }) {
  const { ready, user } = useAuth()
  const paywall = usePaywall()
  const slug = searchParams.v ?? 'demo-video-01'
  const room = searchParams.room
  const data = useData(async () => ({ video: await getVideo(slug) }), slug)
  const el = useRef<HTMLVideoElement>(null)
  const chan = useRef<BroadcastChannel | null>(null)
  const me = useRef('')
  const partner = useRef('')
  const remote = useRef(false) // true while applying the partner's action, so it is not echoed back
  const [state, setState] = useState<'waiting' | 'connected' | 'full'>('waiting')
  const [chat, setChat] = useState<{ name: string; text: string }[]>([])
  const [copied, setCopied] = useState(false)
  const premium = !!user?.isPremium

  useEffect(() => {
    if (!room || !premium) return
    me.current = crypto.randomUUID()
    const c = (chan.current = new BroadcastChannel(`tm_together_${room}`))
    const send = (m: Omit<Msg, 'from'>) => c.postMessage({ ...m, from: me.current })
    c.onmessage = ({ data: m }: MessageEvent<Msg>) => {
      if (m.to && m.to !== me.current) return
      if (m.kind === 'full') return setState('full'), c.close()
      if (m.kind === 'hello') {
        // A room holds two people. A third visitor is turned away.
        if (partner.current && partner.current !== m.from) return send({ kind: 'full', to: m.from })
        partner.current = m.from
        setState('connected')
        return send({ kind: 'welcome', to: m.from, t: el.current?.currentTime })
      }
      if (m.from !== partner.current && m.kind !== 'welcome') return
      const v = el.current
      if (m.kind === 'welcome') {
        partner.current = m.from
        setState('connected')
      }
      if (m.kind === 'chat') return setChat((all) => [...all, { name: m.name!, text: m.text! }])
      if (!v) return
      remote.current = true
      if (m.t !== undefined && Math.abs(v.currentTime - m.t) > 0.5) v.currentTime = m.t
      if (m.kind === 'play') v.play().catch(() => {})
      if (m.kind === 'pause') v.pause()
      setTimeout(() => (remote.current = false), 300)
    }
    send({ kind: 'hello' })
    return () => c.close()
  }, [room, premium])

  const mirror = (kind: 'play' | 'pause' | 'seek') => !remote.current && chan.current?.postMessage({ from: me.current, kind, t: el.current?.currentTime })
  if (!ready || !data) return null
  if (!premium)
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <h1 className="text-lg font-semibold">Watch together</h1>
        <p className="max-w-md text-sm text-muted">A private room for two. Playback stays in step for both of you and there is a side chat. Included with Premium.</p>
        <button onClick={paywall.openPremium} className={primary}>
          Go Premium
        </button>
      </div>
    )
  if (!room)
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <h1 className="text-lg font-semibold">Watch together</h1>
        <p className="text-sm text-muted">Create a private room for {data.video?.title ?? 'a video'} and send the link to one other person.</p>
        <a href={`/together?room=${crypto.randomUUID().slice(0, 8)}&v=${slug}`} className={`${primary} grid place-items-center`}>
          Create room
        </a>
      </div>
    )
  if (state === 'full') return <p className="py-20 text-center text-sm text-muted">This room already has two people.</p>
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {data.video && (
          <video
            ref={el}
            src={playerSource(data.video)}
            poster={data.video.thumb}
            controls
            playsInline
            controlsList="nodownload"
            onPlay={() => mirror('play')}
            onPause={() => mirror('pause')}
            onSeeked={() => mirror('seek')}
            className="aspect-video w-full rounded-lg bg-black"
          />
        )}
        <h1 className="mt-3 text-lg font-semibold">{data.video?.title}</h1>
        <p role="status" className="text-sm text-muted">
          {state === 'connected' ? 'Your partner is here. Playback is in step.' : 'Waiting for your partner to open the link.'}
        </p>
        <button onClick={() => navigator.clipboard?.writeText(location.href).then(() => setCopied(true), () => {})} className="mt-2 min-h-11 rounded-lg border border-line px-4 text-sm">
          {copied ? 'Link copied' : 'Copy room link'}
        </button>
      </div>
      <aside aria-label="Chat" className="grid content-start gap-2 rounded-lg bg-surface p-3 text-sm">
        <h2 className="font-semibold">Private chat</h2>
        <ul className="grid max-h-72 gap-1 overflow-y-auto">
          {chat.map((m, i) => (
            <li key={i}>
              <span className="text-muted">{m.name}:</span> {m.text}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const input = e.currentTarget.elements.namedItem('text') as HTMLInputElement
            const text = input.value.trim()
            if (!text) return
            setChat((all) => [...all, { name: 'You', text }])
            chan.current?.postMessage({ from: me.current, kind: 'chat', name: user!.name, text })
            input.value = ''
          }}
        >
          <input name="text" aria-label="Message" placeholder="Message" maxLength={300} className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-ink px-3" />
          <button className={primary}>Send</button>
        </form>
      </aside>
    </div>
  )
}
