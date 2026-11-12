// src/app/(site)/performer/[slug]/layout.tsx
// Server wrapper for the performer page: unique metadata and Person structured data.
import type { ReactNode } from 'react'
import { getPerformer } from '@/lib/api'
import { titleCase } from '@/lib/format'
import { JsonLd, pageMeta, personLd } from '@/lib/seo'

type Props = { params: { slug: string }; children: ReactNode }

export async function generateMetadata({ params }: Props) {
  const p = await getPerformer(params.slug)
  const name = p?.name ?? titleCase(params.slug)
  return pageMeta(`${name}: videos, live room and calls`, `${name} is a verified adult performer${p ? ` with ${p.videoCount} videos` : ''}. Follow, watch, join the fan club or book a call. 18+.`, `/performer/${params.slug}`)
}

export default async function PerformerLayout({ params, children }: Props) {
  const p = await getPerformer(params.slug)
  return (
    <>
      {p && <JsonLd data={personLd(p)} />}
      {children}
    </>
  )
}
