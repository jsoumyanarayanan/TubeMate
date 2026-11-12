// src/lib/reco/config.ts
// Every tunable number of the recommendation engine lives here.
import { assign } from '@/lib/experiment'
import { read } from '@/lib/growth'

// score = interest match + session match + quality + freshness + velocity + context
export const defaultWeights = { interest: 1, session: 2, quality: 0.5, freshness: 0.3, velocity: 0.4, context: 1 }
export type Weights = typeof defaultWeights
// The admin debug page (/admin/reco) saves slider values in the browser. They win over the defaults.
// Feed weight experiment (Phase 14): variant b leans harder on the current session.
export const weightVariants: Record<string, Partial<Weights>> = { a: {}, b: { session: 3 } }
export const getWeights = (): Weights =>
  typeof window === 'undefined' ? defaultWeights : { ...defaultWeights, ...weightVariants[assign('feed_weights', ['a', 'b'])], ...read<Partial<Weights>>('tm_reco_weights', {}) }

// How much each event moves an interest. "watch" is multiplied by the share of the video watched.
export const eventWeights = {
  impression: 0, dwell: 0.2, click: 0.5, watch: 2, complete: 1, replay: 1.5, like: 2, dislike: -3, favourite: 2.5, playlist: 2, share: 2.5,
  search: 1, follow: 3, purchase: 4, tip: 3, not_interested: -4, less: -2, skip: -1.5, pick: 2,
}
export type EventType = keyof typeof eventWeights

export const HALF_LIFE_DAYS = 14 // old weights halve every 14 days
export const SESSION_EVENTS = 10 // the session profile is the last 10 events
export const MAX_EVENTS = 500
export const MAX_RUN = 2 // no more than 2 items in a row from one performer or tag
export const DISCOVERY_EVERY = 5 // every fifth slot shows an adjacent interest
export const SKIPS_TO_RETIRE = 3 // a discovery tag is dropped after 3 skips
export const QUICK_SKIP = 0.1 // left before 10 percent
export const COLD_START_EVENTS = 5 // below this, trending is blended in at full strength
