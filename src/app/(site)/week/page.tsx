// src/app/(site)/week/page.tsx
// "Your week": top categories, performers seen for the first time this week, and three suggested next watches.
// Everything comes from this browser's consented history.
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCategories, getVideos, liveVideos, type Category, type Performer, type Video } from '@/lib/api'
import { dbGet } from '@/lib/db'
import { getEvents } from '@/lib/reco/events'
import { getProfile } from '@/lib/reco/profile'
import { VideoCard } from '@/components/VideoCard'

type Recap = { categories: Category[]; performers: Performer[]; next: Video[]; events: number }

export default function WeekPage() {
  const [recap, setRecap] = useState<Recap | null>(null)

  useEffect(() => {
    const weekAgo = Date.now() - 7 * 864e5
    const events = getEvents()
    const videos = liveVideos()
    const performersOf = (id?: string) => videos.find((v) => v.id === id)?.performerIds ?? []
    const before = new Set(events.filter((e) => e.at < weekAgo).flatMap((e) => performersOf(e.video)))
    const fresh = new Set(events.filter((e) => e.at >= weekAgo).flatMap((e) => performersOf(e.video)))
    const slugs = getProfile().top('cat:', 3)
    getCategories().then((all) => {
      getVideos({ sort: 'foryou', pageSize: 3 }).then((r) =>
        setRecap({
          categories: slugs.map((s) => all.find((c) => c.slug === s)).filter((c): c is Category => !!c),
          performers: dbGet('performers').filter((p) => fresh.has(p.id) && !before.has(p.id)),
          next: r.items,
          events: events.filter((e) => e.at >= weekAgo).length,
        }),
      )
    })
  }, [])

  if (!recap) return <p className="text-muted">Loading your week</p>

  const h2 = 'mb-3 text-lg font-semibold'
  return (
    <div className="grid gap-8">
      <h1 className="text-2xl font-semibold">Your week</h1>
      {recap.events === 0 ? (
        <p className="text-muted">Watch a few videos and your week fills in here. Turn on interest tracking in Feed settings first.</p>
      ) : (
        <>
          <section aria-labelledby="week-cats">
            <h2 id="week-cats" className={h2}>
              Your top categories
            </h2>
            {recap.categories.length ? (
              <div className="flex flex-wrap gap-2">
                {recap.categories.map((c) => (
                  <Link key={c.slug} href={`/category/${c.slug}`} className="min-h-11 rounded-full border border-line px-4 leading-[44px] hover:border-accent">
                    {c.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted">No clear favourite yet.</p>
            )}
          </section>

          <section aria-labelledby="week-perf">
            <h2 id="week-perf" className={h2}>
              New performers this week
            </h2>
            {recap.performers.length ? (
              <div className="flex flex-wrap gap-4">
                {recap.performers.map((p) => (
                  <Link key={p.id} href={`/performer/${p.slug}`} className="grid w-20 justify-items-center gap-1 text-center text-xs">
                    <Image src={p.avatar} alt="" width={64} height={64} className="size-16 rounded-full" />
                    <span className="w-full truncate">{p.name}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted">Nobody new this week. Your usual favourites are still here.</p>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="week-next">
        <h2 id="week-next" className={h2}>
          Suggested next watches
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {recap.next.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </section>
    </div>
  )
}
