// src/components/EmbedPlayer.tsx
// Player for other sites to embed. Always shows a watermark that links back here.
// Premium and pay-per-view videos do not play in embeds.
'use client'
import { useState } from 'react'
import { getVideo } from '@/lib/api'
import { playerSource } from '@/lib/playerSource'
import { useData } from '@/lib/store'

export function EmbedPlayer({ slug }: { slug: string }) {
  const data = useData(async () => ({ video: await getVideo(slug) }), slug)
  const [failed, setFailed] = useState(false)
  const video = data?.video
  const locked = !video || video.isPremium || !!video.ppvPrice
  const href = `/video/${slug}`
  return (
    <div className="relative grid h-screen place-items-center bg-black">
      {data && !locked && !failed && (
        <video src={playerSource(video)} poster={video.thumb} controls playsInline controlsList="nodownload" onError={() => setFailed(true)} className="size-full" />
      )}
      {data && (locked || failed) && (
        <a href={href} target="_blank" rel="noopener" className="grid min-h-11 place-items-center rounded-lg bg-accent px-5 font-semibold text-white">
          {failed ? 'Video unavailable in demo. Open on TUBEMATE' : 'Watch on TUBEMATE'}
        </a>
      )}
      <a href={href} target="_blank" rel="noopener" className="absolute right-3 top-3 rounded bg-black/60 px-2 py-1 text-sm font-bold text-accent">
        TUBEMATE
      </a>
    </div>
  )
}
