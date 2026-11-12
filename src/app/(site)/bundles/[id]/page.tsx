// src/app/(site)/bundles/[id]/page.tsx
'use client'
import bundles from '@/data/bundles.json'
import { videosByIds } from '@/lib/api'
import { usePaywall } from '@/context/Providers'
import { VideoGrid } from '@/components/VideoCard'

export default function BundlePage({ params }: { params: { id: string } }) {
  const { unlocked, unlockMany } = usePaywall()
  const bundle = bundles.find((b) => b.id === params.id)
  if (!bundle) return <p className="py-20 text-center text-muted">Bundle not found.</p>
  const videos = videosByIds(bundle.videoIds)
  const separate = videos.reduce((sum, v) => sum + (v.ppvPrice ?? 0), 0)
  const owned = bundle.videoIds.every((id) => unlocked.includes(id))
  return (
    <>
      <h1 className="text-lg font-semibold">{bundle.name}</h1>
      <p className="mb-4 text-sm text-muted">
        {videos.length} videos for {bundle.tokens} tokens{separate > bundle.tokens && `, instead of ${separate} bought one by one`}.
      </p>
      <button disabled={owned} onClick={() => unlockMany(bundle.videoIds, bundle.tokens, `Bought ${bundle.name}`)} className="mb-6 min-h-11 rounded-lg bg-amber-400 px-5 font-semibold text-black disabled:bg-line disabled:text-muted">
        {owned ? 'You own this bundle' : `Buy bundle for ${bundle.tokens} tokens`}
      </button>
      <VideoGrid videos={videos} ads={false} />
    </>
  )
}
