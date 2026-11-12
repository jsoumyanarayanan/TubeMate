// src/app/video-sitemap.xml/route.ts
// Video sitemap built from the data files. One entry per published video.
import { liveVideos } from '@/lib/api'
import { abs, videoDescription } from '@/lib/seo'

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)

export function GET() {
  const urls = liveVideos()
    .map(
      (v) => `<url><loc>${esc(abs(`/video/${v.slug}`))}</loc><video:video>
<video:thumbnail_loc>${esc(abs(v.thumb))}</video:thumbnail_loc>
<video:title>${esc(v.title)}</video:title>
<video:description>${esc(videoDescription(v))}</video:description>
<video:player_loc>${esc(abs(`/embed/${v.slug}`))}</video:player_loc>
<video:duration>${v.durationSec}</video:duration>
<video:publication_date>${esc(v.uploadedAt)}</video:publication_date>
<video:family_friendly>no</video:family_friendly>
<video:requires_subscription>${v.isPremium || v.ppvPrice ? 'yes' : 'no'}</video:requires_subscription>
</video:video></url>`,
    )
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls}
</urlset>`
  return new Response(xml, { headers: { 'content-type': 'application/xml' } })
}
