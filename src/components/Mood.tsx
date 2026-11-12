// src/components/Mood.tsx
// Mood picker for the header and mood shortcuts for the home page.
'use client'
import { moods, setMood } from '@/lib/mood'
import { useMood } from '@/lib/reco/useReco'

export function MoodPicker() {
  const mood = useMood()
  return (
    <label className="flex min-h-11 items-center gap-2 px-3 text-sm text-muted">
      Mood
      <select aria-label="Mood" value={mood?.id ?? ''} onChange={(e) => setMood(e.target.value || null)} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-fg">
        <option value="">Any</option>
        {moods.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export function MoodShortcuts() {
  const mood = useMood()
  return (
    <section aria-label="Mood shortcuts" className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">In the mood for</span>
      {moods.map((m) => (
        <button key={m.id} onClick={() => setMood(mood?.id === m.id ? null : m.id)} aria-pressed={mood?.id === m.id} className={`min-h-11 rounded-full border px-4 text-sm ${mood?.id === m.id ? 'border-accent bg-accent text-white' : 'border-line'}`}>
          {m.name}
        </button>
      ))}
    </section>
  )
}
