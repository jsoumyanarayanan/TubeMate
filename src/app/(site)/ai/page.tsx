// src/app/(site)/ai/page.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useCharacters, type Character } from '@/lib/characters'
import { gridCols } from '@/components/VideoCard'

export default function AiPage() {
  const { base, custom } = useCharacters()
  const [trait, setTrait] = useState('')
  const [mine, setMine] = useState(false)
  const traits = [...new Set(base.flatMap((c) => c.personality))]
  const list = (mine ? custom : [...custom, ...base]).filter((c) => !trait || c.personality.includes(trait))
  const card = (c: Character) => (
    <Link key={c.id} href={`/ai/${c.slug}`} className="grid gap-1 rounded-lg bg-surface p-4 text-sm hover:bg-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.avatar} alt="" loading="lazy" className="size-16 rounded-full" />
      <span className="font-medium">
        {c.name}, {c.age}
      </span>
      <span className="text-xs text-muted">{c.tagline}</span>
      <span className="text-xs text-muted">{c.personality.join(' · ')}</span>
      <span className="text-[11px] text-accent">AI character{c.custom ? ' · yours' : c.isPremium ? ' · AI Plus' : ''}</span>
    </Link>
  )
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">AI characters</h1>
      <p className="mb-4 text-sm text-muted">Every character is a fictional adult and is clearly labelled as AI.</p>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <select aria-label="Personality" value={trait} onChange={(e) => setTrait(e.target.value)} className="min-h-11 rounded-lg border border-line bg-surface px-3">
          <option value="">All personalities</option>
          {traits.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="size-4 accent-accent" /> My characters
        </label>
      </div>
      <div className={gridCols}>
        <Link href="/ai/create" className="grid place-items-center gap-2 rounded-lg border border-dashed border-accent p-4 text-sm text-accent">
          <Plus size={28} /> Create your own
        </Link>
        {list.map(card)}
      </div>
    </>
  )
}
