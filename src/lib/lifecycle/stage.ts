// src/lib/lifecycle/stage.ts
// Lifecycle stage and the spending ladder. Thresholds and copy are in /src/data/offers.json.
import config from '@/data/offers.json'
import { read, write } from '@/lib/growth'

export type Stage = 'new' | 'casual' | 'regular' | 'payer' | 'lapsed'
type Visits = { count: number; last: number; awayDays: number }

// Count one visit per browser session and note how long the visitor was away.
export function trackVisit() {
  try {
    if (sessionStorage.getItem('tm_visit')) return
    sessionStorage.setItem('tm_visit', '1')
  } catch {
    return
  }
  const v = read<Visits>('tm_visits', { count: 0, last: 0, awayDays: 0 })
  write('tm_visits', { count: v.count + 1, last: Date.now(), awayDays: v.last ? (Date.now() - v.last) / 864e5 : 0 })
}
export const visits = () => read<Visits>('tm_visits', { count: 0, last: 0, awayDays: 0 })

export function getStage(hasPurchased: boolean): Stage {
  const v = visits()
  const s = config.stages
  if (v.awayDays >= s.lapsedDays) return 'lapsed'
  if (hasPurchased) return 'payer'
  return v.count >= s.regularVisits ? 'regular' : v.count >= s.casualVisits ? 'casual' : 'new'
}

// Spending ladder: guest, account, first token pack, premium trial, fan club, calls.
// Returns only the next step up, never several offers at once.
export function nextStep(m: { account: boolean; purchased: boolean; premium: boolean }) {
  const done = { account: m.account, tokens: m.purchased, premium: m.premium, fanclub: read<string[]>('tm_fanclubs', []).length > 0, calls: read<unknown[]>('tm_call_log', []).length > 0 }
  return config.ladder.find((step) => !done[step.id as keyof typeof done]) ?? null
}
