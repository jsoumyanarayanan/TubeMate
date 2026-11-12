// src/components/Watch.tsx
// Everything on the watch page around the player: actions, details, related videos, comments and modals.
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Download, Flag, Heart, ListPlus, Share2, ThumbsDown, ThumbsUp, Users } from 'lucide-react'
import { getAlsoWatched, type Performer, type Video } from '@/lib/api'
import { track } from '@/lib/analytics'
import { read, refCode } from '@/lib/growth'
import { record } from '@/lib/reco/events'
import { onEpisodeEnd, onWatch } from '@/lib/lifecycle/signals'
import { noHistory } from '@/lib/prefs'
import { compact, titleCase } from '@/lib/format'
import { toggle, useData, useStored, type Playlist } from '@/lib/store'
import { addModeration } from '@/lib/db'
import bundles from '@/data/bundles.json'
import { useAuth, usePaywall } from '@/context/Providers'
import { AdSlot } from '@/components/Ads'
import { Modal } from '@/components/Modal'
import { VideoCard } from '@/components/VideoCard'
import { VideoPlayer } from '@/components/VideoPlayer'

const action = 'flex min-h-11 items-center gap-1.5 rounded-full border border-line px-3 text-sm hover:border-accent'
const chip = 'grid min-h-9 place-items-center rounded-full bg-surface px-3 text-sm hover:bg-line'
const reasons = ['Wrong category or tags', 'Spam or misleading', 'Playback problem', 'Illegal or abusive content']

type Comment = { id: number; name: string; text: string; likes: number; at: number; mine?: boolean; reported?: boolean }
const seed = (n: number): Comment[] =>
  Array.from({ length: 6 }, (_, i) => ({ id: i, name: `Member ${((n + i * 7) % 90) + 10}`, text: `Demo comment ${i + 1}`, likes: ((n + i) * 13) % 40, at: i }))

