// src/lib/lifecycle/signals.ts
// Turns what the viewer does into offer signals. Counts live in localStorage (tm_tally_*).
import { dbGet, type Video } from '@/lib/db'
import { read, write } from '@/lib/growth'
import { signal } from '@/lib/lifecycle/offers'
import { getProfile } from '@/lib/reco/profile'
import series from '@/data/series.json'
import characters from '@/data/characters.json'

type Tally = Record<string, number>
function bump(key: string, id: string) {
  const t = read<Tally>(key, {})
  t[id] = (t[id] ?? 0) + 1
  write(key, t)
  return t[id]
}

// Called when a video opens.
export function onWatch(v: Video, ctx: { following: string[]; premium: boolean }) {
  const p = dbGet('performers').find((x) => x.id === v.performerIds[0])
  if (p) {
    const n = bump('tm_tally_perf', p.id)
    const data = { id: p.id, name: p.name, slug: p.slug, href: `/performer/${p.slug}` }
    if (ctx.following.includes(p.id)) signal('performer_watched_following', n, data)
    else signal('performer_watched', n, data)
  }
  if (v.isPremium && !ctx.premium) {
    const n = Number(sessionStorage.getItem('tm_locks') ?? 0) + 1
    sessionStorage.setItem('tm_locks', String(n))
    signal('premium_lock', n)
  }
  const cat = dbGet('categories').find((c) => c.slug === v.categorySlug)
  if (cat) signal('niche_calls', bump('tm_tally_cat', cat.slug), { name: cat.name, href: '/calls' })
  if (v.tags[0]) signal('niche_ai', bump('tm_tally_tag', v.tags[0]), { name: v.tags[0], href: `/ai/${characters[0].slug}` })
}

// Called when a video plays to the end. Series episodes offer the next one, or the bundle when it is not out yet.
export function onEpisodeEnd(videoId: string) {
  for (const s of series) {
    const i = s.episodes.findIndex((e) => e.videoId === videoId)
    if (i < 0) continue
    const next = s.episodes[i + 1]
    if (next && Date.parse(next.releaseAt) <= Date.now()) {
      const slug = dbGet('videos').find((v) => v.id === next.videoId)?.slug
      signal('episode_next', 1, { name: s.name, href: `/video/${slug}` })
    } else {
      signal('episode_bundle', 1, { name: s.name, href: s.bundleId ? '/bundles' : `/series/${s.slug}` })
    }
  }
}

// The category the viewer watches most, for ad targeting. Null until there is consented history.
export function topCategory() {
  const [slug] = getProfile().top('cat:', 1)
  return dbGet('categories').find((c) => c.slug === slug)?.name ?? null
}
