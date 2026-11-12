// src/components/VideoPlayer.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { Crown, Lock, Maximize, Pause, PictureInPicture2, Play, RectangleHorizontal, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { setMini, useDrag } from '@/lib/mini'
import { noHistory, reducedMotion } from '@/lib/prefs'
import type { Video } from '@/lib/api'
import { duration } from '@/lib/format'
import { playerSource } from '@/lib/playerSource'
import { useAuth, usePaywall } from '@/context/Providers'
import { useAd } from '@/components/Ads'
import { trackImpression } from '@/lib/adEvents'
import { getProgress, saveProgress } from '@/lib/growth'
import { QUICK_SKIP } from '@/lib/reco/config'
import { record } from '@/lib/reco/events'

const ctl = 'grid size-11 place-items-center rounded hover:bg-white/10'
const menu = 'h-9 rounded bg-transparent px-1 text-xs'

export function VideoPlayer({ video, theatre, onTheatre }: { video: Video; theatre: boolean; onTheatre: () => void }) {
  const { user } = useAuth()
  const paywall = usePaywall()
  const preroll = useAd('preroll')
  const midroll = useAd('midroll')
  const wrap = useRef<HTMLDivElement>(null)
  const el = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [length, setLength] = useState(video.durationSec)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null)
  const [adDone, setAdDone] = useState(false)
  const savedAt = useRef(0)
  const view = useRef({ pct: 0, ended: false, since: 0 })
  const live = useRef({ playing: false, t: 0 })
  const slot = useRef<HTMLDivElement>(null)
  const drag = useDrag()
  const [away, setAway] = useState(false)
  const [glow, setGlow] = useState('')
  // Scene index: markers come from video.moments, placed by their share of the listed length.
  const moments = (video.moments ?? []).map((m) => ({ ...m, at: (m.t / video.durationSec) * length }))
  // Mini player on scroll: the same player shrinks into the corner while it is playing off screen.
  const floating = away && playing
  const [adLeft, setAdLeft] = useState(preroll?.skipAfterSec ?? 5)

  const lock = video.isPremium && !user?.isPremium ? 'premium' : video.ppvPrice && !paywall.unlocked.includes(video.id) ? 'ppv' : null
  const showAd = !lock && !!preroll && !adDone

  useEffect(() => {
    if (!showAd) return
    trackImpression('preroll')
    const id = setInterval(() => setAdLeft((n) => Math.max(0, n - 1)), 1000)
    return () => clearInterval(id)
  }, [showAd])

  // Resume from the saved point. Done in an effect because a cached file can finish loading
  // its metadata before React attaches the onLoadedMetadata handler.
  useEffect(() => {
    const v = el.current
    if (!v) return
    const resume = () => {
      setLength(v.duration)
      const t = getProgress()[video.id]?.t ?? 0
      if (t > 3 && t < v.duration * 0.95) v.currentTime = t
    }
    if (v.readyState >= 1) resume()
    else v.addEventListener('loadedmetadata', resume, { once: true })
    return () => v.removeEventListener('loadedmetadata', resume)
  }, [video.id, lock])

  // One reco event per view, sent when the viewer leaves: the share watched, or a quick skip.
  useEffect(() => {
    if (lock) return
    view.current = { pct: 0, ended: false, since: Date.now() }
    const flush = () => {
      const { pct, since } = view.current
      if (Date.now() - since < 1000) return
      view.current.since = Infinity
      if (pct < QUICK_SKIP) return record('skip', { video: video.id })
      record('watch', { video: video.id, value: Math.min(1, pct) })
      if (pct >= 0.95) record('complete', { video: video.id })
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
      // Leaving for another page while playing: hand over to the mini player in the layout.
      if (live.current.playing && !location.pathname.startsWith('/video/')) setMini({ video, t: live.current.t })
    }
  }, [video.id, lock])

  useEffect(() => {
    if (!slot.current) return
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting), { threshold: 0.2 })
    io.observe(slot.current)
    return () => io.disconnect()
  }, [])

  // Ambient glow: sample the current frame once a second. Falls back to the accent colour
  // when the frame is dark or cannot be read.
  useEffect(() => {
    if (lock) return
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const sample = () => {
      try {
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(el.current!, 0, 0, 1, 1)
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
        setGlow(r + g + b > 40 ? `${r} ${g} ${b}` : '')
      } catch {
        setGlow('')
      }
    }
    if (reducedMotion()) return
    const id = setInterval(() => live.current.playing && sample(), 1000)
    return () => clearInterval(id)
  }, [video.id, lock])

  const toggle = () => {
    const v = el.current
    if (!v || lock || showAd) return
    v.paused ? v.play().catch(() => setFailed(true)) : v.pause()
  }
  const seek = (t: number) => el.current && (el.current.currentTime = Math.min(Math.max(t, 0), length))
  const setVol = (n: number) => {
    const v = Math.min(Math.max(n, 0), 1)
    setVolume(v)
    if (el.current) el.current.volume = v
  }
  const mute = () => {
    setMuted(!muted)
    if (el.current) el.current.muted = !muted
  }
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen())?.catch(() => {})

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'SELECT') return
    const keys: Record<string, () => void> = {
      ' ': toggle,
      ArrowLeft: () => seek(time - 5),
      ArrowRight: () => seek(time + 5),
      ArrowUp: () => setVol(volume + 0.1),
      ArrowDown: () => setVol(volume - 0.1),
      f: fullscreen,
      m: mute,
    }
    const run = keys[e.key] ?? keys[e.key.toLowerCase()]
    if (!run) return
    e.preventDefault()
    run()
  }

  return (
    <div ref={slot} className="aspect-video w-full">
    <div
      ref={wrap}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label="Video player"
      {...(floating ? drag : {})}
      style={floating ? drag.style : { boxShadow: `0 0 90px 6px rgb(${glow || 'var(--accent)'} / 0.3)` }}
      className={`group overflow-hidden rounded-lg bg-black motion ${floating ? 'fixed bottom-20 right-3 z-40 aspect-video w-64 touch-none shadow-2xl md:bottom-4 md:w-80' : 'relative size-full'}`}
    >
      {!lock && (
        <video
          ref={el}
          src={playerSource(video)}
          poster={video.thumb}
          playsInline
          onClick={toggle}
          onPlay={() => {
            setPlaying(true)
            live.current.playing = true
            if (view.current.ended) record('replay', { video: video.id })
            view.current.ended = false
          }}
          onEnded={() => {
            view.current.ended = true
            window.dispatchEvent(new CustomEvent('tm:ended', { detail: video.id }))
          }}
          onPause={() => (setPlaying(false), (live.current.playing = false))}
          onTimeUpdate={(e) => {
            const { currentTime: t, duration: d } = e.currentTarget
            setTime(t)
            live.current.t = t
            if (d) view.current.pct = Math.max(view.current.pct, t / d)
            // Save a resume point every 3 seconds for the "Continue watching" row.
            if (Math.abs(t - savedAt.current) < 3) return
            savedAt.current = t
            if (!noHistory()) saveProgress(video.id, t, d)
          }}
          onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
          onError={() => setFailed(true)}
          className="size-full"
        />
      )}

      {lock && (
        <div className="absolute inset-0 grid place-items-center bg-cover bg-center" style={{ backgroundImage: `url(${video.thumb})` }}>
          <div className="absolute inset-0 backdrop-blur-xl" />
          <div className="relative grid justify-items-center gap-3 p-4 text-center">
            {lock === 'premium' ? <Crown className="text-accent" /> : <Lock className="text-amber-400" />}
            <p className="font-semibold">{lock === 'premium' ? 'Premium members only' : 'Pay-per-view video'}</p>
            {lock === 'premium' ? (
              <button onClick={paywall.openPremium} className="min-h-11 rounded-lg bg-accent px-5 font-semibold text-white">
                Go Premium
              </button>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => paywall.unlock(video.id, video.ppvPrice!)} className="min-h-11 rounded-lg bg-amber-400 px-5 font-semibold text-black">
                  Unlock for {video.ppvPrice} tokens
                </button>
                <button onClick={() => paywall.rent(video.id, Math.ceil(video.ppvPrice! / 2))} className="min-h-11 rounded-lg border border-amber-400 px-5 font-semibold">
                  Rent 48 hours for {Math.ceil(video.ppvPrice! / 2)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {failed && !lock && (
        <div className="absolute inset-0 grid place-items-center bg-surface text-sm text-muted">Video unavailable in demo</div>
      )}

      {showAd && (
        <div className="absolute inset-0 grid place-items-center bg-surface">
          <p className="text-sm text-muted">Ad · preroll · video</p>
          <button
            disabled={adLeft > 0}
            onClick={() => setAdDone(true)}
            className="absolute bottom-4 right-4 min-h-11 rounded-lg border border-line bg-ink px-4 text-sm disabled:text-muted"
          >
            {adLeft > 0 ? `Skip ad in ${adLeft}` : 'Skip ad'}
          </button>
        </div>
      )}

      {!lock && !showAd && !failed && (
        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 px-2 pt-6 transition-opacity ${playing ? 'opacity-0 focus-within:opacity-100 group-hover:opacity-100' : ''}`}>
          <div className="relative px-1">
            <input
              type="range"
              aria-label="Seek"
              min={0}
              max={length}
              step={0.1}
              value={time}
              onChange={(e) => seek(Number(e.target.value))}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - r.left
                setHover({ x, t: (x / r.width) * length })
              }}
              onMouseLeave={() => setHover(null)}
              className="h-4 w-full accent-accent"
            />
            {hover && (
              <span className="pointer-events-none absolute bottom-6 grid -translate-x-1/2 justify-items-center gap-1 rounded bg-black p-1 text-xs" style={{ left: hover.x }}>
                {/* Thumbnail preview while scrubbing. Real frames come from a sprite sheet per video. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={video.thumb} alt="" className="h-14 w-24 rounded object-cover" />
                <span>
                  {duration(Math.floor(hover.t))} {[...moments].reverse().find((m) => m.at <= hover.t)?.label}
                </span>
              </span>
            )}
            {moments.map((m) => (
              <button key={m.t} onClick={() => seek(m.at)} title={m.label} aria-label={`Jump to ${m.label}`} style={{ left: `${(m.at / length) * 100}%` }} className="absolute top-0 h-4 w-1.5 -translate-x-1/2 rounded bg-white/90" />
            ))}
            {midroll && <span title="Mid-roll ad" className="pointer-events-none absolute left-1/2 top-1 h-2 w-1 bg-amber-400" />}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className={ctl}>
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            {moments.length > 0 && (
              <>
                <button onClick={() => seek([...moments].reverse().find((m) => m.at < time - 1)?.at ?? 0)} aria-label="Previous scene" className={ctl}>
                  <SkipBack size={18} />
                </button>
                <button onClick={() => seek(moments.find((m) => m.at > time + 0.1)?.at ?? length)} aria-label="Next scene" className={ctl}>
                  <SkipForward size={18} />
                </button>
              </>
            )}
            <button onClick={mute} aria-label={muted ? 'Unmute' : 'Mute'} className={ctl}>
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input type="range" aria-label="Volume" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => setVol(Number(e.target.value))} className="hidden w-20 accent-accent sm:block" />
            <span className="px-2 text-xs tabular-nums">
              {duration(Math.floor(time))} / {duration(Math.floor(length))}
            </span>
            <span className="flex-1" />
            <select aria-label="Speed" defaultValue="1" onChange={(e) => el.current && (el.current.playbackRate = Number(e.target.value))} className={menu}>
              {[0.5, 1, 1.25, 1.5, 2].map((s) => (
                <option key={s} value={s} className="text-black">
                  {s}x
                </option>
              ))}
            </select>
            {/* Mock list. Real quality levels come from the streaming manifest. */}
            <select aria-label="Quality" className={menu}>
              {['Auto', ...(video.quality === '4K' ? ['2160p'] : []), '1080p', '720p', '480p'].map((q) => (
                <option key={q} className="text-black">
                  {q}
                </option>
              ))}
            </select>
            <button onClick={() => el.current?.requestPictureInPicture?.().catch(() => {})} aria-label="Picture in picture" className={`${ctl} hidden sm:grid`}>
              <PictureInPicture2 size={18} />
            </button>
            <button onClick={onTheatre} aria-label="Theatre mode" aria-pressed={theatre} className={`${ctl} hidden lg:grid`}>
              <RectangleHorizontal size={18} />
            </button>
            <button onClick={fullscreen} aria-label="Fullscreen" className={ctl}>
              <Maximize size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
