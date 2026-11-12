// src/app/(site)/playlist/[id]/page.tsx
// Public playlist share page. In the demo the playlist travels in the link (?n=name&v=ids).
// A real API loads it by id here and returns the true follower count.
'use client'
import { videosByIds } from '@/lib/api'
import { toggle, useData, useStored } from '@/lib/store'
import { SkeletonGrid } from '@/components/Shell'
import { VideoGrid } from '@/components/VideoCard'

export default function PlaylistPage({ params, searchParams }: { params: { id: string }; searchParams: { n?: string; v?: string } }) {
  const videos = useData(async () => videosByIds((searchParams.v ?? '').split(',').filter(Boolean)), searchParams.v)
  const [follows, setFollows] = useStored<string[]>('tm_playlist_follows', [])
  const on = follows.includes(params.id)
  // Mock follower count, stable per playlist id.
  const followers = ([...params.id].reduce((n, c) => n + c.charCodeAt(0), 0) % 400) + (on ? 1 : 0)
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{(searchParams.n ?? 'Playlist').slice(0, 60)}</h1>
          <p className="text-sm text-muted">
            Public playlist · {videos?.length ?? 0} {videos?.length === 1 ? 'video' : 'videos'} · {followers} followers
          </p>
        </div>
        <button onClick={() => setFollows((f) => toggle(f, params.id))} aria-pressed={on} className={`min-h-11 rounded-full px-5 text-sm font-semibold ${on ? 'border border-line' : 'bg-accent text-white'}`}>
          {on ? 'Following' : 'Follow playlist'}
        </button>
      </div>
      {!videos ? <SkeletonGrid count={4} /> : videos.length ? <VideoGrid videos={videos} /> : <p className="py-10 text-center text-sm text-muted">This playlist is empty.</p>}
    </>
  )
}
