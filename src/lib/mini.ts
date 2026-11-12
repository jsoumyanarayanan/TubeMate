// src/lib/mini.ts
// Shared state for the mini player that survives navigation, plus a small drag helper.
'use client'
import { useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import type { Video } from '@/lib/db'

export type Mini = { video: Video; t: number } | null
let current: Mini = null
const subs = new Set<() => void>()
export const setMini = (m: Mini) => {
  current = m
  subs.forEach((f) => f())
}
export const useMini = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => current, () => null)

// Drag a fixed element around. Starts after 4px of movement so plain clicks still work.
export function useDrag() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const start = useRef<{ x: number; y: number; held: boolean } | null>(null)
  return {
    style: { transform: `translate(${pos.x}px, ${pos.y}px)` },
    onPointerDown: (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('button, a, input, select')) start.current = { x: e.clientX - pos.x, y: e.clientY - pos.y, held: false }
    },
    onPointerMove: (e: PointerEvent) => {
      const s = start.current
      if (!s) return
      const next = { x: e.clientX - s.x, y: e.clientY - s.y }
      if (!s.held && Math.hypot(next.x - pos.x, next.y - pos.y) < 4) return
      if (!s.held) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      s.held = true
      setPos(next)
    },
    onPointerUp: () => (start.current = null),
  }
}
