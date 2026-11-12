// src/lib/lifecycle/offers.ts
// Contextual offers. Each offer in /src/data/offers.json is tied to one signal and a threshold.
// Rules: one prompt per promptGapMinutes, each offer at most once per day, every prompt
// dismissible, and a countdown only when the offer has a real endsAt date in the data file.
import config from '@/data/offers.json'
import { track } from '@/lib/analytics'
import { assign, stat } from '@/lib/experiment'
import { oncePerDay, read, write } from '@/lib/growth'

export type Shown = { id: string; variant: string; title: string; body: string; cta: string; href?: string; action?: string; endsAt: string | null; data: Record<string, string> }
let current: Shown | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
export const subscribe = (f: () => void) => (subs.add(f), () => subs.delete(f))
export const currentOffer = () => current

const fill = (text: string, data: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k) => data[k] ?? '')
export const promptGapOpen = () => Date.now() - read('tm_prompt_last', 0) >= config.rules.promptGapMinutes * 60000
export const stampPrompt = () => write('tm_prompt_last', Date.now())

// Call this when something happens. value is compared with the offer's threshold.
export function signal(name: string, value: number, data: Record<string, string> = {}) {
  if (typeof window === 'undefined') return
  for (const o of config.offers) {
    if (!o.enabled || o.signal !== name || value < o.threshold) continue
    const endsAt: string | null = o.endsAt
    if (endsAt && Date.parse(endsAt) < Date.now()) continue // an offer past its end date never shows
    if (current || !promptGapOpen() || !oncePerDay(`offer_${o.id}`)) return
    stampPrompt()
    // Every offer runs as an experiment over its copy variants.
    const variant = assign(`offer_${o.id}`, o.variants.map((v) => v.id))
    const copy = o.variants.find((v) => v.id === variant)!
    stat(`offer_${o.id}`, variant, 'shown')
    track('prompt_shown', { name: o.id, variant })
    const { href, action } = o as { href?: string; action?: string }
    current = { id: o.id, variant, title: fill(copy.title, data), body: fill(copy.body, data), cta: fill(o.cta, data), href: href && fill(href, data), action, endsAt, data }
    return emit()
  }
}
export function closeOffer(converted = false) {
  if (current && converted) stat(`offer_${current.id}`, current.variant, 'converted')
  current = null
  emit()
}
