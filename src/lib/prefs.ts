// src/lib/prefs.ts
// Viewer settings read by players and cards: reduced motion, data saver, discreet mode, no history.
import { read, write } from '@/lib/growth'

const browser = () => typeof window !== 'undefined'
export const reducedMotion = () => browser() && matchMedia('(prefers-reduced-motion: reduce)').matches
export const dataSaver = () => browser() && !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
// Autoplaying previews and teasers are off for reduced-motion and data-saver users.
export const canAutoplay = () => !reducedMotion() && !dataSaver()

export const isDiscreet = () => browser() && read('tm_discreet', false)
export const noHistory = () => browser() && read('tm_no_history', false)
export function setPref(key: 'tm_discreet' | 'tm_no_history', on: boolean) {
  write(key, on)
  window.dispatchEvent(new Event('tm:prefs'))
}
