// src/app/(site)/live/page.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import rooms from '@/data/rooms.json'
import { getProfile } from '@/lib/reco/profile'
import { useReco } from '@/lib/reco/useReco'
import { useStored } from '@/lib/store'
import { gridCols } from '@/components/VideoCard'
import { GoLiveOptIn } from '@/components/Growth'

const select = 'min-h-11 rounded-lg border border-line bg-surface px-3 text-sm'
const tags = [...new Set(rooms.flatMap((r) => r.tags))]
const languages = [...new Set(rooms.map((r) => r.language))]

export default function LivePage() {
  const [tag, setTag] = useState('')
  const [language, setLanguage] = useState('')
  const [sort, setSort] = useState('viewers')
  const reco = useReco()
  const scores = reco.consent === 'yes' ? getProfile().long : {}
  const liking = (id: string) => scores[`perf:${id}`] ?? 0
  const [notify, setNotify] = useStored<string[]>('tm_notify', [])
  const list = rooms
    .filter((r) => (!tag || r.tags.includes(tag)) && (!language || r.language === language) && (sort !== 'new' || r.isNew))
    // With consent, rooms of performers the viewer likes come first among the live ones.
    .sort((a, b) => Number(b.isLive) - Number(a.isLive) || liking(b.performerId) - liking(a.performerId) || b.viewers - a.viewers)

  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">Live rooms</h1>
      <GoLiveOptIn />
      <div className="mb-4 flex flex-wrap gap-3">
        <select aria-label="Tag" className={select} value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select aria-label="Language" className={select} value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">All languages</option>
          {languages.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select aria-label="Show" className={select} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="viewers">Most viewers</option>
          <option value="new">New hosts</option>
        </select>
      </div>
      <div className={gridCols}>
        {list.map((r) => (
          <div key={r.id}>
            <Link href={r.isLive ? `/live/${r.slug}` : '#'} aria-disabled={!r.isLive} className={`relative block aspect-video overflow-hidden rounded-lg bg-surface ${r.isLive ? '' : 'opacity-50'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/placeholder/thumb.svg" alt="" loading="lazy" className="size-full object-cover" />
              <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none ${r.isLive ? 'bg-accent text-white' : 'bg-line'}`}>{r.isLive ? 'LIVE' : 'OFFLINE'}</span>
              {r.isLive && <span className="absolute right-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] leading-none">{r.viewers} watching</span>}
            </Link>
            <p className="mt-2 text-sm font-medium">{r.title}</p>
            <p className="text-xs text-muted">
              {r.tags.join(' · ')} · {r.language}
            </p>
            {!r.isLive && (
              <button onClick={() => setNotify((n) => (n.includes(r.id) ? n.filter((x) => x !== r.id) : [...n, r.id]))} className="mt-1 min-h-11 text-sm text-accent">
                {notify.includes(r.id) ? 'You will be notified' : 'Notify me'}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
