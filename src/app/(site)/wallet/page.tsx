// src/app/(site)/wallet/page.tsx
'use client'
import { useState } from 'react'
import basePacks from '@/data/tokenPacks.json'
import { useStored } from '@/lib/store'
import { DailyReward } from '@/components/Extras'
import { CurrencySwitch, Price, useAuth, useWallet, type Tx } from '@/context/Providers'

export default function WalletPage() {
  const { user, openLogin } = useAuth()
  const { balance, history, credit } = useWallet()
  const [packs] = useStored('tm_db_packs', basePacks)
  const [type, setType] = useState<Tx['type'] | ''>('')
  const rows = history.filter((t) => !type || t.type === type)

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">Wallet</h1>
          <p className="text-3xl font-bold">
            {balance} <span className="text-base font-normal text-muted">tokens</span>
          </p>
        </div>
        <CurrencySwitch />
      </div>

      <DailyReward />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {packs.map((p) => (
          <button
            key={p.id}
            // Payment provider goes here. The demo credits tokens without charging.
            onClick={() => (user ? credit(p.tokens + p.bonus, `Bought ${p.tokens} token pack`) : openLogin())}
            className="grid gap-1 rounded-lg border border-line bg-surface p-4 text-left hover:border-accent"
          >
            <span className="text-lg font-semibold">{p.tokens}</span>
            <span className="text-xs text-accent">{p.bonus ? `+${p.bonus} bonus` : ' '}</span>
            <span className="text-sm">
              <Price usd={p.priceUsd} />
            </span>
          </button>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">History</h2>
          <select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value as Tx['type'] | '')} className="min-h-11 rounded-lg border border-line bg-surface px-3 text-sm">
            <option value="">All types</option>
            <option value="purchase">Purchases</option>
            <option value="spend">Spending</option>
            <option value="bonus">Bonuses</option>
          </select>
        </div>
        {rows.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Reason</th>
                <th className="py-2 text-right font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-line">
                  <td className="py-2 text-muted">{t.at.slice(0, 10)}</td>
                  <td className="py-2">{t.reason}</td>
                  <td className={`py-2 text-right tabular-nums ${t.amount < 0 ? 'text-accent' : ''}`}>{t.amount > 0 ? `+${t.amount}` : t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-sm text-muted">No transactions yet.</p>
        )}
      </section>
    </div>
  )
}
