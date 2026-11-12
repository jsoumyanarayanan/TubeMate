// src/lib/reco/profile.ts
// Interest profile: a score per tag, category and performer, built from the event log.
// Keys look like "tag:tag-one", "cat:category-01", "perf:p01".
import { dbGet, type Video } from '@/lib/db'
import { read } from '@/lib/growth'
import { eventWeights, HALF_LIFE_DAYS, QUICK_SKIP, SESSION_EVENTS } from '@/lib/reco/config'
import { getEvents, type RecoEvent } from '@/lib/reco/events'

export type Scores = Record<string, number>
export const keysOf = (v: Video) => [...v.tags.map((t) => `tag:${t}`), `cat:${v.categorySlug}`, ...v.performerIds.map((p) => `perf:${p}`)]

function score(events: RecoEvent[], byId: Map<string, Video>, decay: boolean): Scores {
  const removed = read<Record<string, number>>('tm_reco_removed', {})
  const now = Date.now()
  const out: Scores = {}
  for (const e of events) {
    // Watch time counts as a share of the video's length, not raw seconds.
    const base = e.type === 'watch' ? (e.value ?? 0) * eventWeights.watch : eventWeights[e.type]
    const w = decay ? base * 0.5 ** ((now - e.at) / 864e5 / HALF_LIFE_DAYS) : base
    const video = e.video ? byId.get(e.video) : undefined
    const keys = [
      ...(video ? keysOf(video) : []),
      ...(e.performer ? [`perf:${e.performer}`] : []),
      ...(e.category ? [`cat:${e.category}`] : []),
      ...(e.term ? [...new Set([...byId.values()].flatMap((v) => v.tags))].filter((t) => t.includes(e.term!)).map((t) => `tag:${t}`) : []),
    ]
    for (const k of new Set(keys)) if (!(removed[k] >= e.at)) out[k] = (out[k] ?? 0) + w
  }
  return out
}

export function getProfile() {
  const events = getEvents()
  const byId = new Map(dbGet('videos').map((v) => [v.id, v]))
  const long = score(events, byId, true)
  // The session profile is the last few events, undecayed. rank.ts weights it double.
  const session = score(events.slice(-SESSION_EVENTS), byId, false)
  const top = (prefix: string, n = 5) => Object.entries(long).filter(([k, w]) => k.startsWith(prefix) && w > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k.slice(prefix.length))
  // Discovery tags: skips and engagement on cards opened from a discovery slot.
  const discovery: Record<string, { skips: number; engaged: boolean }> = {}
  for (const e of events) {
    if (!e.disc) continue
    const d = (discovery[e.disc] ??= { skips: 0, engaged: false })
    if (['skip', 'not_interested', 'less'].includes(e.type)) d.skips++
    if (['like', 'favourite', 'complete'].includes(e.type) || (e.type === 'watch' && (e.value ?? 0) >= QUICK_SKIP)) d.engaged = true
  }
  return {
    count: events.length,
    long,
    session,
    top,
    discovery,
    watched: new Set(events.filter((e) => e.type === 'watch' || e.type === 'complete').map((e) => e.video!)),
    hidden: new Set(events.filter((e) => e.type === 'not_interested' || e.type === 'less').map((e) => e.video!)),
  }
}
export type Profile = ReturnType<typeof getProfile>
