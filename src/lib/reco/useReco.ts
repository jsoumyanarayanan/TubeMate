// src/lib/reco/useReco.ts
'use client'
import { useEffect, useState } from 'react'
import { activeMood } from '@/lib/mood'
import { consent } from '@/lib/reco/events'

// False during the first render of the page, so server and browser output match.
// Providers calls markHydrated() once the page has hydrated.
let mounted = false
export const markHydrated = () => (mounted = true)

// Re-renders when consent or the profile changes. version is a handy effect key.
export function useReco() {
  const [state, setState] = useState(() => (mounted ? { consent: consent(), version: 1, ready: true } : { consent: '' as ReturnType<typeof consent>, version: 0, ready: false }))
  useEffect(() => {
    const sync = () => setState((s) => ({ consent: consent(), version: s.version + 1, ready: true }))
    mounted = true
    sync()
    window.addEventListener('tm:reco', sync)
    return () => window.removeEventListener('tm:reco', sync)
  }, [])
  return state
}

// The active mood mode. Updates at once when the viewer picks another.
export function useMood() {
  return useReco().ready ? activeMood() : null
}
