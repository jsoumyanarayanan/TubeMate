// src/app/(site)/content-removal/page.tsx
// Public form. Works without an account and files an item in the admin moderation queue.
'use client'
import { useState } from 'react'
import { addModeration } from '@/lib/db'

const field = 'min-h-11 rounded-lg border border-line bg-surface px-3'

export default function ContentRemovalPage() {
  const [ref, setRef] = useState('')
  if (ref)
    return (
      <div role="status" className="mx-auto max-w-xl rounded-lg bg-surface p-6 text-sm">
        <h1 className="text-lg font-semibold">Request received</h1>
        <p className="mt-2">
          Your reference number is <span className="font-mono font-semibold">{ref}</span>. Keep it for follow-up.
        </p>
        <p className="mt-2 text-muted">Requests from a person who appears in a video are reviewed first, and the video is taken offline while we check.</p>
      </div>
    )
  return (
    <form
      className="mx-auto grid max-w-xl gap-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault()
        const d = new FormData(e.currentTarget)
        setRef(addModeration({ kind: d.get('kind') as 'removal' | 'copyright' | 'abuse', subject: String(d.get('url')), detail: `${d.get('detail')} (contact: ${d.get('email')})` }))
      }}
    >
      <h1 className="text-lg font-semibold">Content removal request</h1>
      <p className="text-muted">Use this form if you appear in a video and want it removed, if your copyright is infringed, or to report illegal content. No account is needed.</p>
      <label className="grid gap-1">
        Reason
        <select name="kind" className={field}>
          <option value="removal">I appear in this content and want it removed</option>
          <option value="copyright">Copyright complaint</option>
          <option value="abuse">Illegal or abusive content</option>
        </select>
      </label>
      <label className="grid gap-1">
        Link or title of the content
        <input name="url" required className={field} />
      </label>
      <label className="grid gap-1">
        Details
        <textarea name="detail" required rows={4} className="rounded-lg border border-line bg-surface p-3" />
      </label>
      <label className="grid gap-1">
        Contact email
        <input name="email" type="email" required className={field} />
      </label>
      <button className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">Send request</button>
    </form>
  )
}
