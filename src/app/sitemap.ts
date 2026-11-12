// src/app/sitemap.ts
// Built from the data files. Lists every published video, category, tag and performer page.
import type { MetadataRoute } from 'next'
import { liveVideos } from '@/lib/api'
import { dbGet } from '@/lib/db'
import { abs } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const videos = liveVideos()
  const tags = [...new Set(videos.flatMap((v) => v.tags))]
  return [
    ...['/', '/categories', '/performers', '/trending', '/new', '/top-rated', '/live', '/calls', '/ai', '/premium'].map((p) => ({ url: abs(p) })),
    ...dbGet('categories').map((c) => ({ url: abs(`/category/${c.slug}`) })),
    ...tags.map((t) => ({ url: abs(`/tags/${t}`) })),
    ...dbGet('performers').map((p) => ({ url: abs(`/performer/${p.slug}`) })),
    ...videos.map((v) => ({ url: abs(`/video/${v.slug}`), lastModified: v.uploadedAt })),
  ]
}
