// src/app/(site)/affiliates/page.tsx
'use client'
import { useState } from 'react'

const tiers = [['Starter', 'Up to 50 sign-ups a month', '25%'], ['Growth', '51 to 250 sign-ups', '30%'], ['Partner', 'Over 250 sign-ups', '35%']]

export default function AffiliatesPage() {
  const [sent, setSent] = useState(false)
  return (
    <div className="mx-auto grid max-w-3xl gap-6 text-sm">
      <div>
        <h1 className="text-lg font-semibold">Affiliate programme for site owners</h1>
        <p className="text-muted">Send visitors to TUBEMATE and earn a share of what they spend in their first 12 months.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {tiers.map(([name, range, share]) => (
          <div key={name} className="rounded-lg bg-surface p-4">
            <p className="font-semibold">{name}</p>
            <p className="text-2xl font-bold text-accent">{share}</p>
            <p className="text-xs text-muted">{range}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="mb-2 font-semibold">Sample dashboard</h2>
        <dl className="grid grid-cols-2 gap-2 text-center md:grid-cols-4">
          {[['Clicks', '12,480'], ['Sign-ups', '312'], ['Conversion', '2.5%'], ['Earnings', '$1,870']].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-surface p-4">
              <dd className="text-xl font-bold">{v}</dd>
              <dt className="text-xs text-muted">{k} · mock data</dt>
            </div>
          ))}
        </dl>
      </section>
      {sent ? (
        <p role="status" className="rounded-lg bg-surface p-4">
          Application received. We reply within 3 working days.
        </p>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setSent(true)
          }}
        >
          <h2 className="font-semibold">Apply</h2>
          <input required placeholder="Website address" aria-label="Website address" className="min-h-11 rounded-lg border border-line bg-surface px-3" />
          <input required type="email" placeholder="Contact email" aria-label="Contact email" className="min-h-11 rounded-lg border border-line bg-surface px-3" />
          <label className="flex items-center gap-2">
            <input type="checkbox" required className="size-4 accent-accent" /> My site is for adults only and follows the programme rules
          </label>
          <button className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">Send application</button>
        </form>
      )}
    </div>
  )
}
