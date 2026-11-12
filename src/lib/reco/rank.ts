// src/lib/reco/rank.ts
// Ranking, re-ranking and discovery. Runs in the browser on mock data now. It only needs a
// list of videos and the profile, so it can move to a server unchanged.
import { dbGet, type Video } from '@/lib/db'
import { read } from '@/lib/growth'
import { getCandidates } from '@/lib/reco/candidates'
import { COLD_START_EVENTS, DISCOVERY_EVERY, MAX_RUN, SKIPS_TO_RETIRE, getWeights } from '@/lib/reco/config'
import { contextBoost } from '@/lib/reco/context'
import { hasConsent } from '@/lib/reco/events'
import { getProfile, keysOf, type Profile, type Scores } from '@/lib/reco/profile'
import { velocityScore } from '@/lib/reco/velocity'

export type Parts = { interest: number; session: number; quality: number; freshness: number; velocity: number; context: number }
export type Ranked = { video: Video; score: number; parts: Parts; reason: string; discovery?: string }

const match = (scores: Scores, v: Video) => {
  const max = Math.max(1, ...Object.values(scores).map(Math.abs))
  return keysOf(v).reduce((s, k) => s + (scores[k] ?? 0), 0) / max
}
// Mock average completion per video, 0.3 to 0.8. Real values come from playback logs.
const completion = (v: Video) => 0.3 + (Number(v.id.replace(/\D/g, '')) % 6) / 10

// Tags that often appear together with the viewer's top tags, and that the viewer has not
// taken up yet. Adjacent means related by co-occurrence only. Nothing here orders or selects by intensity.
export function adjacentTags(profile: Profile, all: Video[]) {
  const mine = new Set(Object.keys(profile.long).filter((k) => k.startsWith('tag:') && profile.long[k] > 0).map((k) => k.slice(4)))
  const hits = new Map<string, { n: number; from: string }>()
  for (const top of profile.top('tag:', 3))
    for (const v of all)
      if (v.tags.includes(top))
        for (const t of v.tags) {
          const d = profile.discovery[t]
          if (mine.has(t) || (d && d.skips >= SKIPS_TO_RETIRE && !d.engaged)) continue
          hits.set(t, { n: (hits.get(t)?.n ?? 0) + 1, from: hits.get(t)?.from ?? top })
        }
  return [...hits].sort((a, b) => b[1].n - a[1].n).map(([tag, { from }]) => ({ tag, from }))
}

// True when adding c would make more than MAX_RUN items in a row from one performer or one tag.
function runs(out: Ranked[], c: Ranked) {
  const last = out.slice(-MAX_RUN)
  if (last.length < MAX_RUN) return false
  const shared = (pick: (v: Video) => string[]) => pick(c.video).some((x) => last.every((l) => pick(l.video).includes(x)))
  return shared((v) => v.performerIds) || shared((v) => v.tags)
}

// videos must arrive sorted by trending. Without consent the order comes back unchanged.
export function rankVideos(videos: Video[], opts: { discovery?: boolean; keepWatched?: boolean; following?: string[] } = {}): Ranked[] {
  const personal = hasConsent()
  const profile = getProfile()
  const w = getWeights()
  const reasons = personal ? getCandidates(videos, profile, opts.following ?? read('tm_following', [])) : new Map<string, string>()
  const thin = profile.count < COLD_START_EVENTS
  let list = videos.map((video, i): Ranked => {
    const trend = 1 - i / videos.length
    const parts: Parts = {
      interest: match(profile.long, video),
      session: match(profile.session, video),
      quality: (video.ratingPct / 100 + completion(video)) / 2,
      freshness: 1 / (1 + (Date.now() - Date.parse(video.uploadedAt)) / 864e5 / 30),
      // Cold start: until there is history, trending carries the order.
      velocity: velocityScore(video) + trend * (thin ? 3 : 0.5),
      context: contextBoost(video),
    }
    const score = (Object.keys(parts) as (keyof Parts)[]).reduce((s, k) => s + parts[k] * w[k], 0)
    return { video, score, parts, reason: reasons.get(video.id) ?? 'Popular on the site' }
  })
  // A mood is an explicit choice, not profiling, so it reorders the list even without consent.
  if (!personal) return list.some((r) => r.parts.context >= 3) ? [...list].sort((a, b) => Math.round(b.parts.context) - Math.round(a.parts.context)) : list
  list = list.filter((r) => !profile.hidden.has(r.video.id) && (opts.keepWatched || !profile.watched.has(r.video.id)))
  // Re-rank in one pass: fill each slot with the best item that does not make a run,
  // and give every fifth slot to the best free video from an adjacent interest.
  const pool = list.sort((a, b) => b.score - a.score)
  const adjacent = opts.discovery ? adjacentTags(profile, dbGet('videos')) : []
  const out: Ranked[] = []
  for (let n = 0; pool.length; ) {
    let i = -1
    let extra = {}
    if (adjacent.length && (out.length + 1) % DISCOVERY_EVERY === 0) {
      const { tag, from } = adjacent[n++ % adjacent.length]
      // Free videos only, so trying something new never ends at a paywall.
      const fits = (r: Ranked) => r.video.tags.includes(tag) && !r.video.isPremium && !r.video.ppvPrice
      i = pool.findIndex((r) => fits(r) && !runs(out, r))
      if (i < 0) i = pool.findIndex(fits)
      if (i >= 0) extra = { discovery: tag, reason: `Something new: #${tag} is often watched with #${from}` }
    }
    if (i < 0) i = Math.max(pool.findIndex((r) => !runs(out, r)), 0)
    out.push({ ...pool.splice(i, 1)[0], ...extra })
  }
  return out
}

// "Why this video" for a card that did not come from the feed.
export function explain(v: Video) {
  const profile = getProfile()
  if (v.performerIds.some((p) => read<string[]>('tm_following', []).includes(p))) return 'From a performer you follow'
  const tag = profile.top('tag:', 5).find((t) => v.tags.includes(t))
  return tag ? `Because you watch #${tag}` : 'It matches this page, not your profile'
}
