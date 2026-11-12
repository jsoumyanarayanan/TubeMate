// src/lib/db.ts
// Mock database. Base records come from /src/data. Changes made in the admin area are saved
// in the browser under tm_db_* keys and laid over the base records. A real API replaces this file.
import baseVideos from '@/data/videos.json'
import basePerformers from '@/data/performers.json'
import baseCategories from '@/data/categories.json'
import baseAds from '@/data/ads.json'

export type Video = {
  id: string; slug: string; title: string; src: string; thumb: string; durationSec: number; views: number; ratingPct: number
  uploadedAt: string; quality: string; isPremium: boolean; ppvPrice: number | null; categorySlug: string; tags: string[]
  performerIds: string[]; published?: boolean
  moments?: { t: number; label: string }[] // scene index: seconds from the start and a label
}
export type Performer = (typeof basePerformers)[number]
export type Category = { slug: string; name: string }
export type AdConfig = { id: string; size: string; page: string; enabled: boolean; every?: number; skipAfterSec?: number; frequencyCapMin?: number }
export type ModerationItem = { id: string; at: string; kind: 'report' | 'removal' | 'copyright' | 'abuse'; subject: string; detail: string; status: 'open' | 'resolved'; notes: string }

const base = { videos: baseVideos as Video[], performers: basePerformers as Performer[], categories: baseCategories as Category[], ads: baseAds as AdConfig[], moderation: [] as ModerationItem[] }
type Tables = typeof base

export function dbGet<K extends keyof Tables>(table: K): Tables[K] {
  if (typeof window === 'undefined') return base[table]
  try {
    const raw = localStorage.getItem(`tm_db_${table}`)
    return raw ? JSON.parse(raw) : base[table]
  } catch {
    return base[table]
  }
}
export function dbSet<K extends keyof Tables>(table: K, value: Tables[K]) {
  try {
    localStorage.setItem(`tm_db_${table}`, JSON.stringify(value))
  } catch {}
}
export function addModeration(item: Pick<ModerationItem, 'kind' | 'subject' | 'detail'>) {
  const id = `TM-${Date.now().toString(36).toUpperCase()}`
  dbSet('moderation', [{ ...item, id, at: new Date().toISOString(), status: 'open', notes: '' }, ...dbGet('moderation')])
  return id
}
