// src/app/(site)/calls/page.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { getPerformers } from '@/lib/api'
import { useData } from '@/lib/store'
import { gridCols } from '@/components/VideoCard'

const select = 'min-h-11 rounded-lg border border-line bg-surface px-3 text-sm'

export default function CallsPage() {
  const performers = useData(getPerformers) ?? []
  const [online, setOnline] = useState(false)
  const [kind, setKind] = useState<'audio' | 'video'>('video')
  const [max, setMax] = useState(0)
  const [language, setLanguage] = useState('')
  const [rating, setRating] = useState(0)
  const price = (p: (typeof performers)[number]) => (kind === 'video' ? p.videoRatePerMin : p.audioRatePerMin)
  const list = performers.filter((p) => p.callsEnabled && (!online || p.status === 'online') && (!max || price(p) <= max) && (!language || p.languages.includes(language)) && p.rating >= rating)

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Calls</h1>
        <Link href="/calls/plans" className="flex min-h-11 items-center text-sm text-accent">
          Minute bundles
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} className="size-4 accent-accent" /> Online now
        </label>
        <select aria-label="Call type" className={select} value={kind} onChange={(e) => setKind(e.target.value as 'audio' | 'video')}>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
        </select>
        <select aria-label="Maximum price" className={select} value={max} onChange={(e) => setMax(Number(e.target.value))}>
          <option value={0}>Any price</option>
          {[15, 25, 35, 45].map((n) => (
            <option key={n} value={n}>
              Up to {n} per minute
            </option>
          ))}
        </select>
        <select aria-label="Language" className={select} value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">Any language</option>
          {['English', 'Spanish', 'German', 'French'].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select aria-label="Minimum rating" className={select} value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          <option value={0}>Any rating</option>
          <option value={4.5}>4.5 and up</option>
          <option value={4.7}>4.7 and up</option>
        </select>
      </div>
      <div className={gridCols}>
        {list.map((p) => (
          <Link key={p.id} href={`/calls/${p.slug}`} className="grid gap-1 rounded-lg bg-surface p-4 text-sm hover:bg-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatar} alt="" loading="lazy" className="size-16 rounded-full" />
            <span className="font-medium">
              <span className={`mr-1 inline-block size-2 rounded-full ${p.status === 'online' ? 'bg-green-500' : p.status === 'busy' ? 'bg-amber-400' : 'bg-line'}`} aria-label={p.status} />
              {p.name}
            </span>
            <span className="text-xs text-muted">
              Audio {p.audioRatePerMin} · Video {p.videoRatePerMin} per minute
            </span>
            <span className="text-xs text-muted">
              {p.rating} stars · {p.languages.join(', ')}
            </span>
          </Link>
        ))}
      </div>
      {!list.length && <p className="py-10 text-center text-sm text-muted">No performers match these filters.</p>}
    </>
  )
}
