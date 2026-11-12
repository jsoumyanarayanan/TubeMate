// src/lib/lifecycle/spend.ts
// Optional daily spend limit set at /account/controls. Purchases that would go over it are blocked
// with a message. The total resets at local midnight.
import { read, write } from '@/lib/growth'

const today = () => new Date().toISOString().slice(0, 10)
export const spendLimit = () => read<number | null>('tm_spend_limit', null)
export const spentToday = () => {
  const s = read<{ day: string; usd: number }>('tm_spend', { day: '', usd: 0 })
  return s.day === today() ? s.usd : 0
}

// Returns a message when the purchase is blocked, or null when it can go ahead.
export function canSpend(usd: number): string | null {
  const limit = spendLimit()
  if (limit === null || usd <= 0) return null
  const spent = spentToday()
  if (spent + usd <= limit) return null
  return `This purchase is $${usd.toFixed(2)}, and you have spent $${spent.toFixed(2)} of your $${limit.toFixed(2)} daily limit today. Raise or clear the limit at Account controls, or try again tomorrow.`
}

export function recordSpend(usd: number) {
  if (usd > 0) write('tm_spend', { day: today(), usd: spentToday() + usd })
}
