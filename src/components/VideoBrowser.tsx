// src/components/VideoBrowser.tsx
// One browsing surface for category, tag, search, performer and list pages:
// filter bar, grid, pagination with an infinite-scroll toggle, skeleton and empty states.
'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getVideos, popularTags, type Sort, type Video, type VideoQuery } from '@/lib/api'
import { hasConsent, record } from '@/lib/reco/events'
import { SkeletonGrid } from '@/components/Shell'
import { VideoGrid } from '@/components/VideoCard'

const PAGE_SIZE = 12
const select = 'min-h-11 rounded-lg border border-line bg-surface px-3 text-sm'

type Filters = Pick<VideoQuery, 'sort' | 'duration' | 'quality' | 'date'>

export function VideoBrowser({ base = {}, defaultSort = 'newest' }: { base?: VideoQuery; defaultSort?: Sort }) {
  const [filters, setFilters] = useState<Filters>({ sort: defaultSort })
  const [page, setPage] = useState(1)
  const [infinite, setInfinite] = useState(false)
  const [items, setItems] = useState<Video[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const sentinel = useRef<HTMLDivElement>(null)
  const baseKey = JSON.stringify(base)

  useEffect(() => {
    let stale = false
    setLoading(true)
    getVideos({ ...JSON.parse(baseKey), ...filters, page, pageSize: PAGE_SIZE }).then((res) => {
      if (stale) return
      setItems((prev) => (infinite && page > 1 ? [...prev, ...res.items] : res.items))
      setTotal(res.total)
      setLoading(false)
    })
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey, filters, page])

  const pages = Math.ceil(total / PAGE_SIZE)

  // Search terms feed the interest profile, and search results use the personal order when consent is on.
  useEffect(() => {
    const q = (JSON.parse(baseKey) as VideoQuery).q?.trim().toLowerCase()
    if (!q) return
    record('search', { term: q })
    if (hasConsent()) setFilters((f) => ({ ...f, sort: 'foryou' }))
  }, [baseKey])

  // Infinite scroll: load the next page when the sentinel comes into view.
  useEffect(() => {
    if (!infinite || loading || page >= pages || !sentinel.current) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setPage((p) => p + 1))
    io.observe(sentinel.current)
    return () => io.disconnect()
  }, [infinite, loading, page, pages])

  const set = (patch: Filters) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }
  const pick = <K extends keyof Filters>(key: K, label: string, options: [string, string][]) => (
    <label className="grid gap-1 text-xs text-muted">
      {label}
      <select className={select} value={filters[key] ?? ''} onChange={(e) => set({ [key]: e.target.value || undefined } as Filters)}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )

  const firstLoad = loading && (!infinite || page === 1)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {pick('sort', 'Sort by', [['newest', 'Newest'], ['views', 'Most viewed'], ['rating', 'Top rated'], ['longest', 'Longest'], ['trending', 'Trending'], ['foryou', 'For you']])}
        {pick('duration', 'Duration', [['', 'Any'], ['short', 'Under 10 min'], ['medium', '10 to 30 min'], ['long', 'Over 30 min']])}
        {pick('quality', 'Quality', [['', 'Any'], ['HD', 'HD'], ['4K', '4K']])}
        {pick('date', 'Date added', [['', 'Any time'], ['week', 'This week'], ['month', 'This month']])}
        <label className="ml-auto flex min-h-11 items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={infinite}
            onChange={(e) => {
              setInfinite(e.target.checked)
              setPage(1)
            }}
          />
          Infinite scroll
        </label>
      </div>

      {firstLoad ? (
        <SkeletonGrid count={PAGE_SIZE} />
      ) : items.length ? (
        <>
          <p className="mb-3 text-xs text-muted">{total} videos</p>
          <VideoGrid videos={items} />
        </>
      ) : (
        <div className="py-16 text-center">
          <p className="font-semibold">No results</p>
          <p className="mt-1 text-sm text-muted">Try fewer filters, or one of these popular tags.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {popularTags().map((t) => (
              <Link key={t} href={`/tags/${t}`} className="grid min-h-11 place-items-center rounded-full border border-line px-4 text-sm">
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}

      {infinite ? (
        <div ref={sentinel} className="py-6 text-center text-sm text-muted">
          {loading && page > 1 ? 'Loading more' : page >= pages && items.length ? 'End of results' : ''}
        </div>
      ) : (
        pages > 1 && (
          <nav aria-label="Pages" className="mt-6 flex flex-wrap justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => {
                  setPage(n)
                  window.scrollTo({ top: 0 })
                }}
                aria-current={n === page ? 'page' : undefined}
                className={`size-11 rounded-lg border text-sm ${n === page ? 'border-accent bg-accent text-white' : 'border-line'}`}
              >
                {n}
              </button>
            ))}
          </nav>
        )
      )}
    </>
  )
}
