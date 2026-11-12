// src/lib/reco/context.ts
// Context adjustments: device, time of day, and the active mood mode (Phase 13).
import type { Video } from '@/lib/db'
import { activeMood } from '@/lib/mood'

export function contextBoost(v: Video) {
  if (typeof window === 'undefined') return 0
  const phone = window.innerWidth < 768
  const hour = new Date().getHours()
  const night = hour >= 22 || hour < 5
  const mood = activeMood()
  return (
    (phone && v.durationSec < 600 ? 0.1 : 0) + // shorter videos on phones
    (night && v.durationSec > 1200 ? 0.1 : 0) + // longer videos late at night
    (mood ? v.tags.filter((t) => mood.tags.includes(t)).length * 3 : 0) // mood tags lead the feed
  )
}
