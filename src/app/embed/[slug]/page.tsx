// src/app/embed/[slug]/page.tsx
// Embed player page for iframes. Age-gated like the rest of the site and kept out of search results.
import type { Metadata } from 'next'
import { AgeGate } from '@/components/AgeGate'
import { EmbedPlayer } from '@/components/EmbedPlayer'

export const metadata: Metadata = { title: 'Video player', robots: { index: false } }

export default function EmbedPage({ params }: { params: { slug: string } }) {
  return (
    <AgeGate>
      <EmbedPlayer slug={params.slug} />
    </AgeGate>
  )
}
