// src/app/(site)/content-removal/page.tsx
// Content deletion and removal requests. The steps, targets and request types come from /src/data/removal.json.
// No account is needed. Each request goes into the admin moderation queue with a reference number.
'use client'
import { useState } from 'react'
import { addModeration } from '@/lib/db'
import data from '@/data/removal.json'

const field = 'min-h-11 rounded-lg border border-line bg-surface px-3'
const primary = 'min-h-11 rounded-lg bg-accent px-4 font-semibold text-white'

export default function ContentRemovalPage() {
  const [type, setType] = useState(data.types[0].id)
  const [ref, setRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const current = data.types.find((t) => t.id === type) ?? data.types[0]

  if (ref)
    return (
      <div role="status" className="mx-auto grid max-w-xl gap-3 rounded-lg bg-surface p-6 text-sm">
        <h1 className="text-lg font-semibold">Request received</h1>
        <p>
          Your reference number is <span className="font-mono font-semibold">{ref}</span>. Keep it for any follow-up.
        </p>
        <p className="text-muted">We aim to reply within {data.targets.acknowledgeHours} hours and to decide within {data.targets.decisionDays} days.</p>
        <p className="text-muted">Requests from a person who appears in a video are reviewed first. The video can be hidden while we check.</p>
      </div>
    )

  return (
    <div className="mx-auto grid max-w-2xl gap-8">
      <div className="grid gap-2">
        <h1 className="text-xl font-semibold">Content deletion requests</h1>
        <p className="text-muted">Use this form to ask us to remove a video. You do not need an account.</p>
      </div>

      <section aria-labelledby="flow" className="grid gap-3">
        <h2 id="flow" className="font-semibold">
          What happens next
        </h2>
        <ol className="grid gap-2 md:grid-cols-3">
          {data.steps.map((s, i) => (
            <li key={s.title} className="grid content-start gap-1 rounded-lg border border-line p-3 text-sm">
              <span className="text-xs text-muted">Step {i + 1}</span>
              <span className="font-semibold">{s.title}</span>
              <span className="text-muted">{s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {current.urgent && (
        <div role="alert" className="rounded-lg border border-accent p-4 text-sm">
          <p className="font-semibold">If the content shows a child</p>
          <p className="mt-1">
            Do not share, copy or download it. Report it straight to the police and to your national hotline. In the US, use the NCMEC CyberTipline. Then fill in this form so we can hide it.
          </p>
        </div>
      )}

      <form
        className="grid gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault()
          if (submitting) return
          setSubmitting(true)
          const d = new FormData(e.currentTarget)
          const id = addModeration({
            kind: current.kind as 'removal' | 'copyright' | 'abuse',
            subject: String(d.get('url')),
            detail: `[${current.id}] ${d.get('detail')} | where: ${d.get('where') || '-'} | contact: ${d.get('email')}`,
          })
          setRef(id)
        }}
      >
        <label className="grid gap-1">
          Reason
          <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={field}>
            {data.types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-muted">{current.needs}</p>
        <label className="grid gap-1">
          Link or title of the video
          <input name="url" required className={field} />
        </label>
        <label className="grid gap-1">
          Where it appears (time in the video, if you know it)
          <input name="where" className={field} />
        </label>
        <label className="grid gap-1">
          Details
          <textarea name="detail" required rows={4} className="rounded-lg border border-line bg-surface p-3" />
        </label>
        <label className="grid gap-1">
          Contact email (we reply here)
          <input name="email" type="email" required className={field} />
        </label>
        <label className="flex min-h-11 items-start gap-2">
          <input type="checkbox" required className="mt-1 size-4 accent-accent" />
          <span>I believe this information is true and I am the person or rights holder I describe.</span>
        </label>
        <button disabled={submitting} className={`${primary} justify-self-start`}>
          Send request
        </button>
      </form>
    </div>
  )
}
