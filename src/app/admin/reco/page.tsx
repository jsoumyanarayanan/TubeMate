// src/app/admin/reco/page.tsx
// Debug page for the recommendation engine: this browser's profile, the score breakdown
// per video, and sliders for the ranking weights. Behind the same mock admin login as /admin.
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getFeed } from '@/lib/api'
import { write } from '@/lib/growth'
import { defaultWeights, getWeights, type Weights } from '@/lib/reco/config'
import { getProfile } from '@/lib/reco/profile'
import type { Ranked } from '@/lib/reco/rank'
import { ladder } from '@/lib/reco/velocity'

export default function RecoDebugPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [weights, setWeights] = useState<Weights>(defaultWeights)
  const [rows, setRows] = useState<Ranked[]>([])
  useEffect(() => {
    setAuthed(sessionStorage.getItem('tm_admin') === '1')
    setWeights(getWeights())
  }, [])
  useEffect(() => {
    getFeed().then(setRows)
  }, [weights])
  if (authed === null) return null
  if (!authed)
    return (
      <p className="p-6 text-sm">
        <Link href="/admin" className="text-accent underline">
          Log in to admin first
        </Link>
      </p>
    )
  const profile = getProfile()
  const top = Object.entries(profile.long).sort((a, b) => b[1] - a[1]).slice(0, 12)
  const set = (k: keyof Weights, v: number) => {
    const next = { ...weights, [k]: v }
    write('tm_reco_weights', next)
    setWeights(next)
  }
  const cell = 'border-t border-line py-1.5 pr-3 tabular-nums'
  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-4 text-sm">
      <h1 className="text-lg font-semibold">
        Recommendation debug ·{' '}
        <Link href="/admin" className="text-accent underline">
          back to admin
        </Link>
      </h1>
      <section>
        <h2 className="mb-2 font-semibold">Weights</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(defaultWeights) as (keyof Weights)[]).map((k) => (
            <label key={k} className="flex items-center gap-3">
              <span className="w-20 capitalize">{k}</span>
              <input type="range" min={0} max={5} step={0.1} value={weights[k]} onChange={(e) => set(k, Number(e.target.value))} className="flex-1 accent-accent" />
              <span className="w-8 tabular-nums">{weights[k]}</span>
            </label>
          ))}
        </div>
        <button onClick={() => (localStorage.removeItem('tm_reco_weights'), setWeights(defaultWeights))} className="mt-2 min-h-11 rounded-lg border border-line px-4">
          Reset weights
        </button>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Profile in this browser ({profile.count} events)</h2>
        <p className="text-muted">{top.length ? top.map(([k, w]) => `${k} ${w.toFixed(2)}`).join(' · ') : 'Empty. Accept personalisation on the site and watch something.'}</p>
      </section>
      <section className="overflow-x-auto">
        <h2 className="mb-2 font-semibold">Score breakdown, in feed order</h2>
        <table className="w-full min-w-[720px] text-left">
          <thead className="text-muted">
            <tr>
              {['#', 'Video', 'Total', 'Interest', 'Session', 'Quality', 'Fresh', 'Velocity', 'Context', 'Ladder', 'Reason'].map((h) => (
                <th key={h} className="py-1.5 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 30).map((r, i) => (
              <tr key={r.video.id}>
                <td className={cell}>{i + 1}</td>
                <td className={cell}>{r.video.title}</td>
                <td className={`${cell} font-semibold`}>{r.score.toFixed(2)}</td>
                {(['interest', 'session', 'quality', 'freshness', 'velocity', 'context'] as const).map((k) => (
                  <td key={k} className={cell}>
                    {(r.parts[k] * weights[k]).toFixed(2)}
                  </td>
                ))}
                <td className={cell}>{ladder(r.video).isNew ? `step ${ladder(r.video).stage}, ${ladder(r.video).reach * 100}%` : 'full'}</td>
                <td className={cell}>{r.discovery ? `Discovery: ${r.discovery}` : r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
