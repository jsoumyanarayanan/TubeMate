// src/lib/experiment.ts
'use client'
import { useEffect, useState } from 'react'
import { track } from '@/lib/analytics'

import { read, write } from '@/lib/growth'

// Pick a variant once per browser and keep it in localStorage. Usable outside React.
export function assign<T extends string>(name: string, variants: readonly T[]): T {
  const key = `tm_exp_${name}`
  let saved: string | null = null
  try {
    saved = localStorage.getItem(key)
  } catch {}
  if (!saved || !variants.includes(saved as T)) {
    saved = variants[Math.floor(Math.random() * variants.length)]
    try {
      localStorage.setItem(key, saved)
    } catch {}
    track('experiment_assigned', { name, variant: saved })
  }
  return saved as T
}

// Count how often a variant was shown and how often it converted. /admin/growth reads this.
export type ExpStats = Record<string, Record<string, { shown: number; converted: number }>>
export function stat(name: string, variant: string, kind: 'shown' | 'converted') {
  const all = read<ExpStats>('tm_exp_stats', {})
  const row = (all[name] ??= {})[variant] ?? { shown: 0, converted: 0 }
  all[name][variant] = { ...row, [kind]: row[kind] + 1 }
  write('tm_exp_stats', all)
}

// A/B test hook. Returns the first variant until the page has mounted.
export function useExperiment<T extends string>(name: string, variants: readonly T[]): T {
  const [variant, setVariant] = useState(variants[0])
  useEffect(() => {
    setVariant(assign(name, variants))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])
  return variant
}
