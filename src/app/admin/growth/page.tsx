// src/app/admin/growth/page.tsx
// Owner metrics. The engagement, retention, churn and revenue figures are mock values until the
// analytics feed is connected. Experiment results are read from this browser's tm_exp_stats.
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { read } from '@/lib/growth'
import type { ExpStats } from '@/lib/experiment'

// Mock figures, one place to replace with the real feed.
const engagement = [
  { label: 'Session length (minutes)', value: 14.2 },
  { label: 'Videos per session', value: 6.8 },
  { label: 'Feed skip rate (%)', value: 38 },
]
const retention = [
  { label: 'Day 1 return (%)', value: 31 },
  { label: 'Day 7 return (%)', value: 18 },
  { label: 'Day 30 return (%)', value: 9 },
]
// USD per member per month, one line for each revenue stream from phases 4 to 9.
const streams = [
  { label: 'Subscriptions (phase 4)', value: 6.42 },
  { label: 'Tokens (phase 4)', value: 3.1 },
  { label: 'Pay-per-view (phase 4)', value: 1.2 },
  { label: 'Ads (phase 5)', value: 0.4 },
  { label: 'Live tips and gifts (phase 6)', value: 2.05 },
  { label: 'Paid calls (phase 7)', value: 1.75 },
  { label: 'AI characters (phase 8)', value: 0.9 },
  { label: 'Bundles and extras (phase 9)', value: 0.6 },
]
const surfaces = [
  { label: 'Video page prompt', shown: 1840, converted: 96 },
  { label: 'Home stage module', shown: 2310, converted: 71 },
  { label: 'Offer card', shown: 1260, converted: 118 },
  { label: 'Pricing exit offer', shown: 420, converted: 27 },
]
const churn = [
  { label: 'Monthly churn (%)', value: 6.8 },
  { label: 'Refund rate (%)', value: 1.2 },
]

const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) : '0.0')

function Bars({ rows, unit = '', max }: { rows: { label: string; value: number }[]; unit?: string; max?: number }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid gap-1 text-sm sm:grid-cols-[14rem_1fr_5rem] sm:items-center sm:gap-3">
          <span>{r.label}</span>
          <span className="block h-3 rounded bg-line" aria-hidden="true">
            <span className="block h-full rounded bg-accent" style={{ width: `${Math.min(100, (r.value / top) * 100)}%` }} />
          </span>
          <span className="tabular-nums">
            {r.value}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function GrowthPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [exp, setExp] = useState<ExpStats>({})
  useEffect(() => {
    setAuthed(sessionStorage.getItem('tm_admin') === '1')
    setExp(read<ExpStats>('tm_exp_stats', {}))
  }, [])
  if (authed === null) return null
  if (!authed)
    return (
      <div className="grid gap-3">
        <h1 className="text-lg font-semibold">Owner metrics</h1>
        <p className="text-muted">Sign in on the admin page first.</p>
        <Link href="/admin" className="text-accent underline">
          Go to admin sign in
        </Link>
      </div>
    )

  const section = 'grid gap-3 rounded-xl border border-line p-4'
  const h = 'font-semibold'
  const revenue = streams.reduce((a, s) => a + s.value, 0)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Owner metrics</h1>
        <Link href="/admin" className="text-accent underline">
          Back to admin
        </Link>
      </div>
      <p className="text-sm text-muted">Mock figures for the demo. Experiment results are from this browser.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="g-eng" className={section}>
          <h2 id="g-eng" className={h}>
            Engagement
          </h2>
          <Bars rows={engagement} />
        </section>
        <section aria-labelledby="g-ret" className={section}>
          <h2 id="g-ret" className={h}>
            Return rates
          </h2>
          <Bars rows={retention} max={100} unit="%" />
        </section>
      </div>

      <section aria-labelledby="g-rev" className={section}>
        <h2 id="g-rev" className={h}>
          Revenue per member by stream (USD a month, total ${revenue.toFixed(2)})
        </h2>
        <Bars rows={streams} />
        <h3 className="mt-2 text-sm font-semibold">Churn and refunds</h3>
        <Bars rows={churn} max={10} unit="%" />
      </section>

      <section aria-labelledby="g-conv" className={section}>
        <h2 id="g-conv" className={h}>
          Conversion per surface
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-normal">Surface</th>
              <th className="py-2 font-normal">Shown</th>
              <th className="py-2 font-normal">Converted</th>
              <th className="py-2 font-normal">Rate</th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map((s) => (
              <tr key={s.label} className="border-t border-line">
                <td className="py-2">{s.label}</td>
                <td className="py-2 tabular-nums">{s.shown}</td>
                <td className="py-2 tabular-nums">{s.converted}</td>
                <td className="py-2 tabular-nums">{pct(s.converted, s.shown)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="g-exp" className={section}>
        <h2 id="g-exp" className={h}>
          Experiments (offers and copy)
        </h2>
        {Object.keys(exp).length === 0 ? (
          <p className="text-sm text-muted">No experiment results yet. Visit a few pages and trigger an offer.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-normal">Experiment</th>
                <th className="py-2 font-normal">Variant</th>
                <th className="py-2 font-normal">Shown</th>
                <th className="py-2 font-normal">Converted</th>
                <th className="py-2 font-normal">Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(exp).flatMap(([name, variants]) =>
                Object.entries(variants).map(([variant, r]) => (
                  <tr key={`${name}-${variant}`} className="border-t border-line">
                    <td className="py-2">{name}</td>
                    <td className="py-2">{variant}</td>
                    <td className="py-2 tabular-nums">{r.shown}</td>
                    <td className="py-2 tabular-nums">{r.converted}</td>
                    <td className="py-2 tabular-nums">{pct(r.converted, r.shown)}%</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
