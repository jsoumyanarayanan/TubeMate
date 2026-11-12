// src/app/(site)/premium/page.tsx
'use client'
import { Check, Minus } from 'lucide-react'
import basePlans from '@/data/plans.json'
import { useStored } from '@/lib/store'
import { CurrencySwitch, Price, useAuth, usePaywall } from '@/context/Providers'

const features: [string, boolean, boolean][] = [
  ['No ads', false, true],
  ['HD and 4K quality', false, true],
  ['Downloads', false, true],
  ['Premium-only videos', false, true],
  ['Monthly bonus tokens', false, true],
  ['AI character perks', false, true],
  ['4K and VR sections (Premium Plus plan)', false, true],
  ['Free videos and browsing', true, true],
]
const mark = (yes: boolean) => (yes ? <Check size={18} className="mx-auto text-accent" aria-label="Included" /> : <Minus size={18} className="mx-auto text-muted" aria-label="Not included" />)

export default function PremiumPage() {
  const { user, setPlan, openLogin } = useAuth()
  const { openPremium } = usePaywall()
  const [plans] = useStored('tm_db_plans', basePlans)
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div className="rounded-lg bg-accent/15 p-4 text-center">
        <p className="font-semibold">Try Premium free for 7 days</p>
        <p className="text-sm text-muted">Cancel anytime in two clicks from your account.</p>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Choose your plan</h1>
        <CurrencySwitch />
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {plans.map((p) => {
          const current = (user?.plan ?? 'free') === p.id
          return (
            <div key={p.id} className={`grid content-start gap-2 rounded-lg border p-4 ${p.id === 'yearly' ? 'border-accent' : 'border-line'} bg-surface`}>
              <p className="font-semibold">{p.name}</p>
              <p className="text-2xl font-bold">
                <Price usd={p.priceUsd} />
              </p>
              <p className="min-h-10 text-xs text-muted">
                {p.period} {p.note && `· ${p.note}`}
              </p>
              {p.id !== 'free' && (
                <button
                  disabled={current}
                  onClick={() => (user ? setPlan(p.id) : openLogin())}
                  className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:bg-line disabled:text-muted"
                >
                  {current ? 'Current plan' : 'Choose'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="py-2 font-medium">Feature</th>
            <th className="w-24 py-2 text-center font-medium">Free</th>
            <th className="w-24 py-2 text-center font-medium">Premium</th>
          </tr>
        </thead>
        <tbody>
          {features.map(([name, free, premium]) => (
            <tr key={name} className="border-b border-line">
              <td className="py-3">{name}</td>
              <td>{mark(free)}</td>
              <td>{mark(premium)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={openPremium} className="mx-auto min-h-11 rounded-lg border border-line px-5 text-sm">
        Compare in checkout
      </button>
    </div>
  )
}
