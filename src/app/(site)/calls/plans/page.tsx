// src/app/(site)/calls/plans/page.tsx
'use client'
import plans from '@/data/callPlans.json'
import { useStored } from '@/lib/store'
import { Price, useAuth } from '@/context/Providers'

export default function CallPlansPage() {
  const { user, openLogin } = useAuth()
  const [minutes, setMinutes] = useStored('tm_call_minutes', 0)
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <h1 className="text-lg font-semibold">Monthly minute bundles</h1>
      <p className="text-sm text-muted">Bundle minutes cost less than the per-minute rate and are used before tokens. You have {minutes} minutes.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="grid gap-2 rounded-lg border border-line bg-surface p-4">
            <p className="text-2xl font-bold">{p.minutes} minutes</p>
            <p className="text-muted">
              <Price usd={p.priceUsd} /> per month
            </p>
            {/* Payment provider goes here. The demo adds minutes without charging. */}
            <button onClick={() => (user ? setMinutes((m) => m + p.minutes) : openLogin())} className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white">
              Subscribe
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">Demo checkout. No payment is taken.</p>
    </div>
  )
}
