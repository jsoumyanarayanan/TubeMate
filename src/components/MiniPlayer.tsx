// src/components/MiniPlayer.tsx
// Corner player that takes over when the viewer leaves a watch page while a video is playing.
// It lives in the site layout, so it keeps playing across page changes. Drag it to move it.
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Maximize2, X } from 'lucide-react'
import { saveProgress } from '@/lib/growth'
import { setMini, useDrag, useMini } from '@/lib/mini'
import { playerSource } from '@/lib/playerSource'
import { noHistory } from '@/lib/prefs'

export function MiniPlayer() {
  const mini = useMini()
  const path = usePathname()
  const drag = useDrag()
  const el = useRef<HTMLVideoElement>(null)
  const onWatch = path.startsWith('/video/')
  useEffect(() => {
    if (onWatch) setMini(null)
  }, [onWatch])
  useEffect(() => {
    const v = el.current
    if (!v || !mini) return
    const start = () => {
      v.currentTime = mini.t
      v.play().catch(() => {})
    }
    if (v.readyState >= 1) start()
    else v.addEventListener('loadedmetadata', start, { once: true })
    return () => v.removeEventListener('loadedmetadata', start)
  }, [mini])
  if (!mini || onWatch) return null
  const keep = () => el.current && !noHistory() && saveProgress(mini.video.id, el.current.currentTime, el.current.duration)
  return (
    <div {...drag} role="region" aria-label="Mini player" className="fixed bottom-20 right-3 z-40 w-64 cursor-grab touch-none overflow-hidden rounded-lg border border-line bg-black shadow-2xl md:bottom-4 md:w-80">
      <video ref={el} src={playerSource(mini.video)} playsInline onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())} onEnded={() => setMini(null)} className="aspect-video w-full" />
      <div className="flex items-center bg-surface text-xs">
        <Link href={`/video/${mini.video.slug}`} onClick={keep} aria-label="Back to the video page" className="grid size-11 shrink-0 place-items-center">
          <Maximize2 size={16} />
        </Link>
        <span className="min-w-0 flex-1 truncate">{mini.video.title}</span>
        <button onClick={() => setMini(null)} aria-label="Close mini player" className="grid size-11 shrink-0 place-items-center">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
