// src/app/(site)/ai/create/page.tsx
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { isRealPerson } from '@/lib/chatProvider'
import { MIN_AGE, useCharacters, type Character } from '@/lib/characters'
import { useAuth, useWallet } from '@/context/Providers'

const steps = ['Basics', 'Appearance', 'Personality', 'Voice', 'Story', 'Review']
// Preset chips only. Every option describes an adult. No free text and no photo upload.
const looks = { Hair: ['Short', 'Long', 'Curly', 'Wavy'], Style: ['Casual', 'Elegant', 'Sporty', 'Alternative'], Build: ['Slim', 'Athletic', 'Curvy', 'Tall'] }
const traits = ['Playful', 'Calm', 'Witty', 'Caring', 'Bold', 'Curious', 'Dreamy', 'Confident']
const sliders = ['Playful to serious', 'Shy to outgoing', 'Brief to talkative']
const chip = (on: boolean) => `min-h-11 rounded-full border px-4 text-sm ${on ? 'border-accent bg-accent/20 text-accent' : 'border-line'}`
const field = 'min-h-11 rounded-lg border border-line bg-surface px-3'

export default function CreateCharacterPage() {
  const router = useRouter()
  const { user, openLogin } = useAuth()
  const { debit } = useWallet()
  const { custom, setCustom, limit, plus, setExtraSlots } = useCharacters()
  const [step, setStep] = useState(0)
  const [c, setC] = useState({ name: '', age: 21, appearance: [] as string[], personality: [] as string[], sliders: Object.fromEntries(sliders.map((s) => [s, 50])), voice: 'Voice 1', relationship: 'Friend', backstory: '' })
  const flip = (key: 'appearance' | 'personality', v: string, max = 99) =>
    setC((x) => ({ ...x, [key]: x[key].includes(v) ? x[key].filter((i) => i !== v) : x[key].length < max ? [...x[key], v] : x[key] }))

  const error =
    step === 0
      ? !c.name.trim()
        ? 'Give the character a name.'
        : isRealPerson(c.name)
          ? 'Characters must be fictional. Names of real public figures are not allowed.'
          : !(c.age >= MIN_AGE)
            ? `Characters must be ${MIN_AGE} or older.`
            : ''
      : step === 2 && !c.personality.length
        ? 'Pick at least one trait.'
        : ''
  const full = custom.length >= limit

  const save = () => {
    if (!user) return openLogin()
    if (c.age < MIN_AGE || isRealPerson(c.name) || full) return // guard again at save time
    const id = `u${Date.now().toString(36)}`
    const character: Character = { id, slug: id, name: c.name.trim(), age: c.age, avatar: '/placeholder/avatar.svg', tagline: `${c.relationship} · ${c.voice}`, personality: c.personality, voice: c.voice, isPremium: false, custom: true, appearance: c.appearance, sliders: c.sliders, relationship: c.relationship, backstory: c.backstory }
    setCustom((all) => [character, ...all])
    router.push(`/ai/${id}`)
  }

  return (
    <div className="mx-auto grid max-w-xl gap-5 text-sm">
      <h1 className="text-lg font-semibold">Create an AI character</h1>
      <div>
        <div className="h-1.5 overflow-hidden rounded bg-line" role="progressbar" aria-valuenow={step + 1} aria-valuemax={steps.length}>
          <div className="h-full bg-accent transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">
          Step {step + 1} of {steps.length}: {steps[step]}
        </p>
      </div>

      {step === 0 && (
        <div className="grid gap-3">
          <label className="grid gap-1">
            Name
            <input value={c.name} maxLength={30} onChange={(e) => setC({ ...c, name: e.target.value })} className={field} />
          </label>
          <label className="grid gap-1">
            Age ({MIN_AGE} or older)
            <input type="number" min={MIN_AGE} max={99} value={c.age} onChange={(e) => setC({ ...c, age: Number(e.target.value) })} className={field} />
          </label>
        </div>
      )}
      {step === 1 &&
        Object.entries(looks).map(([group, options]) => (
          <fieldset key={group}>
            <legend className="mb-2 text-muted">{group}</legend>
            <div className="flex flex-wrap gap-2">
              {options.map((o) => (
                <button key={o} onClick={() => flip('appearance', `${group}: ${o}`)} aria-pressed={c.appearance.includes(`${group}: ${o}`)} className={chip(c.appearance.includes(`${group}: ${o}`))}>
                  {o}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      {step === 2 && (
        <>
          <fieldset>
            <legend className="mb-2 text-muted">Traits (up to 5)</legend>
            <div className="flex flex-wrap gap-2">
              {traits.map((t) => (
                <button key={t} onClick={() => flip('personality', t, 5)} aria-pressed={c.personality.includes(t)} className={chip(c.personality.includes(t))}>
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
          {sliders.map((s) => (
            <label key={s} className="grid gap-1">
              {s}
              <input type="range" value={c.sliders[s]} onChange={(e) => setC({ ...c, sliders: { ...c.sliders, [s]: Number(e.target.value) } })} className="accent-accent" />
            </label>
          ))}
        </>
      )}
      {step === 3 && (
        <div className="flex flex-wrap gap-2">
          {['Voice 1', 'Voice 2', 'Voice 3', 'Voice 4'].map((v) => (
            <button key={v} onClick={() => setC({ ...c, voice: v })} aria-pressed={c.voice === v} className={chip(c.voice === v)}>
              {v} · play sample
            </button>
          ))}
        </div>
      )}
      {step === 4 && (
        <div className="grid gap-3">
          <fieldset>
            <legend className="mb-2 text-muted">Relationship style</legend>
            <div className="flex flex-wrap gap-2">
              {['Friend', 'Partner', 'Confidant', 'Flirt'].map((r) => (
                <button key={r} onClick={() => setC({ ...c, relationship: r })} aria-pressed={c.relationship === r} className={chip(c.relationship === r)}>
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1">
            Backstory (optional, 200 characters)
            <textarea rows={3} maxLength={200} value={c.backstory} onChange={(e) => setC({ ...c, backstory: e.target.value })} className="rounded-lg border border-line bg-surface p-3" />
          </label>
        </div>
      )}
      {step === 5 && (
        <dl className="grid gap-2 rounded-lg bg-surface p-4">
          {[['Name', c.name], ['Age', String(c.age)], ['Appearance', c.appearance.join(', ') || 'Not set'], ['Traits', c.personality.join(', ')], ['Voice', c.voice], ['Relationship', c.relationship]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {error && (
        <p role="alert" className="text-accent">
          {error}
        </p>
      )}
      {step === 5 && full && (
        <div className="rounded-lg border border-line p-3">
          <p>
            You have used your {limit} character {limit === 1 ? 'slot' : 'slots'}. {plus ? '' : 'AI Plus gives you 10.'}
          </p>
          <button onClick={() => debit(100, 'Extra AI character slot') && setExtraSlots((n) => n + 1)} className="mt-2 min-h-11 rounded-lg border border-line px-4">
            Add a slot for 100 tokens
          </button>
        </div>
      )}
      <div className="flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="min-h-11 rounded-lg border border-line px-4">
            Back
          </button>
        )}
        {step < 5 ? (
          <button disabled={!!error} onClick={() => setStep(step + 1)} className="min-h-11 rounded-lg bg-accent px-5 font-semibold text-white disabled:bg-line disabled:text-muted">
            Next
          </button>
        ) : (
          <button disabled={full} onClick={save} className="min-h-11 rounded-lg bg-accent px-5 font-semibold text-white disabled:bg-line disabled:text-muted">
            Save character
          </button>
        )}
      </div>
    </div>
  )
}
