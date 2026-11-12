// src/lib/reco/events.ts
// Event tracker. Nothing is stored until the visitor accepts "Personalise my feed".
// Guests: the log stays in localStorage on this device.
// Members: same data. Send each event to the server at the marked line once there is one.
import { read, write } from '@/lib/growth'
import { MAX_EVENTS, type EventType } from '@/lib/reco/config'

export type RecoEvent = { type: EventType; at: number; video?: string; performer?: string; category?: string; term?: string; value?: number; disc?: string }
const KEYS = ['tm_reco_events', 'tm_reco_removed', 'tm_reco_seen', 'tm_reco_paused', 'tm_reco_weights']
const changed = () => window.dispatchEvent(new Event('tm:reco'))
const browser = () => typeof window !== 'undefined'

export const consent = () => (browser() ? read<'' | 'yes' | 'no'>('tm_reco_consent', '') : '')
export const hasConsent = () => consent() === 'yes'
export const isPaused = () => read('tm_reco_paused', false) || read('tm_no_history', false)
export const getEvents = (): RecoEvent[] => (hasConsent() ? read('tm_reco_events', []) : [])

export function record(type: EventType, data: Omit<RecoEvent, 'type' | 'at'> = {}) {
  if (!browser() || !hasConsent() || isPaused()) return
  if (type === 'impression') {
    // Impressions are only counted, so they do not push real signals out of the log.
    const seen = read<Record<string, number>>('tm_reco_seen', {})
    return write('tm_reco_seen', { ...seen, [data.video!]: (seen[data.video!] ?? 0) + 1 })
  }
  // A card opened from a discovery slot carries its discovery tag into the events that follow.
  let disc: string | undefined
  try {
    const src = JSON.parse(sessionStorage.getItem('tm_reco_src') ?? 'null')
    if (src && src.id === data.video) disc = src.tag
  } catch {}
  write('tm_reco_events', [...read<RecoEvent[]>('tm_reco_events', []), { type, at: Date.now(), ...data, ...(disc ? { disc } : {}) }].slice(-MAX_EVENTS))
  // Members: POST the event to the server here.
  changed()
}

const clear = (keys: string[]) => keys.forEach((k) => localStorage.removeItem(k))
export function setConsent(yes: boolean) {
  if (!yes) clear(KEYS)
  write('tm_reco_consent', yes ? 'yes' : 'no')
  changed()
}
export const setPaused = (on: boolean) => (write('tm_reco_paused', on), changed())
// Forget one interest: events before now no longer count toward it.
export const removeInterest = (key: string) => (write('tm_reco_removed', { ...read('tm_reco_removed', {}), [key]: Date.now() }), changed())
// "Reset my feed": keeps consent, forgets everything learned.
export const resetProfile = () => (clear(['tm_reco_events', 'tm_reco_removed', 'tm_reco_seen']), changed())
// "Delete all data": also withdraws consent, so the prompt shows again.
export const deleteAll = () => (clear([...KEYS, 'tm_reco_consent']), changed())
