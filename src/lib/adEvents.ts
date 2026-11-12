// src/lib/adEvents.ts
// Console logging for now. Replace with the ad network or analytics calls.
import { bump } from '@/lib/growth'

export const trackImpression = (slot: string) => {
  console.log('[ad] impression', slot)
  // Counted so the premium trial banner can show after 3 ad views (see Prompts in Growth.tsx).
  bump('tm_ad_views')
  window.dispatchEvent(new Event('tm:adview'))
}
export const trackClick = (slot: string) => console.log('[ad] click', slot)
