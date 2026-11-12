// src/lib/mood.ts
// Mood modes. The mapping of moods to tags, accent colour and motion speed is in /src/data/moods.json.
// The choice is remembered for the session only.
import moods from '@/data/moods.json'

export type Mood = (typeof moods)[number]
export { moods }

export function activeMood(): Mood | null {
  if (typeof window === 'undefined') return null
  try {
    return moods.find((m) => m.id === sessionStorage.getItem('tm_mood')) ?? null
  } catch {
    return null
  }
}
// Sets the accent colour and animation speed for the active mood.
export function applyMood() {
  const mood = activeMood()
  const style = document.documentElement.style
  if (mood) {
    style.setProperty('--accent', mood.accent)
    style.setProperty('--speed', mood.speed)
  } else {
    style.removeProperty('--accent')
    style.removeProperty('--speed')
  }
}
export function setMood(id: string | null) {
  try {
    id ? sessionStorage.setItem('tm_mood', id) : sessionStorage.removeItem('tm_mood')
  } catch {}
  applyMood()
  // Every feed listens for this and re-ranks at once.
  window.dispatchEvent(new Event('tm:reco'))
}
