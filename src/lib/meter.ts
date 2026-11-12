// src/lib/meter.ts
// Per-minute billing for private shows and calls. Charges at the start of each minute,
// uses bundle minutes before tokens when allowed, and ends the session when neither is left.
'use client'
import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@/context/Providers'
import { useStored } from '@/lib/store'

// Shorten a "minute" for testing with NEXT_PUBLIC_MINUTE_MS.
export const MINUTE_MS = Number(process.env.NEXT_PUBLIC_MINUTE_MS ?? 60000)

export function useMeter(opts: { rate: number; active: boolean; reason: string; useBundle?: boolean; onEnd: (why: string) => void }) {
  const wallet = useWallet()
  const [bundle, setBundle] = useStored('tm_call_minutes', 0)
  const live = useRef({ wallet, bundle, opts })
  live.current = { wallet, bundle, opts }
  const [sec, setSec] = useState(0)
  const [spent, setSpent] = useState(0)
  const [bundleUsed, setBundleUsed] = useState(0)

  useEffect(() => {
    if (!opts.active) return
    setSec(0)
    setSpent(0)
    setBundleUsed(0)
    let localBundle = live.current.bundle
    let localBalance = live.current.wallet.balance
    const charge = () => {
      const { wallet, opts } = live.current
      if (opts.useBundle && localBundle > 0) {
        localBundle -= 1
        setBundle((b) => Math.max(0, b - 1))
        setBundleUsed((n) => n + 1)
        return true
      }
      if (localBalance < opts.rate) {
        opts.onEnd('Your tokens ran out, so the session ended.')
        return false
      }
      localBalance -= opts.rate
      wallet.credit(-opts.rate, opts.reason, 'spend')
      setSpent((s) => s + opts.rate)
      return true
    }
    if (!charge()) return
    const tick = setInterval(() => setSec((s) => s + 1), MINUTE_MS / 60)
    const bill = setInterval(() => {
      // Pick up top-ups made during the session.
      localBalance = live.current.wallet.balance
      charge()
    }, MINUTE_MS)
    return () => {
      clearInterval(tick)
      clearInterval(bill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.active])

  const minutesLeft = (opts.useBundle ? bundle : 0) + Math.floor(wallet.balance / opts.rate)
  return { sec, spent, bundleUsed, minutesLeft, low: opts.active && minutesLeft < 2 }
}
