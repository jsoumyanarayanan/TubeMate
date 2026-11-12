// src/lib/reco/candidates.ts
// Candidate generation: merge several sources and remember why each video is there.
// The reason feeds the "Why this video" line.
import type { Video } from '@/lib/db'
import type { Profile } from '@/lib/reco/profile'
import { ladder } from '@/lib/reco/velocity'

// Mock co-watch table: "viewers of A also watched B". A real table comes from playback logs.
export const coWatched = (all: Video[], id: string) => {
  const i = all.findIndex((v) => v.id === id)
  return i < 0 ? [] : [all[(i + 7) % all.length], all[(i + 13) % all.length]]
}

// videos must arrive sorted by trending.
export function getCandidates(videos: Video[], profile: Profile, following: string[]) {
  const reasons = new Map<string, string>()
  const add = (v: Video, why: string) => !reasons.has(v.id) && reasons.set(v.id, why)
  const topTags = profile.top('tag:', 5)
  for (const v of videos) if (v.performerIds.some((p) => following.includes(p))) add(v, 'From a performer you follow')
  for (const t of topTags.slice(0, 3)) for (const v of videos) if (v.tags.includes(t)) add(v, `Because you watch #${t}`)
  for (const id of profile.watched) for (const v of coWatched(videos, id)) add(v, 'Viewers of a video you watched also watched this')
  videos.slice(0, 10).forEach((v) => add(v, 'Trending now'))
  for (const v of videos) {
    const l = ladder(v)
    if (!l.isNew) continue
    // Viral ladder: the first step reaches only viewers whose top interests match the video.
    const matches = v.tags.filter((t) => topTags.includes(t)).length
    if (l.stage >= 2 || (l.stage === 1 && matches > 0) || v.tags.some((t) => topTags.slice(0, 3).includes(t))) add(v, 'New upload')
  }
  return reasons
}
