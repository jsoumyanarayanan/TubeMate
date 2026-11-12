// src/lib/seo.tsx
// Page metadata and JSON-LD builders. Set NEXT_PUBLIC_SITE_URL to the live domain before launch.
import type { Metadata } from 'next'
import type { Performer, Video } from '@/lib/api'
import { locales, localePath } from '@/lib/i18n'
import { duration, titleCase } from '@/lib/format'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
export const abs = (path: string) => (/^https?:/.test(path) ? path : SITE_URL + path)

// Unique title and description, canonical URL and hreflang links for one page.
export function pageMeta(title: string, description: string, path: string): Metadata {
  const languages = { ...Object.fromEntries(locales.map((l) => [l, localePath(l, path)])), 'x-default': path }
  return { title, description, alternates: { canonical: path, languages }, openGraph: { title, description, url: path, siteName: 'TUBEMATE' } }
}

export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

export const videoDescription = (v: Video) =>
  `Watch ${v.title} in ${v.quality}, ${duration(v.durationSec)} long, in ${titleCase(v.categorySlug)}. Adults only (18+).`

export const videoLd = (v: Video, performers: Performer[]) => ({
  '@type': 'VideoObject',
  name: v.title,
  description: videoDescription(v),
  thumbnailUrl: abs(v.thumb),
  uploadDate: v.uploadedAt,
  duration: `PT${v.durationSec}S`,
  embedUrl: abs(`/embed/${v.slug}`),
  isFamilyFriendly: false,
  requiresSubscription: v.isPremium || !!v.ppvPrice,
  interactionStatistic: { '@type': 'InteractionCounter', interactionType: { '@type': 'WatchAction' }, userInteractionCount: v.views },
  actor: performers.map((p) => ({ '@type': 'Person', name: p.name, url: abs(`/performer/${p.slug}`) })),
})

export const personLd = (p: Performer) => ({ '@type': 'Person', name: p.name, url: abs(`/performer/${p.slug}`), image: abs(p.avatar) })

export const breadcrumbLd = (trail: [name: string, path: string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
})
