// src/lib/ads.ts
import { dbGet } from '@/lib/db'
export type { AdConfig } from '@/lib/db'

// Slot settings come from ads.json, or from the admin area once edited there.
export const adConfig = (id: string) => dbGet('ads').find((s) => s.id === id && s.enabled) ?? null

// Pop-under hook. Disabled in ads.json by default. The network tag goes inside the if block.
export function maybePopunder() {
  if (!adConfig('popunder')) return
}
