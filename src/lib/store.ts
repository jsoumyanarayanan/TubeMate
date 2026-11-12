// src/lib/store.ts
'use client'
import { useCallback, useEffect, useState } from 'react'

// State kept in localStorage. Safe when storage is missing or blocked.
export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setValue(JSON.parse(raw))
    } catch {}
  }, [key])
  const set = useCallback(
    (next: T | ((prev: T) => T)) =>
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          localStorage.setItem(key, JSON.stringify(v))
        } catch {}
        return v
      }),
    [key],
  )
  return [value, set] as const
}

// Like useData, but keeps showing the old data while new data loads, so rows do not flash.
export function useFresh<T>(load: () => Promise<T>, key: unknown) {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => {
    let stale = false
    load().then((d) => !stale && setData(d))
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return data
}

export const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [id, ...list])
export type Playlist = { id: string; name: string; videoIds: string[] }

// Load async data on the client, so admin changes saved in the browser are picked up.
export function useData<T>(load: () => Promise<T>, key = '') {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => {
    let stale = false
    setData(null)
    load().then((d) => !stale && setData(d))
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return data
}
