// src/app/(site)/referrals/page.tsx
'use client'
import { useState } from 'react'
import { useAuth } from '@/context/Providers'
import { refCode } from '@/lib/growth'

export default function ReferralsPage() {
  const { user, openLogin } = useAuth()
  const [copied, setCopied] = useState(false)
  if (!user)
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <h1 className="text-lg font-semibold">Invite friends, earn tokens</h1>
        <p className="text-sm text-muted">50 tokens for each friend who signs up, plus 10% of their first purchase.</p>
        <button onClick={openLogin} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">
          Log in to get your link
        </button>
      </div>
    )
  const code = refCode(user.name)
  const link = `${location.origin}/?ref=${code}`
  return (
    <div className="mx-auto grid max-w-xl gap-5 text-sm">
      <h1 className="text-lg font-semibold">Invite friends, earn tokens</h1>
      <p className="text-muted">You earn 50 tokens for each friend who signs up with your link, plus 10% of their first purchase.</p>
      <div className="flex gap-2">
        <input readOnly value={link} aria-label="Your referral link" className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 font-mono text-xs" />
        <button onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true), () => {})} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[['Clicks', 0], ['Sign-ups', 0], ['Tokens earned', 0]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-surface p-4">
            <dd className="text-2xl font-bold">{v}</dd>
            <dt className="text-xs text-muted">{k}</dt>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-1 text-muted">Next reward: 250 bonus tokens at 5 sign-ups</p>
        <div className="h-2 rounded bg-line" role="progressbar" aria-valuenow={0} aria-valuemax={5} />
      </div>
      {user.referredBy && <p className="text-muted">You joined with referral code {user.referredBy}.</p>}
    </div>
  )
}
