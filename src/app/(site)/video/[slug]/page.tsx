// src/app/(site)/video/[slug]/page.tsx
'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getPerformers, getRelated, getVideo, getVideos } from '@/lib/api'
import { useData } from '@/lib/store'
import { SkeletonGrid } from '@/components/Shell'

// The player and comments load only on this page, after the video record is known.
const Watch = dynamic(() => import('@/components/Watch').then((m) => m.Watch), { loading: () => <SkeletonGrid count={4} /> })

export default function VideoPage({ params }: { params: { slug: string } }) {
  const data = useData(async () => {
    const video = await getVideo(params.slug)
    if (!video) return { video: null }
    const [performers, related, more] = await Promise.all([getPerformers(), getRelated(video), getVideos({ performer: video.performerIds[0], pageSize: 5 })])
    return { video, performers: performers.filter((p) => video.performerIds.includes(p.id)), related, more: more.items.filter((v) => v.id !== video.id).slice(0, 4) }
  }, params.slug)

  if (!data) return <SkeletonGrid count={4} />
  if (!data.video)
    return (
      <div className="grid place-items-center gap-3 py-24 text-center">
        <h1 className="text-xl font-semibold">Video not found</h1>
        <Link href="/" className="grid min-h-11 place-items-center rounded-lg bg-accent px-4 font-semibold text-white">
          Back to home
        </Link>
      </div>
    )
  return <Watch key={data.video.id} video={data.video} performers={data.performers!} related={data.related!} more={data.more!} />
}
