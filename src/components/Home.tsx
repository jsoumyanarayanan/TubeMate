// src/components/Home.tsx
// The home page body. The route file src/app/(site)/page.tsx holds the metadata.
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { getCategories, getRelated, getVideos, liveVideos, videosByIds, type VideoQuery } from '@/lib/api'
import { dbGet } from '@/lib/db'
import { read } from '@/lib/growth'
import { getProfile } from '@/lib/reco/profile'
import { adjacentTags } from '@/lib/reco/rank'
import { useReco } from '@/lib/reco/useReco'
import { MoodShortcuts } from '@/components/Mood'
import { getProgress } from '@/lib/growth'
import { useData, useFresh } from '@/lib/store'
import rooms from '@/data/rooms.json'
import { PartnerOffers } from '@/components/Ads'
import { ConsentPrompt, ForYouRow } from '@/components/Reco'
import { StageRows } from '@/components/Stage'
import { SkeletonGrid } from '@/components/Shell'
import { CategoryCard, VideoCard } from '@/components/VideoCard'

const rows: [string, string, VideoQuery][] = [
  ['Trending', '/trending', { sort: 'trending' }],
  ['New', '/new', { sort: 'newest' }],
  ['Most Viewed', '/top-rated', { sort: 'views' }],
  ['Recommended', '/top-rated', { sort: 'rating' }],
  ['Premium Picks', '/premium', { premium: true, sort: 'rating' }],
]
const scroller = 'flex snap-x gap-3 overflow-x-auto pb-2'
const tile = 'w-[46%] shrink-0 snap-start md:w-[31%] xl:w-[23.5%] 2xl:w-[16%]'
const head = (id: string, title: string, href: string) => (
  <div className="mb-2 flex items-center justify-between">
    <h2 id={id} className="text-lg font-semibold">
      {title}
    </h2>
    <Link href={href} className="flex min-h-11 items-center text-sm text-accent">
      See all
    </Link>
  </div>
)

// Rows built from the viewer's own activity. They refresh in place when the profile changes.
// part="top": "Because you watched" and the stories row of followed performers.
// part="discovery": rows named after an adjacent interest.
function PersonalRows({ part }: { part: 'top' | 'discovery' }) {
  const reco = useReco()
  const personal = reco.consent === 'yes'
  const data = useFresh(async () => {
    const all = liveVideos()
    const last = personal ? all.find((v) => v.id === read<string[]>('tm_history', [])[0]) : undefined
    const following = read<string[]>('tm_following', [])
    const stories = dbGet('performers')
      .filter((p) => following.includes(p.id))
      .map((p) => {
        const room = rooms.find((r) => r.isLive && r.performerId === p.id)
        const fresh = all.some((v) => v.performerIds.includes(p.id) && Date.now() - Date.parse(v.uploadedAt) < 7 * 864e5)
        return { p, label: room ? 'Live' : fresh ? 'New' : '', href: room ? `/live/${room.slug}` : `/performer/${p.slug}` }
      })
    const explore = personal ? adjacentTags(getProfile(), all).slice(0, 2).map(({ tag }) => ({ tag, videos: all.filter((v) => v.tags.includes(tag)).slice(0, 8) })) : []
    return { last, because: last ? (await getRelated(last, 8)).filter((v) => v.id !== last.id) : [], stories, explore }
  }, reco.version)
  if (!data) return null
  const row = (id: string, title: string, href: string, videos: typeof data.because) => (
    <section key={id} aria-labelledby={id}>
      {head(id, title, href)}
      <div className={scroller}>
        {videos.map((v) => (
          <div key={v.id} className={tile}>
            <VideoCard video={v} />
          </div>
        ))}
      </div>
    </section>
  )
  if (part === 'discovery') return <>{data.explore.map((e) => row(`row-explore-${e.tag}`, `Explore #${e.tag}`, `/tags/${e.tag}`, e.videos))}</>
  return (
    <>
      {data.last && data.because.length > 0 && row('row-because', `Because you watched ${data.last.title}`, `/video/${data.last.slug}`, data.because)}
      {data.stories.length > 0 && (
        <section aria-label="Performers you follow" className="flex gap-4 overflow-x-auto pb-1">
          {data.stories.map(({ p, label, href }) => (
            <Link key={p.id} href={href} className="grid w-20 shrink-0 justify-items-center gap-1 text-center text-xs">
              <span className={`relative rounded-full p-0.5 ${label ? 'bg-accent' : 'bg-line'}`}>
                <Image src={p.avatar} alt="" width={64} height={64} className="size-16 rounded-full border-2 border-ink" />
                {label && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-accent px-1.5 text-[10px] font-semibold text-white">{label}</span>}
              </span>
              <span className="w-full truncate">{p.name}</span>
            </Link>
          ))}
        </section>
      )}
    </>
  )
}

export function Home() {
  const data = useData(() =>
    Promise.all([
      // Resume points saved by the player, skipping videos that are barely started or finished.
      (async () => {
        const progress = getProgress()
        const ids = Object.keys(progress).filter((id) => progress[id].t > 3 && progress[id].t < progress[id].d * 0.95)
        return videosByIds(ids.reverse()).slice(0, 8).map((v) => ({ v, pct: (progress[v.id].t / progress[v.id].d) * 100 }))
      })(),
      getCategories(), getVideos({ sort: 'rating', quality: '4K', pageSize: 2 }), ...rows.map(([, , query]) => getVideos({ ...query, pageSize: 8 }))]),
  )
  if (!data) return <SkeletonGrid />
  const [resume, categories, featured, ...lists] = data

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <ConsentPrompt />
      {resume.length > 0 && (
        <section aria-labelledby="row-resume">
          {head('row-resume', 'Pick up where you left off', '/account/history')}
          <div className={scroller}>
            {resume.map(({ v, pct }) => (
              <div key={v.id} className={tile}>
                <VideoCard video={v} />
                <div className="mt-1 h-1 rounded bg-line" role="progressbar" aria-label="Watched" aria-valuenow={Math.round(pct)}>
                  <div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <PersonalRows part="top" />
      <StageRows scroller={scroller} tile={tile} />
      <MoodShortcuts />
      <ForYouRow scroller={scroller} tile={tile} />
      <PersonalRows part="discovery" />
      <section aria-label="Featured" className="grid gap-3 md:grid-cols-2">
        {featured.items.map((v) => (
          <VideoCard key={v.id} video={v} priority />
        ))}
      </section>

      <section aria-labelledby="row-live">
        {head('row-live', 'Live now', '/live')}
        <div className={scroller}>
          {rooms.filter((r) => r.isLive).slice(0, 6).map((r) => (
            <Link key={r.id} href={`/live/${r.slug}`} className={`${tile} relative block aspect-video overflow-hidden rounded-lg bg-surface`}>
              <Image src="/placeholder/thumb.svg" alt="" width={320} height={180} className="size-full object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">LIVE</span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-2 text-sm">{r.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <PartnerOffers />

      {rows.map(([title, href], i) => (
        <section key={title} aria-labelledby={`row-${i}`}>
          {head(`row-${i}`, title, href)}
          <div className={scroller}>
            {lists[i].items.map((v) => (
              <div key={v.id} className={tile}>
                <VideoCard video={v} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <section aria-labelledby="row-cats">
        {head('row-cats', 'Categories', '/categories')}
        <div className={scroller}>
          {categories.map((c) => (
            <div key={c.slug} className={tile}>
              <CategoryCard category={c} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
