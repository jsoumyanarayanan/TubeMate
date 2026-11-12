// src/lib/lifecycle/notify.ts
// Return triggers. Mock senders that log to the console. A real push service and email
// provider replace send(). Limits: 1 push a day and 2 emails a week (offers.json rules).
// Each channel has its own opt-in. Wording is discreet and never names explicit content.
import config from '@/data/offers.json'
import rooms from '@/data/rooms.json'
import series from '@/data/series.json'
import { read, write } from '@/lib/growth'
import { visits } from '@/lib/lifecycle/stage'

export type Channel = 'push' | 'email'
type Sent = { channel: Channel; trigger: string; at: number }
export const optInKey = { push: 'tm_push_live', email: 'tm_email_optin' } as const
export const optedIn = (c: Channel) => read(optInKey[c], false)

export function send(channel: Channel, trigger: string, text: string) {
  if (!optedIn(channel)) return false
  const log = read<Sent[]>('tm_notify_log', []).filter((s) => Date.now() - s.at < 7 * 864e5)
  const window = channel === 'push' ? 864e5 : 7 * 864e5
  const cap = channel === 'push' ? config.rules.pushPerDay : config.rules.emailsPerWeek
  if (log.filter((s) => s.channel === channel && Date.now() - s.at < window).length >= cap) return false
  if (log.some((s) => s.trigger === trigger && Date.now() - s.at < 864e5)) return false
  write('tm_notify_log', [...log, { channel, trigger, at: Date.now() }])
  console.log(`[notify] ${channel}`, trigger, text)
  if (channel === 'push' && typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('TM', { body: text })
  return true
}

// Checked once per session. With no server, "while you were away" triggers fire on the next visit.
export function runTriggers() {
  try {
    if (sessionStorage.getItem('tm_triggers')) return
    sessionStorage.setItem('tm_triggers', '1')
  } catch {
    return
  }
  const following = read<string[]>('tm_following', [])
  const weekAgo = Date.now() - 7 * 864e5
  if (rooms.some((r) => r.isLive && following.includes(r.performerId))) send('push', 'followed_live', 'Someone you follow is online now.')
  const reminders = read<string[]>('tm_reminders', [])
  if (series.some((s) => reminders.includes(s.slug) && s.episodes.some((e) => Date.parse(e.releaseAt) > weekAgo && Date.parse(e.releaseAt) <= Date.now())))
    send('push', 'new_episode', 'A new episode is out in a series you follow.') || send('email', 'new_episode', 'A new episode is out in a series you follow.')
  if (visits().awayDays >= config.rules.winBackDays) send('email', 'win_back', 'It has been a while. Here is what is new since your last visit.')
  if (read<string[]>('tm_playlist_follows', []).length) send('email', 'playlist_updated', 'A playlist you follow has new videos.')
  if (visits().count >= 2) send('email', 'weekly_digest', 'Your weekly picks are ready.')
}
