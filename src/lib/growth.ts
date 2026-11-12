// src/lib/growth.ts
// Small browser-storage helpers for share links, prompt caps and resume points.
export const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
export const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// The member's referral code, added to share links and read back from ?ref= at sign-up.
export const refCode = (name: string) => name.replace(/\W/g, '').toUpperCase().slice(0, 8) || 'MEMBER'

// Prompt cap: true at most once every 24 hours per name.
export function oncePerDay(name: string) {
  const key = `tm_prompt_${name}`
  if (Date.now() - read(key, 0) < 864e5) return false
  write(key, Date.now())
  return true
}

export const count = (key: string) => read(key, 0)
export const bump = (key: string, to?: number) => {
  const n = to ?? read(key, 0) + 1
  write(key, n)
  return n
}

// Resume points for "Continue watching": video id to seconds watched and length.
export type Progress = Record<string, { t: number; d: number }>
export const getProgress = () => read<Progress>('tm_progress', {})
export const saveProgress = (id: string, t: number, d: number) => write('tm_progress', { ...getProgress(), [id]: { t, d } })
