// src/components/Feed.tsx
// For You feed: full-height vertical swipe cards. Each card plays a muted teaser of a full
// video (the placeholder clip in the demo) and leads to the full video. Order comes from the
// recommendation engine. Swipe up for the next card, swipe left to open the performer.
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Bookmark, Heart, Share2 } from 'lucide-react'
import { track } from '@/lib/analytics'
import { dbGet } from '@/lib/db'
import { refCode } from '@/lib/growth'
import { canAutoplay } from '@/lib/prefs'
import { record } from '@/lib/reco/events'
import type { Ranked } from '@/lib/reco/rank'
import { useMood } from '@/lib/reco/useReco'
import { toggle, useStored } from '@/lib/store'
import { useAuth } from '@/context/Providers'
import { FollowButton } from '@/components/FollowButton'
import { useFeed } from '@/components/Reco'

const TEASER_SEC = 30
const side = 'grid size-12 place-items-center rounded-full bg-black/50'

function FeedCard({ item, active, near }: { item: Ranked; active: boolean; near: boolean }) {
  const { video } = item
  const { user } = useAuth()
  const router = useRouter()
  const el = useRef<HTMLVideoElement>(null)
  const touch = useRef({ x: 0, y: 0 })
  const [likes, setLikes] = useStored<Record<string, 'up' | 'down'>>('tm_votes', {})
  const [saved, setSaved] = useStored<string[]>('tm_favourites', [])
  const [note, setNote] = useState('')
  const performer = dbGet('performers').find((p) => p.id === video.performerIds[0])
  const liked = likes[video.id] === 'up'

  // Only the card on screen plays. Reduced-motion and data-saver users get a still poster.
  useEffect(() => {
    const v = el.current
    if (!v) return
    if (active && canAutoplay()) v.play().catch(() => {})
    else v.pause()
  }, [active, near])

  const like = () => {
    if (!liked) record('like', { video: video.id })
    setLikes((all) => ({ ...all, [video.id]: 'up' }))
  }
  const share = () => {
    track('share', { video: video.id, kind: 'feed' })
    record('share', { video: video.id })
    navigator.clipboard?.writeText(`${location.origin}/s/${video.slug}${user ? `?ref=${refCode(user.name)}` : ''}`).then(() => setNote('Link copied'), () => setNote('Copy failed'))
  }
  return (
    <article
      aria-label={video.title}
      onDoubleClick={like}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touch.current.x
        const dy = e.changedTouches[0].clientY - touch.current.y
        if (dx < -70 && Math.abs(dy) < 50 && performer) router.push(`/performer/${performer.slug}`)
      }}
      // The poster is the card's background, so a card is never blank while its teaser loads.
      style={{ backgroundImage: `url(${video.thumb})` }}
      className="relative h-full snap-start snap-always overflow-hidden bg-surface bg-cover bg-center"
    >
      {/* Teasers are mounted for the current card and the next two, so the next swipe is ready. */}
      {near && (
        <video ref={el} src={video.src} muted loop playsInline preload="auto" onTimeUpdate={(e) => e.currentTarget.currentTime > TEASER_SEC && (e.currentTarget.currentTime = 0)} className="absolute inset-0 size-full object-cover" />
      )}
      {/* Thumb-first: every action sits in the lower third, within reach of one hand. */}
      <div className="absolute inset-x-0 bottom-0 grid gap-3 bg-gradient-to-t from-black/90 p-4 pt-16">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 font-semibold">{video.title}</h2>
            <p className="text-xs text-muted">{item.discovery ? 'New for you' : item.reason}</p>
            {performer && (
              <div className="mt-2 flex items-center gap-2">
                <Link href={`/performer/${performer.slug}`} className="flex min-h-11 items-center gap-2 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={performer.avatar} alt="" className="size-8 rounded-full" /> {performer.name}
                </Link>
                <FollowButton performerId={performer.id} />
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <button onClick={like} aria-label="Like" aria-pressed={liked} className={`${side} ${liked ? 'text-accent' : ''}`}>
              <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => setSaved((s) => toggle(s, video.id))} aria-label="Save" aria-pressed={saved.includes(video.id)} className={`${side} ${saved.includes(video.id) ? 'text-accent' : ''}`}>
              <Bookmark size={22} fill={saved.includes(video.id) ? 'currentColor' : 'none'} />
            </button>
            <button onClick={share} aria-label="Share" className={side}>
              <Share2 size={22} />
            </button>
          </div>
        </div>
        {note && (
          <p role="status" className="text-xs">
            {note}
          </p>
        )}
        <Link href={`/video/${video.slug}`} className="grid min-h-12 place-items-center rounded-lg bg-accent font-semibold text-white">
          Watch full video
        </Link>
      </div>
    </article>
  )
}

export function Feed() {
  const { feed } = useFeed(40)
  const mood = useMood()
  const box = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  // A mood filters the feed to its tags. The engine has already put the best matches first.
  const items = feed && (mood ? feed.filter((r) => r.video.tags.some((t) => mood.tags.includes(t))) : feed)
  useEffect(() => {
    box.current?.scrollTo({ top: 0 })
    setActive(0)
  }, [mood?.id])
  return (
    <div
      ref={box}
      aria-label="For You feed"
      onScroll={(e) => setActive(Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight))}
      className="fixed inset-x-0 bottom-14 top-[61px] z-[35] snap-y snap-mandatory overflow-y-auto overscroll-contain bg-ink md:static md:z-auto md:mx-auto md:h-[calc(100vh-150px)] md:max-w-md md:rounded-lg"
    >
      {!items && <div className="h-full animate-pulse bg-surface" />}
      {items?.length === 0 && <p className="grid h-full place-items-center p-6 text-center text-sm text-muted">Nothing matches this mood yet. Pick another mood in the menu.</p>}
      {items?.map((r, i) => <FeedCard key={r.video.id} item={r} active={i === active} near={i >= active - 1 && i <= active + 2} />)}
    </div>
  )
}
