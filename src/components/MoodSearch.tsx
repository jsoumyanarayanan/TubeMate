// src/components/MoodSearch.tsx
// Search that accepts plain sentences. Words are mapped to tags (see /src/lib/moodSearch.ts)
// and shown as chips the viewer can remove or add to. With no match it is a plain text search.
'use client'
import { useEffect, useState } from 'react'
import { liveVideos } from '@/lib/api'
import { matchTags } from '@/lib/moodSearch'
import { hasConsent, record } from '@/lib/reco/events'
import { SkeletonGrid } from '@/components/Shell'
import { VideoBrowser } from '@/components/VideoBrowser'

export function MoodSearch({ q }: { q: string }) {
  const [all, setAll] = useState<string[]>([])
  const [tags, setTags] = useState<string[] | null>(null)
  useEffect(() => {
    const every = [...new Set(liveVideos().flatMap((v) => v.tags))].sort()
    const matched = matchTags(q, every)
    matched.forEach((term) => record('search', { term }))
    setAll(every)
    setTags(matched)
  }, [q])
  if (!tags) return <SkeletonGrid />
  if (!tags.length) return <VideoBrowser base={{ q }} />
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Showing videos tagged</span>
        {tags.map((t) => (
          <span key={t} className="flex items-center rounded-full border border-accent pl-3">
            #{t}
            <button onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="grid size-11 place-items-center">
              ×
            </button>
          </span>
        ))}
        <select aria-label="Add a tag" value="" onChange={(e) => e.target.value && setTags([...tags, e.target.value])} className="min-h-11 rounded-full border border-line bg-surface px-3">
          <option value="">Add a tag</option>
          {all.filter((t) => !tags.includes(t)).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <VideoBrowser key={tags.join()} base={{ tags }} defaultSort={hasConsent() ? 'foryou' : 'trending'} />
    </>
  )
}
