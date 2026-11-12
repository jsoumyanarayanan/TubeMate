// src/app/(site)/account/controls/page.tsx
// Member controls: daily spend limit, session reminder, private mode, notification channels, and cancel.
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/Providers'
import { setPref, isDiscreet, noHistory } from '@/lib/prefs'
import { read } from '@/lib/growth'
import { useStored } from '@/lib/store'

const box = 'grid gap-3 rounded-xl border border-line p-4'
const btn = 'min-h-11 rounded-lg border border-line px-4 text-sm hover:border-accent'
const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'

export default function ControlsPage() {
  const { user, setPlan } = useAuth()
  const [limit, setLimit] = useStored<number | null>('tm_spend_limit', null)
  const [limitText, setLimitText] = useState('')
  const [reminder, setReminder] = useStored<number>('tm_session_reminder', 0)
  const [pushOn, setPush] = useStored('tm_push_live', false)
  const [emailOn, setEmail] = useStored('tm_email_optin', false)
  const [priv, setPriv] = useState(false)
  const [discreet, setDiscreet] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    setPriv(noHistory())
    setDiscreet(isDiscreet())
    const l = read<number | null>('tm_spend_limit', null)
    setLimitText(l === null ? '' : String(l))
  }, [])

  const saveLimit = () => {
    const n = Number(limitText)
    if (limitText.trim() === '' || Number.isNaN(n) || n < 0) return setSaved('Enter a whole dollar amount, or clear the limit.')
    setLimit(Math.round(n * 100) / 100)
    setSaved(`Daily limit set to $${(Math.round(n * 100) / 100).toFixed(2)}. Purchases beyond it are blocked until tomorrow.`)
  }
  const clearLimit = () => {
    setLimit(null)
    setLimitText('')
    setSaved('No daily limit. Purchases are not capped.')
  }
  const toggle = (on: boolean, set: (v: boolean) => void, label: string) => {
    set(!on)
    setSaved(`${label} ${on ? 'turned off' : 'turned on'}.`)
  }

  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold">Account controls</h1>
      {saved && (
        <p role="status" className="rounded-lg bg-surface p-3 text-sm">
          {saved}
        </p>
      )}

      <section aria-labelledby="c-spend" className={box}>
        <h2 id="c-spend" className="font-semibold">
          Daily spend limit
        </h2>
        <p className="text-sm text-muted">Optional. Token packs and plans that would go over this amount in one day are blocked with a message.</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">
            Limit in USD
            <input
              type="number"
              min="0"
              step="1"
              value={limitText}
              onChange={(e) => setLimitText(e.target.value)}
              className="min-h-11 w-40 rounded-lg border border-line bg-ink px-3"
            />
          </label>
          <button onClick={saveLimit} className={primary}>
            Save limit
          </button>
          <button onClick={clearLimit} className={btn}>
            No limit
          </button>
        </div>
        <p className="text-xs text-muted">{limit === null ? 'No limit is set.' : `Current limit: $${limit.toFixed(2)} a day.`}</p>
      </section>

      <section aria-labelledby="c-remind" className={box}>
        <h2 id="c-remind" className="font-semibold">
          Session reminder
        </h2>
        <label className="flex items-center gap-2 text-sm">
          Remind me after
          <select value={reminder} onChange={(e) => (setReminder(Number(e.target.value)), setSaved('Session reminder updated.'))} className="min-h-11 rounded-lg border border-line bg-ink px-3">
            <option value={0}>Off</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
          </select>
        </label>
      </section>

      <section aria-labelledby="c-privacy" className={box}>
        <h2 id="c-privacy" className="font-semibold">
          Privacy
        </h2>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={priv}
            onChange={() => (setPref('tm_no_history', !priv), setPriv(!priv), setSaved(`Private mode ${priv ? 'off' : 'on'}.`))}
            className="size-4 accent-accent"
          />
          Private mode (no history or interest tracking)
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={discreet}
            onChange={() => (setPref('tm_discreet', !discreet), setDiscreet(!discreet), setSaved(`Discreet mode ${discreet ? 'off' : 'on'}.`))}
            className="size-4 accent-accent"
          />
          Discreet mode (blur thumbnails, neutral page title)
        </label>
      </section>

      <section aria-labelledby="c-notify" className={box}>
        <h2 id="c-notify" className="font-semibold">
          Notifications
        </h2>
        <p className="text-sm text-muted">Each channel has its own switch. Turning one off stops it straight away.</p>
        <label className="flex min-h-11 items-center justify-between gap-2 text-sm">
          Push alerts (go-live and new episodes, at most one a day)
          <input type="checkbox" checked={pushOn} onChange={() => toggle(pushOn, setPush, 'Push alerts')} className="size-5 accent-accent" />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-2 text-sm">
          Email (at most two a week)
          <input type="checkbox" checked={emailOn} onChange={() => toggle(emailOn, setEmail, 'Email')} className="size-5 accent-accent" />
        </label>
      </section>

      <section aria-labelledby="c-cancel" className={box}>
        <h2 id="c-cancel" className="font-semibold">
          Subscription
        </h2>
        {!user?.plan ? (
          <p className="text-sm text-muted">You are on the free plan. <Link href="/premium" className="text-accent underline">See plans</Link></p>
        ) : confirming ? (
          <div className="flex flex-wrap gap-2">
            <p className="text-sm">Cancel your plan now? This demo drops you to the free plan straight away.</p>
            <button
              onClick={() => (setPlan(null), setConfirming(false), setSaved('Your plan is cancelled.'))}
              className={primary}
            >
              Yes, cancel my plan
            </button>
            <button onClick={() => setConfirming(false)} className={btn}>
              Keep my plan
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className={btn}>
            Cancel subscription
          </button>
        )}
      </section>
    </div>
  )
}
