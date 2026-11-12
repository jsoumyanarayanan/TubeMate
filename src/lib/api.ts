// src/lib/api.ts
// The only place components read content from. Swap these bodies for real API calls later.
import { dbGet, type Category, type Performer, type Video } from '@/lib/db'
import { rankVideos } from '@/lib/reco/rank'
import { velocityScore } from '@/lib/reco/velocity'
export type { Category, Performer, Video } from '@/lib/db'

export type Sort = 'newest' | 'views' | 'rating' | 'longest' | 'trending' | 'foryou'
export type VideoQuery = {
  q?: string
  category?: string
  tag?: string
  tags?: string[] // any of these, used by mood search
  performer?: string // performer id
  premium?: boolean
  ppv?: boolean
  sort?: Sort
  duration?: 'short' | 'medium' | 'long' // under 10 min, 10 to 30, over 30
  quality?: 'HD' | '4K'
  date?: 'week' | 'month'
  trend?: 'day' | 'week' | 'month' // window for the trending sort
  page?: number
  pageSize?: number
}

// Kept under 400ms so skeletons never linger.
export const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms))
const ageDays = (v: Video) => Math.max(1, (Date.now() - Date.parse(v.uploadedAt)) / 864e5)
// Public lists show published videos only.
export const liveVideos = () => dbGet('videos').filter((v) => v.published !== false)

// Mock trending score: views per day of age. A shorter window favours newer videos.
const trendPower = { day: 2, week: 1, month: 0.5 }
// Videos climbing the viral ladder (reco/velocity.ts) get a boost.
const hot = (v: Video, power = 1) => (v.views / ageDays(v) ** power) * (1 + velocityScore(v))

const sorters: Record<Sort, (a: Video, b: Video) => number> = {
  newest: (a, b) => b.uploadedAt.localeCompare(a.uploadedAt),
  views: (a, b) => b.views - a.views,
  rating: (a, b) => b.ratingPct - a.ratingPct,
  longest: (a, b) => b.durationSec - a.durationSec,
  trending: (a, b) => hot(b) - hot(a),
  foryou: (a, b) => hot(b) - hot(a), // then ranked for the viewer in getVideos
}

export async function getVideos(query: VideoQuery = {}): Promise<{ items: Video[]; total: number }> {
  await delay()
  const { q, category, tag, tags, performer, premium, ppv, sort = 'newest', duration, quality, date, trend, page = 1, pageSize = 24 } = query
  const text = q?.trim().toLowerCase()
  const maxAge = date === 'week' ? 7 : date === 'month' ? 30 : Infinity
  let items = liveVideos()
    .filter(
      (v) =>
        (!text || v.title.toLowerCase().includes(text) || v.tags.some((t) => t.includes(text))) &&
        (!category || v.categorySlug === category) &&
        (!tag || v.tags.includes(tag)) &&
        (!tags?.length || v.tags.some((t) => tags.includes(t))) &&
        (!performer || v.performerIds.includes(performer)) &&
        (premium === undefined || v.isPremium === premium) &&
        (ppv === undefined || !!v.ppvPrice === ppv) &&
        (!quality || v.quality === quality) &&
        (!duration ||
          (duration === 'short' ? v.durationSec < 600 : duration === 'long' ? v.durationSec > 1800 : v.durationSec >= 600 && v.durationSec <= 1800)) &&
        ageDays(v) <= maxAge,
    )
    .sort(sort === 'trending' && trend ? (a, b) => hot(b, trendPower[trend]) - hot(a, trendPower[trend]) : sorters[sort])
  // Personal order. Without consent this leaves the trending order as it is.
  if (sort === 'foryou') items = rankVideos(items, { keepWatched: true }).map((r) => r.video)
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length }
}
export const searchVideos = getVideos

export const videosByIds = (ids: string[]) => {
  const all = liveVideos()
  return ids.map((id) => all.find((v) => v.id === id)).filter((v): v is Video => !!v)
}
export async function getVideo(slug: string) {
  return liveVideos().find((v) => v.slug === slug) ?? null
}
export async function getRelated(video: Video, count = 12) {
  const score = (v: Video) => (v.categorySlug === video.categorySlug ? 2 : 0) + v.tags.filter((t) => video.tags.includes(t)).length
  const list = liveVideos()
    .filter((v) => v.id !== video.id)
    .sort((a, b) => score(b) - score(a) || b.views - a.views)
    .slice(0, count)
  // With consent, the related list is reordered for the viewer.
  return rankVideos(list, { keepWatched: true }).map((r) => r.video)
}
export async function getCategories(): Promise<Category[]> {
  return dbGet('categories')
}
export async function getPerformers(): Promise<Performer[]> {
  return dbGet('performers')
}
export async function getPerformer(slug: string) {
  return dbGet('performers').find((p) => p.slug === slug) ?? null
}
export const popularTags = () => [...new Set(liveVideos().flatMap((v) => v.tags))].slice(0, 8)

// Internal linking helpers.
// Tags that most often appear together with a tag, or inside a category.
export function relatedTags(by: { tag?: string; category?: string }, count = 6) {
  const hits = new Map<string, number>()
  liveVideos()
    .filter((v) => (by.tag ? v.tags.includes(by.tag) : v.categorySlug === by.category))
    .forEach((v) => v.tags.forEach((t) => t !== by.tag && hits.set(t, (hits.get(t) ?? 0) + 1)))
  return [...hits].sort((a, b) => b[1] - a[1]).slice(0, count).map(([t]) => t)
}
// Mock "People also watched": popular videos outside the related list. A real co-watch table replaces this.
export async function getAlsoWatched(video: Video, count = 6) {
  const related = new Set((await getRelated(video)).map((v) => v.id))
  return liveVideos().filter((v) => v.id !== video.id && !related.has(v.id)).sort(sorters.views).slice(0, count)
}
// Mock "Rising performers": trending score of a performer's videos against their follower count.
export async function getRisingPerformers(count = 5) {
  const videos = liveVideos()
  const score = (p: Performer) => videos.filter((v) => v.performerIds.includes(p.id)).reduce((s, v) => s + hot(v), 0) / Math.max(1, p.followers)
  return [...dbGet('performers')].sort((a, b) => score(b) - score(a)).slice(0, count)
}

// The personal feed: every published video, ranked for this viewer, with a discovery slot
// in every fifth place. Without consent it is the trending order.
export async function getFeed() {
  return rankVideos(liveVideos().sort(sorters.trending), { discovery: true })
}
