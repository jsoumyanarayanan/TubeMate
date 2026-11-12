// src/components/Reco.tsx
// Personalisation UI: the consent prompt, the taste picker, the "For you" row and the feed settings.
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCategories, getFeed } from '@/lib/api'
import { titleCase } from '@/lib/format'
import { read } from '@/lib/growth'
import { deleteAll, isPaused, record, removeInterest, resetProfile, setConsent, setPaused } from '@/lib/reco/events'
import { getProfile } from '@/lib/reco/profile'
import type { Ranked } from '@/lib/reco/rank'
import { useReco } from '@/lib/reco/useReco'
import { useData } from '@/lib/store'
import { Modal } from '@/components/Modal'
import { VideoCard } from '@/components/VideoCard'

const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-40'
const plain = 'min-h-11 rounded-lg border border-line px-4 text-sm'

// Personalisation is off until the visitor says yes here. Then a skippable taste picker.
export function ConsentPrompt() {
  const reco = useReco()
  const [picking, setPicking] = useState(false)
  const [picks, setPicks] = useState<string[]>([])
  const categories = useData(getCategories) ?? []
  const done = () => {
    picks.forEach((category) => record('pick', { category }))
    setPicking(false)
  }
  if (picking)
    return (
      <Modal title="Pick 5 or more you like" onClose={() => setPicking(false)}>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c.slug} aria-pressed={picks.includes(c.slug)} onClick={() => setPicks((p) => (p.includes(c.slug) ? p.filter((x) => x !== c.slug) : [...p, c.slug]))} className={`min-h-11 rounded-full border px-4 text-sm ${picks.includes(c.slug) ? 'border-accent bg-accent text-white' : 'border-line'}`}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button disabled={picks.length < 5} onClick={done} className={primary}>
            Save ({picks.length} of 5)
          </button>
          <button onClick={() => setPicking(false)} className={plain}>
            Skip
          </button>
        </div>
      </Modal>
    )
  if (!reco.ready || reco.consent) return null
  return (
    <section aria-label="Personalise my feed" className="rounded-lg border border-line bg-surface p-4 text-sm">
      <h2 className="font-semibold">Personalise my feed?</h2>
      <p className="mt-1 text-muted">
        If you say yes, we use what you watch, like, search and follow to order videos for you. It stays on this device, and you can see it, pause it or delete it in{' '}
        <Link href="/account/feed" className="underline">
          feed settings
        </Link>
        . If you say no, you see trending and newest videos only.
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => (setConsent(true), setPicking(true))} className={primary}>
          Personalise my feed
        </button>
        <button onClick={() => setConsent(false)} className={plain}>
          No thanks
        </button>
      </div>
    </section>
  )
}

// Ranked feed that refreshes when the profile changes, without flashing a skeleton.
export function useFeed(count: number) {
  const reco = useReco()
  const [feed, setFeed] = useState<Ranked[] | null>(null)
  useEffect(() => {
    let stale = false
    if (reco.ready) getFeed().then((f) => !stale && setFeed(f.slice(0, count)))
    return () => {
      stale = true
    }
  }, [reco.version, reco.ready, count])
  return { feed, personal: reco.consent === 'yes' }
}

export function ForYouRow({ scroller, tile }: { scroller: string; tile: string }) {
  const { feed, personal } = useFeed(10)
  if (!personal) return null
  return (
    <section aria-labelledby="row-foryou">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="row-foryou" className="text-lg font-semibold">
          For you
        </h2>
        <Link href="/account/feed" className="flex min-h-11 items-center text-sm text-accent">
          Feed settings
        </Link>
      </div>
      <div className={scroller}>
        {/* Placeholder tiles hold the row's height while the feed loads */}
        {!feed && Array.from({ length: 6 }, (_, i) => <div key={i} className={`${tile} mb-11 aspect-video animate-pulse rounded-lg bg-surface`} />)}
        {feed?.map((r) => (
          <div key={r.video.id} className={tile}>
            <VideoCard video={r.video} reason={r.reason} discovery={r.discovery} />
          </div>
        ))}
      </div>
    </section>
  )
}

// /account/feed. Works for guests too, because a guest profile lives on this device.
export function FeedSettings() {
  const reco = useReco()
  const [confirm, setConfirm] = useState(false)
  if (!reco.ready) return null
  const on = reco.consent === 'yes'
  const profile = getProfile()
  const groups = [['Tags', 'tag:'], ['Categories', 'cat:'], ['Performers', 'perf:']] as const
  const performers = read<{ id: string; name: string }[]>('tm_db_performers', [])
  const label = (prefix: string, id: string) => (prefix === 'perf:' ? performers.find((p) => p.id === id)?.name ?? `Performer ${id.slice(1)}` : titleCase(id))
  return (
    <div className="mx-auto grid max-w-xl gap-4 text-sm">
      <h1 className="text-lg font-semibold">Feed settings</h1>
      <div className="rounded-lg bg-surface p-4">
        <p className="font-medium">Personalise my feed: {on ? 'on' : 'off'}</p>
        <p className="mt-1 text-muted">
          {on ? 'Your viewing interests are kept on this device only and used to order videos for you.' : 'Nothing about what you watch is stored. You see trending and newest videos only.'}
        </p>
        <button onClick={() => setConsent(!on)} className={`${on ? plain : primary} mt-3`}>
          {on ? 'Turn off and erase my profile' : 'Personalise my feed'}
        </button>
      </div>
      {on && (
        <>
          <div className="rounded-lg bg-surface p-4">
            <p className="font-medium">Your top interests</p>
            {profile.count === 0 && <p className="mt-1 text-muted">Nothing yet. Watch, like or follow and your interests appear here.</p>}
            {groups.map(([name, prefix]) => {
              const top = profile.top(prefix)
              return top.length ? (
                <div key={prefix} className="mt-3">
                  <p className="text-xs text-muted">{name}</p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {top.map((id) => (
                      <li key={id} className="flex items-center rounded-full border border-line pl-3">
                        {label(prefix, id)}
                        <button onClick={() => removeInterest(prefix + id)} aria-label={`Remove ${label(prefix, id)}`} className="grid size-11 place-items-center text-muted">
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPaused(!isPaused())} aria-pressed={isPaused()} className={plain}>
              {isPaused() ? 'Resume history' : 'Pause history'}
            </button>
            <button onClick={resetProfile} className={plain}>
              Reset my feed
            </button>
            <button onClick={() => setConfirm(true)} className={`${plain} text-accent`}>
              Delete all data
            </button>
          </div>
          <p className="text-xs text-muted">{profile.count} events stored on this device. Pausing keeps your profile but stops adding to it. Resetting forgets what was learned. Deleting also turns personalisation off.</p>
        </>
      )}
      {confirm && (
        <Modal title="Delete all feed data?" onClose={() => setConfirm(false)}>
          <p className="text-sm text-muted">This erases your interest profile and event history from this device and turns personalisation off.</p>
          <button onClick={() => (deleteAll(), setConfirm(false))} className={`${primary} mt-4`}>
            Delete all data
          </button>
        </Modal>
      )}
    </div>
  )
}
