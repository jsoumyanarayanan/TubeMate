// src/app/(site)/redeem/page.tsx
'use client'
import { useState } from 'react'
import codes from '@/data/giftCodes.json'
import { useStored } from '@/lib/store'
import { useAuth, useWallet } from '@/context/Providers'

const field = 'min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3'
const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'

export default function RedeemPage() {
  const { user, openLogin, setPlan } = useAuth()
  const { credit, debit } = useWallet()
  const [used, setUsed] = useStored<string[]>('tm_codes_used', [])
  const [made, setMade] = useStored<{ code: string; tokens: number }[]>('tm_codes_made', [])
  const [notice, setNotice] = useState('')
  const guard = (run: (data: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return openLogin()
    run(new FormData(e.currentTarget))
    e.currentTarget.reset()
  }
  return (
    <div className="mx-auto grid max-w-xl gap-6 text-sm">
      <h1 className="text-lg font-semibold">Gift codes and token gifts</h1>
      {notice && (
        <p role="status" className="rounded-lg bg-surface p-3">
          {notice}
        </p>
      )}
      <form
        className="grid gap-2"
        onSubmit={guard((d) => {
          const code = String(d.get('code')).trim().toUpperCase()
          const match = [...codes, ...made].find((c) => c.code === code)
          if (!match) return setNotice('That code is not valid.')
          if (used.includes(code)) return setNotice('That code was already used.')
          setUsed((u) => [...u, code])
          if ('plan' in match && match.plan) setPlan(match.plan), setNotice('Premium activated.')
          else credit(match.tokens!, `Redeemed code ${code}`, 'bonus'), setNotice(`${match.tokens} tokens added.`)
        })}
      >
        <h2 className="font-semibold">Redeem a code</h2>
        <div className="flex flex-wrap gap-2">
          <input name="code" required placeholder="DEMO-TOKENS-100" aria-label="Gift code" className={field} />
          <button className={primary}>Redeem</button>
        </div>
        <p className="text-xs text-muted">Demo codes: DEMO-TOKENS-100, DEMO-TOKENS-500, DEMO-PREMIUM-30. Codes let members pay without a card on file.</p>
      </form>

      <form
        className="grid gap-2"
        onSubmit={guard((d) => {
          const tokens = Number(d.get('tokens'))
          if (tokens > 0 && debit(tokens, `Sent ${tokens} tokens to ${d.get('to')}`)) setNotice(`${tokens} tokens sent to ${d.get('to')}.`)
        })}
      >
        <h2 className="font-semibold">Send tokens to another member</h2>
        <div className="flex flex-wrap gap-2">
          <input name="to" required placeholder="Member name" aria-label="Member name" className={field} />
          <input name="tokens" type="number" min={1} required placeholder="Tokens" aria-label="Tokens" className="min-h-11 w-28 rounded-lg border border-line bg-surface px-3" />
          <button className={primary}>Send</button>
        </div>
      </form>

      <form
        className="grid gap-2"
        onSubmit={guard((d) => {
          const tokens = Number(d.get('tokens'))
          if (!debit(tokens, `Bought a ${tokens}-token gift code`)) return
          const code = `GIFT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
          setMade((m) => [...m, { code, tokens }])
          setNotice(`Gift code created: ${code}`)
        })}
      >
        <h2 className="font-semibold">Buy a gift code</h2>
        <div className="flex flex-wrap gap-2">
          <select name="tokens" aria-label="Value" className={field}>
            {[100, 250, 500].map((n) => (
              <option key={n} value={n}>
                {n} tokens
              </option>
            ))}
          </select>
          <button className={primary}>Create code</button>
        </div>
        {made.map((m) => (
          <p key={m.code} className="font-mono text-xs text-muted">
            {m.code} · {m.tokens} tokens{used.includes(m.code) ? ' · used' : ''}
          </p>
        ))}
      </form>
    </div>
  )
}
