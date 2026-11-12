// src/lib/characters.ts
'use client'
import base from '@/data/characters.json'
import { useStored } from '@/lib/store'

export type Character = (typeof base)[number] & { custom?: boolean; appearance?: string[]; sliders?: Record<string, number>; relationship?: string; backstory?: string }
export const MIN_AGE = 18
export const FREE_MESSAGES = 20

export function useCharacters() {
  const [custom, setCustom] = useStored<Character[]>('tm_characters', [])
  const [plus, setPlus] = useStored('tm_ai_plus', false)
  const [extraSlots, setExtraSlots] = useStored('tm_ai_slots', 0)
  const limit = (plus ? 10 : 1) + extraSlots
  return { base: base as Character[], custom, setCustom, plus, setPlus, extraSlots, setExtraSlots, limit }
}