export function Watch({ video, performers, related, more }: { video: Video; performers: Performer[]; related: Video[]; more: Video[] }) {
  const { user, openLogin } = useAuth()
  const paywall = usePaywall()
  const [theatre, setTheatre] = useState(false)
  const [favourites, setFavourites] = useStored<string[]>('tm_favourites', [])
  const [playlists, setPlaylists] = useStored<Playlist[]>('tm_playlists', [])
  const [, setHistory] = useStored<string[]>('tm_history', [])
  const [votes, setVotes] = useStored<Record<string, 'up' | 'down'>>('tm_votes', {})
  const [modal, setModal] = useState<'share' | 'report' | null>(null)
  const [notice, setNotice] = useState('')
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState(() => seed(Number(video.id.slice(1))))
  const [sort, setSort] = useState<'newest' | 'top'>('newest')

  // Record watch history, most recent first.
  useEffect(() => {
    if (!noHistory()) setHistory((h) => [video.id, ...h.filter((id) => id !== video.id)].slice(0, 100))
    record('click', { video: video.id })
  }, [video.id, setHistory])

  // Offer signals: counts per performer, category and tag, premium locks, and series episodes at the end.
  useEffect(() => {
    onWatch(video, { following: read<string[]>('tm_following', []), premium: !!user?.isPremium })
    const ended = (e: Event) => (e as CustomEvent<string>).detail === video.id && onEpisodeEnd(video.id)
    window.addEventListener('tm:ended', ended)
    return () => window.removeEventListener('tm:ended', ended)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id])

  const vote = votes[video.id]
  const setVote = (v: 'up' | 'down') =>
    setVotes((all) => {
      const { [video.id]: current, ...rest } = all
      if (current !== v) record(v === 'up' ? 'like' : 'dislike', { video: video.id })
      return current === v ? rest : { ...rest, [video.id]: v }
    })
  const saved = playlists.some((p) => p.videoIds.includes(video.id))
  const save = () => {
    if (!saved) record('playlist', { video: video.id })
    setPlaylists((all) => {
      const list = all[0] ?? { id: crypto.randomUUID(), name: 'Saved', videoIds: [] }
      return [{ ...list, videoIds: toggle(list.videoIds, video.id) }, ...all.slice(1)]
    })
  }
  const also = useData(() => getAlsoWatched(video), video.id)
  // Share links point at the safe-for-work page and carry the member's referral code.
  const origin = typeof location === 'undefined' ? '' : location.origin
  const url = `${origin}/s/${video.slug}${user ? `?ref=${refCode(user.name)}` : ''}`
  const embed = `<iframe src="${origin}/embed/${video.slug}" width="640" height="360" allowfullscreen></iframe>`
  const copy = (text: string, kind: string) => {
    track('share', { video: video.id, kind })
    record('share', { video: video.id })
    navigator.clipboard?.writeText(text).then(() => setNotice('Copied'), () => setNotice('Copy failed'))
  }

  const shown = [...comments].sort((a, b) => (sort === 'top' ? b.likes - a.likes : b.at - a.at))
  const patch = (id: number, change: Partial<Comment>) => setComments((cs) => cs.map((c) => (c.id === id ? { ...c, ...change } : c)))

  return (
    <div className={`grid gap-6 ${theatre ? '' : 'lg:grid-cols-[minmax(0,1fr)_320px]'}`}>
      <div className="min-w-0">
        {/* Theatre mode dims the rest of the page. Click the dimmed area to leave it. */}
        {theatre && <div onClick={() => setTheatre(false)} className="fixed inset-0 z-40 bg-black/80" />}
        <div className={theatre ? 'relative z-50' : ''}>
          <VideoPlayer video={video} theatre={theatre} onTheatre={() => setTheatre(!theatre)} />
        </div>
        <AdSlot id="under-player" className="mt-3" />

        <h1 className="mt-3 text-lg font-semibold">{video.title}</h1>
        <p className="text-sm text-muted">
          {compact(video.views)} views · {video.uploadedAt}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setVote('up')} aria-pressed={vote === 'up'} className={`${action} ${vote === 'up' ? 'border-accent text-accent' : ''}`}>
            <ThumbsUp size={16} /> {video.ratingPct}%
          </button>
          <button onClick={() => setVote('down')} aria-pressed={vote === 'down'} aria-label="Dislike" className={`${action} ${vote === 'down' ? 'border-accent text-accent' : ''}`}>
            <ThumbsDown size={16} />
          </button>
          <button onClick={() => (favourites.includes(video.id) || record('favourite', { video: video.id }), setFavourites((f) => toggle(f, video.id)))} aria-pressed={favourites.includes(video.id)} className={`${action} ${favourites.includes(video.id) ? 'border-accent text-accent' : ''}`}>
            <Heart size={16} /> Favourite
          </button>
          <button onClick={save} aria-pressed={saved} className={`${action} ${saved ? 'border-accent text-accent' : ''}`}>
            <ListPlus size={16} /> {saved ? 'Saved' : 'Add to playlist'}
          </button>
          <button onClick={() => setModal('share')} className={action}>
            <Share2 size={16} /> Share
          </button>
          <button onClick={() => paywall.require({ premium: true }) && setNotice('Download starts here once real files are linked')} className={action}>
            <Download size={16} /> Download
          </button>
          <Link href={`/together?v=${video.slug}`} className={action}>
            <Users size={16} /> Watch together
          </Link>
          <button onClick={() => setModal('report')} className={action}>
            <Flag size={16} /> Report
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded bg-line" aria-hidden>
          <div className="h-full bg-accent" style={{ width: `${video.ratingPct}%` }} />
        </div>
        {notice && (
          <p role="status" className="mt-2 text-sm text-muted">
            {notice}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {performers.map((p) => (
            <Link key={p.id} href={`/performer/${p.slug}`} className={`${chip} gap-2 !grid-flow-col`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatar} alt="" className="size-6 rounded-full" /> {p.name}
            </Link>
          ))}
          <Link href={`/category/${video.categorySlug}`} className={chip}>
            {titleCase(video.categorySlug)}
          </Link>
          {video.tags.map((t) => (
            <Link key={t} href={`/tags/${t}`} className={chip}>
              #{t}
            </Link>
          ))}
        </div>

        {bundles.filter((b) => b.videoIds.includes(video.id)).map((b) => (
          <Link key={b.id} href={`/bundles/${b.id}`} className="mt-4 flex min-h-11 items-center justify-between rounded-lg border border-amber-400/50 px-3 text-sm">
            <span>In this bundle: {b.name}</span>
            <span className="text-amber-400">{b.videoIds.length} videos for {b.tokens} tokens</span>
          </Link>
        ))}

        <div className="mt-4 rounded-lg bg-surface p-3 text-sm">
          <p className={open ? '' : 'line-clamp-2'}>
            Demo description for {video.title}. This text is a placeholder. The real description, scene list and credits come from the video record once the library is linked in the admin area.
          </p>
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 min-h-11 text-accent">
            {open ? 'Show less' : 'Show more'}
          </button>
        </div>

        {also && also.length > 0 && (
          <section aria-labelledby="also" className="mt-6">
            <h2 id="also" className="mb-2 text-lg font-semibold">
              People also watched
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {also.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="comments" className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="comments" className="text-lg font-semibold">
              {comments.length} comments
            </h2>
            <select aria-label="Sort comments" value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'top')} className="min-h-11 rounded-lg border border-line bg-surface px-3 text-sm">
              <option value="newest">Newest</option>
              <option value="top">Top</option>
            </select>
          </div>
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!user) return openLogin()
              const input = e.currentTarget.elements.namedItem('text') as HTMLInputElement
              if (!input.value.trim()) return
              setComments((cs) => [...cs, { id: Date.now(), name: user.name, text: input.value.trim(), likes: 0, at: Date.now(), mine: true }])
              input.value = ''
            }}
          >
            <input id="comment-box" name="text" placeholder={user ? 'Add a comment' : 'Log in to comment'} aria-label="Comment" className="min-h-11 flex-1 rounded-lg border border-line bg-surface px-3" />
            <button className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">Post</button>
          </form>
          <ul className="grid gap-3">
            {shown.map((c) => (
              <li key={c.id} className="rounded-lg bg-surface p-3 text-sm">
                <p className="font-medium">{c.name}</p>
                <p className="text-muted">{c.reported ? 'Reported. Hidden until reviewed.' : c.text}</p>
                <div className="mt-1 flex gap-1 text-xs text-muted">
                  <button onClick={() => patch(c.id, { likes: c.likes + 1 })} className="flex min-h-11 items-center gap-1 px-2">
                    <ThumbsUp size={14} /> {c.likes}
                  </button>
                  <button
                    onClick={() => {
                      const box = document.getElementById('comment-box') as HTMLInputElement
                      box.value = `@${c.name} `
                      box.focus()
                    }}
                    className="min-h-11 px-2"
                  >
                    Reply
                  </button>
                  {!c.mine && !c.reported && (
                    <button onClick={() => patch(c.id, { reported: true })} className="min-h-11 px-2">
                      Report
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="grid content-start gap-4">
        <AdSlot id="sidebar" />
        <h2 className="text-lg font-semibold">Related videos</h2>
        <div className={`grid grid-cols-2 gap-3 ${theatre ? 'md:grid-cols-4' : 'lg:grid-cols-1'}`}>
          {related.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
        {more.length > 0 && (
          <>
            <h2 className="text-lg font-semibold">More from this performer</h2>
            <div className={`grid grid-cols-2 gap-3 ${theatre ? 'md:grid-cols-4' : 'lg:grid-cols-1'}`}>
              {more.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </>
        )}
      </aside>

      {modal === 'share' && (
        <Modal title="Share" onClose={() => setModal(null)}>
          <div className="grid gap-3 text-sm">
            <input readOnly value={url} aria-label="Share link" className="min-h-11 rounded-lg border border-line bg-ink px-3 font-mono text-xs" />
            <button onClick={() => copy(url, 'link')} className="min-h-11 rounded-lg bg-accent font-semibold text-white">
              Copy link
            </button>
            <p className="text-xs text-muted">The link opens a safe preview page with no explicit image, so it can be posted anywhere.</p>
            <label className="grid gap-1 text-muted">
              Embed code
              <textarea readOnly rows={3} value={embed} className="rounded-lg border border-line bg-ink p-2 font-mono text-xs text-fg" />
            </label>
            <button onClick={() => copy(embed, 'embed')} className="min-h-11 rounded-lg border border-line">
              Copy embed code
            </button>
          </div>
        </Modal>
      )}

      {modal === 'report' && (
        <Modal title="Report this video" onClose={() => setModal(null)}>
          <form
            className="grid gap-2 text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              const reason = new FormData(e.currentTarget).get('reason') as string
              const ref = addModeration({ kind: 'report', subject: video.id, detail: reason })
              setModal(null)
              setNotice(`Report sent. Reference ${ref}.`)
            }}
          >
            {reasons.map((r, i) => (
              <label key={r} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="reason" value={r} defaultChecked={i === 0} className="size-4 accent-accent" /> {r}
              </label>
            ))}
            <Link href="/content-removal" className="flex min-h-11 items-center text-accent underline">
              I appear in this video and want it removed
            </Link>
            <button className="min-h-11 rounded-lg bg-accent font-semibold text-white">Send report</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
