// src/app/(site)/messages/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { dbGet } from '@/lib/db'
import { useStored } from '@/lib/store'
import { useAuth, useWallet } from '@/context/Providers'
import { GiftPicker } from '@/components/Extras'

type Dm = { from: 'me' | 'them'; text: string; locked?: number }
const COST = 5

export default function MessagesPage() {
  const { user, openLogin } = useAuth()
  const { debit } = useWallet()
  const performers = dbGet('performers')
  const [threads, setThreads] = useStored<Record<string, Dm[]>>('tm_messages', {})
  const [open, setOpen] = useState('')
  useEffect(() => setOpen(new URLSearchParams(location.search).get('to') ?? ''), [])
  const add = (id: string, ...msgs: Dm[]) => setThreads((t) => ({ ...t, [id]: [...(t[id] ?? []), ...msgs] }))
  const ids = [...new Set([...Object.keys(threads), ...(open ? [open] : [])])]
  const thread = threads[open] ?? []
  const name = (id: string) => performers.find((p) => p.id === id)?.name ?? id

  if (!user)
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <h1 className="text-lg font-semibold">Messages</h1>
        <button onClick={openLogin} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">
          Log in to message performers
        </button>
      </div>
    )
  return (
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Conversations" className="grid content-start gap-1 text-sm">
        <h1 className="mb-2 text-lg font-semibold">Messages</h1>
        {ids.map((id) => (
          <button key={id} onClick={() => setOpen(id)} aria-current={id === open} className={`min-h-11 rounded-lg px-3 text-left ${id === open ? 'bg-surface' : ''}`}>
            {name(id)}
          </button>
        ))}
        {!ids.length && <p className="text-muted">No conversations. Use the Message button on a performer page.</p>}
      </nav>
      {open && (
        <section className="grid content-start gap-3 text-sm">
          <h2 className="font-semibold">{name(open)}</h2>
          <div className="grid min-h-40 content-start gap-2 rounded-lg bg-surface p-3">
            {thread.map((m, i) =>
              m.locked ? (
                <button key={i} onClick={() => debit(m.locked!, `Unlocked media from ${name(open)}`) && setThreads((t) => ({ ...t, [open]: t[open].map((x, j) => (j === i ? { from: 'them', text: 'Media unlocked (placeholder).' } : x)) }))} className="grid aspect-video w-44 place-items-center rounded-lg border border-dashed border-line text-xs text-muted">
                  Locked media · {m.locked} tokens
                </button>
              ) : (
                <p key={i} className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.from === 'me' ? 'justify-self-end bg-accent text-white' : 'bg-line'}`}>{m.text}</p>
              ),
            )}
            {!thread.length && <p className="text-muted">Each message costs {COST} tokens. Performers reply when they are online.</p>}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const input = e.currentTarget.elements.namedItem('text') as HTMLInputElement
              if (!input.value.trim() || !debit(COST, `Message to ${name(open)}`)) return
              add(open, { from: 'me', text: input.value.trim() }, { from: 'them', text: 'Thanks for your message. This is a demo reply.' }, ...(thread.length === 0 ? [{ from: 'them' as const, text: '', locked: 30 }] : []))
              input.value = ''
            }}
          >
            <input name="text" maxLength={300} placeholder={`Message · ${COST} tokens`} aria-label="Message" className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3" />
            <button className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">Send</button>
          </form>
          <GiftPicker onGift={(g) => debit(g.tokens, `Gift to ${name(open)}: ${g.name}`) && add(open, { from: 'me', text: `${g.icon} ${g.name}` })} />
        </section>
      )}
    </div>
  )
}
