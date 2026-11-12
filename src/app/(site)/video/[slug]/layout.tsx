// src/app/(site)/video/[slug]/layout.tsx
// Server wrapper for the watch page: unique metadata and VideoObject structured data.
import type { ReactNode } from 'react'
import { getPerformers, getVideo } from '@/lib/api'
import { titleCase } from '@/lib/format'
import { JsonLd, pageMeta, videoDescription, videoLd } from '@/lib/seo'

type Props = { params: { slug: string }; children: ReactNode }

export async function generateMetadata({ params }: Props) {
  const video = await getVideo(params.slug)
  return pageMeta(video?.title ?? titleCase(params.slug), video ? videoDescription(video) : 'Adults only (18+).', `/video/${params.slug}`)
}

export default async function VideoLayout({ params, children }: Props) {
  const video = await getVideo(params.slug)
  const performers = (await getPerformers()).filter((p) => video?.performerIds.includes(p.id))
  return (
    <>
      {video && <JsonLd data={videoLd(video, performers)} />}
      {children}
    </>
  )
}
