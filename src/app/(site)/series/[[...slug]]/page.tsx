// src/app/(site)/series/[[...slug]]/page.tsx
// Scheduled premieres. /series lists the series, /series/<slug> shows the episodes, a countdown
// to the next release, a "Remind me" switch and the premiere chat.
// The countdown is real: it counts to releaseAt in /src/data/series.json. No fake timers.
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import series from '@/data/series.json'
import { videosByIds } from '@/lib/api'
import { toggle, useStored } from '@/lib/store'
import { useAuth } from '@/context/Providers'

const pad = (n: number) => String(n).padStart(2, '0')
const countdown = (ms: number) => `${Math.floor(ms / 864e5)}d ${pad(Math.floor(ms / 36e5) % 24)}h ${pad(Math.floor(ms / 6e4) % 60)}m ${pad(Math.floor(ms / 1e3) % 60)}s`

export default function SeriesPage({ params }: { params: { slug?: string[] } }) {
  const { user, openLogin } = useAuth()
  const [now, setNow] = useState(0)
  const [reminders, setReminders] = useStored<string[]>('tm_reminders', [])
  const [chat, setChat] = useState([{ name: 'Member 21', text: 'Ready for the next one' }, { name: 'Member 48', text: 'See you all at the premiere' }])
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const one = series.find((s) => s.slug === params.slug?.[0])
  if (!one)
    return (
      <>
        <h1 className="mb-4 text-lg font-semibold">Series</h1>
        <div className="grid gap-3 md:grid-cols-2">
          {series.map((s) => (
            <Link key={s.slug} href={`/series/${s.slug}`} className="rounded-lg bg-surface p-4 hover:bg-line">
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-muted">{s.episodes.length} episodes, a new one every week</p>
            </Link>
          ))}
        </div>
      </>
    )
  const next = now ? one.episodes.find((e) => Date.parse(e.releaseAt) > now) : undefined
  const reminded = reminders.includes(one.slug)
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <h1 className="text-lg font-semibold">{one.name}</h1>
        {next && (
          <div className="mt-3 rounded-lg border border-accent bg-surface p-4">
            <p className="text-sm text-muted">
              {next.title} premieres {new Date(next.releaseAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <p role="timer" className="mt-1 text-2xl font-bold tabular-nums">
              {countdown(Date.parse(next.releaseAt) - now)}
            </p>
            <button onClick={() => setReminders((r) => toggle(r, one.slug))} aria-pressed={reminded} className={`mt-3 min-h-11 rounded-lg px-4 text-sm font-semibold ${reminded ? 'border border-line' : 'bg-accent text-white'}`}>
              {reminded ? 'Reminder set' : 'Remind me'}
            </button>
          </div>
        )}
        <ol className="mt-4 grid gap-2">
          {one.episodes.map((e) => {
            const out = now > 0 && Date.parse(e.releaseAt) <= now
            const video = videosByIds([e.videoId])[0]
            return (
              <li key={e.n} className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-surface px-4 text-sm">
                <span>{e.title}</span>
                {out && video ? (
                  <Link href={`/video/${video.slug}`} className="grid min-h-11 place-items-center text-accent">
                    Watch
                  </Link>
                ) : (
                  <span className="text-muted">{new Date(e.releaseAt).toLocaleDateString('en', { dateStyle: 'medium' })}</span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
      <aside aria-label="Premiere chat" className="grid content-start gap-2 rounded-lg bg-surface p-3 text-sm">
        <h2 className="font-semibold">Premiere chat</h2>
        <ul className="grid gap-1">
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
            if (!user) return openLogin()
            const input = e.currentTarget.elements.namedItem('text') as HTMLInputElement
            if (input.value.trim()) setChat((all) => [...all, { name: user.name, text: input.value.trim() }])
            input.value = ''
          }}
        >
          <input name="text" aria-label="Message" placeholder={user ? 'Message' : 'Log in to chat'} maxLength={300} className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-ink px-3" />
          <button className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">Send</button>
        </form>
      </aside>
    </div>
  )
}
