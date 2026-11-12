// src/app/(site)/performers/page.tsx
'use client'
import { getPerformers } from '@/lib/api'
import { getProfile } from '@/lib/reco/profile'
import { useReco } from '@/lib/reco/useReco'
import { useData } from '@/lib/store'
import { SkeletonGrid } from '@/components/Shell'
import { PerformerCard, gridCols } from '@/components/VideoCard'

export default function PerformersPage() {
  const all = useData(getPerformers)
  // Performer suggestions: with consent, the ones the viewer likes come first.
  const scores = useReco().consent === 'yes' ? getProfile().long : {}
  const performers = all && [...all].sort((a, b) => (scores[`perf:${b.id}`] ?? 0) - (scores[`perf:${a.id}`] ?? 0))
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">Performers</h1>
      {!performers && <SkeletonGrid />}
      <div className={gridCols}>{performers?.map((p) => <PerformerCard key={p.id} performer={p} />)}</div>
    </>
  )
}
