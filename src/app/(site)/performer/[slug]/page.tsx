// src/app/(site)/performer/[slug]/page.tsx
'use client'
import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { getPerformer } from '@/lib/api'
import { compact } from '@/lib/format'
import { useData } from '@/lib/store'
import { PerformerExtras } from '@/components/Extras'
import { FollowButton } from '@/components/FollowButton'
import { SkeletonGrid } from '@/components/Shell'
import { VideoBrowser } from '@/components/VideoBrowser'

export default function PerformerPage({ params }: { params: { slug: string } }) {
  const performer = useData(() => getPerformer(params.slug), params.slug)
  if (!performer) return <SkeletonGrid />
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={performer.avatar} alt="" className="size-20 rounded-full" />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1 text-lg font-semibold">
            {performer.name}
            {performer.isVerified && <BadgeCheck size={18} className="text-accent" aria-label="Verified" />}
          </h1>
          <p className="text-sm text-muted">
            {compact(performer.followers)} followers · {performer.videoCount} videos
          </p>
        </div>
        {performer.callsEnabled && (
          <Link href={`/calls/${performer.slug}`} className="grid min-h-11 place-items-center rounded-full border border-line px-5 text-sm">
            Call
          </Link>
        )}
        <FollowButton performerId={performer.id} />
      </div>
      <PerformerExtras performer={performer} />
      <VideoBrowser base={{ performer: performer.id }} />
    </>
  )
}
