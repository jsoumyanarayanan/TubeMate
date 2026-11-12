// src/components/VideoCard.tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useEffect, useState } from 'react'
import { Crown, MoreVertical } from 'lucide-react'
import { record } from '@/lib/reco/events'
import { explain } from '@/lib/reco/rank'
import { useReco } from '@/lib/reco/useReco'
import { canAutoplay, isDiscreet } from '@/lib/prefs'
import type { Category, Performer, Video } from '@/lib/api'
import { compact, duration } from '@/lib/format'
import { NativeAd, useAd } from '@/components/Ads'

const frames = ['/placeholder/thumb.svg']
// next/image needs a path or a full URL. Anything else falls back to the placeholder.
export const thumbSrc = (src: string) => (/^(\/|https?:\/\/)/.test(src) ? src : frames[0])
const sizes = '(min-width: 1536px) 16vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw'
const badge = 'rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none'

// priority: set on cards above the fold so the first image is not lazy loaded.
// reason and discovery come from the recommendation engine when the card is part of a ranked feed.
export function VideoCard({ video, priority = false, reason, discovery }: { video: Video; priority?: boolean; reason?: string; discovery?: string }) {
  const personal = useReco().consent === 'yes'
  const [menu, setMenu] = useState(false)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (reason) record('impression', { video: video.id })
  }, [reason, video.id])
  // Hover or long-press plays a short muted preview. Off for reduced-motion and data-saver users,
  // and in discreet mode until the thumbnail has been revealed.
  const [previewing, setPreviewing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    if (!previewing) return
    const dwell = setTimeout(() => record('dwell', { video: video.id }), 2000)
    return () => clearTimeout(dwell)
  }, [previewing, video.id])

  const on = () => setPreviewing(canAutoplay() && (!isDiscreet() || revealed))
  const off = () => setPreviewing(false)
  // Opening a discovery card marks the events that follow with its discovery tag.
  const open = () => {
    try {
      sessionStorage.setItem('tm_reco_src', JSON.stringify(discovery ? { id: video.id, tag: discovery } : null))
    } catch {}
  }
  const feedback = (type: 'less' | 'not_interested') => {
    open()
    record(type, { video: video.id })
    setGone(true)
  }
  if (gone) return null

  return (
    <div className={`relative ${revealed ? 'revealed' : ''}`}>
    <Link
      href={`/video/${video.slug}`}
      className="group block"
      onClick={(e) => {
        // Discreet mode: the first tap only reveals the thumbnail.
        if (isDiscreet() && !revealed) return e.preventDefault(), setRevealed(true)
        open()
      }}
      onMouseEnter={on} onMouseLeave={off} onTouchStart={on} onTouchEnd={off} onFocus={on} onBlur={off}>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-surface">
        <Image src={thumbSrc(video.thumb)} alt="" width={320} height={180} sizes={sizes} priority={priority} className="thumb size-full object-cover" />
        {previewing && (
          <>
            {/* The demo previews the placeholder clip. Real previews use a short teaser file per video. */}
            <video src={video.src} muted autoPlay loop playsInline className="absolute inset-0 size-full object-cover" />
            <span className="preview-bar absolute bottom-0 left-0 h-0.5 bg-accent" />
          </>
        )}
        <span className={`${badge} absolute bottom-1.5 right-1.5 bg-black/80`}>{duration(video.durationSec)}</span>
        <span className={`${badge} absolute left-1.5 top-1.5 bg-black/80`}>{video.quality}</span>
        {video.isPremium && (
          <span className={`${badge} absolute right-1.5 top-1.5 flex items-center gap-1 bg-accent text-white`}>
            <Crown size={11} aria-hidden /> Premium
          </span>
        )}
        {video.ppvPrice && <span className={`${badge} absolute right-1.5 top-1.5 bg-amber-400 text-black`}>{video.ppvPrice} tokens</span>}
        {discovery && <span className={`${badge} absolute bottom-1.5 left-1.5 bg-white text-black`}>New for you</span>}
      </div>
      <h3 className={`mt-2 line-clamp-2 text-sm font-medium group-hover:text-accent ${personal ? 'pr-9' : ''}`}>{video.title}</h3>
      <p className="text-xs text-muted">
        {compact(video.views)} views · {video.ratingPct}%
      </p>
    </Link>
      {personal && (
        <>
          <button onClick={() => setMenu(!menu)} aria-label={`Why this video: ${video.title}`} aria-expanded={menu} className="absolute bottom-0 right-0 grid size-11 place-items-center text-muted hover:text-fg">
            <MoreVertical size={16} />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-full z-20 w-56 rounded-lg border border-line bg-surface p-1 text-xs shadow-lg">
              <p className="p-2 text-muted">Why this video: {reason ?? explain(video)}</p>
              <button role="menuitem" onClick={() => feedback('less')} className="min-h-11 w-full rounded px-2 text-left hover:bg-line">
                Show less like this
              </button>
              <button role="menuitem" onClick={() => feedback('not_interested')} className="min-h-11 w-full rounded px-2 text-left hover:bg-line">
                Not interested
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export const gridCols = 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'

export function VideoGrid({ videos, ads = true }: { videos: Video[]; ads?: boolean }) {
  const native = useAd('native')
  const every = native?.every ?? 8
  return (
    <div className={gridCols}>
      {videos.map((v, i) => (
        <Fragment key={v.id}>
          <VideoCard video={v} />
          {ads && native && (i + 1) % every === 0 && <NativeAd />}
        </Fragment>
      ))}
    </div>
  )
}

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/category/${category.slug}`} className="relative block aspect-video overflow-hidden rounded-lg bg-surface">
      <Image src={frames[0]} alt="" width={320} height={180} sizes={sizes} className="thumb size-full object-cover opacity-60" />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-2 text-sm font-semibold">{category.name}</span>
    </Link>
  )
}

export function PerformerCard({ performer }: { performer: Performer }) {
  return (
    <Link href={`/performer/${performer.slug}`} className="grid place-items-center gap-2 rounded-lg bg-surface p-4 text-center hover:bg-line">
      <Image src={thumbSrc(performer.avatar)} alt="" width={80} height={80} className="size-20 rounded-full" />
      <span className="text-sm font-medium">{performer.name}</span>
      <span className="text-xs text-muted">
        {compact(performer.followers)} followers · {performer.videoCount} videos
      </span>
    </Link>
  )
}
