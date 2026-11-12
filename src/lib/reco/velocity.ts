// src/lib/reco/velocity.ts
// Viral ladder. A new video is first shown to a small matching audience. Each rate that beats
// the site average widens its reach one step, and a video that climbs feeds Trending.
// The counters are mock values derived from the id. A real pipeline fills them from playback events.
import type { Video } from '@/lib/db'

export const siteAverage = { completion: 0.45, like: 0.05, share: 0.012 }
export const REACH = [0.05, 0.25, 0.6, 1] // share of the audience at each step
const NEW_DAYS = 14
const hash = (id: string) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7)

export function ladder(v: Video) {
  const h = hash(v.id)
  const rates = { completion: 0.25 + (h % 45) / 100, like: 0.02 + (h % 9) / 100, share: 0.004 + (h % 6) / 250 }
  const isNew = (Date.now() - Date.parse(v.uploadedAt)) / 864e5 <= NEW_DAYS
  const beats = (Object.keys(siteAverage) as (keyof typeof siteAverage)[]).filter((k) => rates[k] > siteAverage[k]).length
  const stage = isNew ? beats : 3
  return { isNew, stage, reach: REACH[stage], shown: 200 + (h % 800), ...rates }
}
// 0 to 1. Only new videos get a velocity boost.
export const velocityScore = (v: Video) => {
  const l = ladder(v)
  return l.isNew ? l.stage / 3 : 0
}
