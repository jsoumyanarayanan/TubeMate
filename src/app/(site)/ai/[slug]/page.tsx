// src/app/(site)/ai/[slug]/page.tsx
'use client'
import { track } from '@/lib/analytics'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bot, Flag, RotateCcw } from 'lucide-react'
import { chatProvider, type ChatMessage } from '@/lib/chatProvider'
import { FREE_MESSAGES, useCharacters } from '@/lib/characters'
import { addModeration } from '@/lib/db'
import { useStored } from '@/lib/store'
import { useAuth, useWallet } from '@/context/Providers'
import { today } from '@/components/Extras'

type Bubble = ChatMessage & { locked?: boolean }
const suggestions = ['How was your day?', 'Tell me about yourself', 'What do you like to do?']
const btn = 'min-h-11 rounded-lg border border-line px-3 text-sm'

export default function AiChatPage({ params }: { params: { slug: string } }) {
  const { base, custom, plus, setPlus } = useCharacters()
  const { user, openLogin } = useAuth()
  const { debit } = useWallet()
  const character = [...custom, ...base].find((c) => c.slug === params.slug)
  const [history, setHistory] = useStored<Bubble[]>(`tm_chat_${params.slug}`, [])
  const [usage, setUsage] = useStored('tm_ai_usage', { date: '', count: 0 })
  const [typing, setTyping] = useState(false)
  const [notice, setNotice] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [history, typing])

  if (!character) return <p className="py-20 text-center text-muted">Character not found.</p>
  const used = usage.date === today() ? usage.count : 0
  const left = Math.max(0, FREE_MESSAGES - used)
  const blocked = !plus && left === 0
  const needPlus = character.isPremium && !plus

  const send = async (text: string) => {
    if (!user) return openLogin()
    if (!text.trim() || typing || blocked || needPlus) return
    if (!history.length) track('ai_chat_start', { character: character.slug })
    const next: Bubble[] = [...history, { role: 'user', text: text.trim() }]
    setHistory(next)
    setUsage({ date: today(), count: used + 1 })
    setTyping(true)
    let reply = ''
    for await (const chunk of chatProvider.sendMessage(character.id, next)) {
      reply += chunk
      setHistory([...next, { role: 'character', text: reply }])
    }
    setTyping(false)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-190px)] min-h-[420px] max-w-2xl flex-col">
      <div className="flex items-center gap-3 border-b border-line pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={character.avatar} alt="" className="size-11 rounded-full" />
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold">
            {character.name}, {character.age}
          </h1>
          <p className="flex items-center gap-1 text-xs text-accent">
            <Bot size={14} /> AI character. Replies are generated, not written by a person.
          </p>
        </div>
        <button onClick={() => setHistory([])} aria-label="Reset conversation" title="Reset conversation" className="grid size-11 place-items-center">
          <RotateCcw size={18} />
        </button>
        <button onClick={() => setNotice(`Reported. Reference ${addModeration({ kind: 'report', subject: character.id, detail: 'AI chat reported by member' })}.`)} aria-label="Report chat" title="Report" className="grid size-11 place-items-center">
          <Flag size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-3 text-sm" aria-live="polite">
        {history.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.locked ? (
              <button onClick={() => debit(10, `Unlocked image from ${character.name}`) && setHistory((h) => h.map((x, j) => (j === i ? { ...x, locked: false, text: 'Image unlocked (placeholder).' } : x)))} className="grid aspect-video w-48 place-items-center rounded-2xl border border-dashed border-line bg-surface text-xs text-muted">
                Locked image · unlock for 10 tokens
              </button>
            ) : (
              <p className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.role === 'user' ? 'bg-accent text-white' : 'bg-surface'}`}>{m.text}</p>
            )}
          </div>
        ))}
        {typing && history.at(-1)?.role === 'user' && <p className="text-xs text-muted">{character.name} is typing</p>}
        {notice && (
          <p role="status" className="text-xs text-muted">
            {notice}
          </p>
        )}
        <div ref={end} />
      </div>

      {needPlus || blocked ? (
        <div className="rounded-lg border border-accent p-3 text-sm">
          <p className="font-medium">{needPlus ? 'This character is part of AI Plus.' : `You have used your ${FREE_MESSAGES} free messages for today.`}</p>
          <p className="text-muted">AI Plus: unlimited messages, 10 custom characters, long-term memory and priority replies. Premium members get 30% off.</p>
          {/* Payment provider goes here. */}
          <button onClick={() => (user ? setPlus(true) : openLogin())} className="mt-2 min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">
            Get AI Plus (demo)
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 pb-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="min-h-9 rounded-full border border-line px-3 text-xs">
                {s}
              </button>
            ))}
            <button onClick={() => debit(5, `Voice message from ${character.name}`) && setHistory((h) => [...h, { role: 'character', text: 'Voice message (demo audio placeholder).' }])} className="min-h-9 rounded-full border border-line px-3 text-xs">
              Voice message · 5 tokens
            </button>
            <button onClick={() => setHistory((h) => [...h, { role: 'character', text: '', locked: true }])} className="min-h-9 rounded-full border border-line px-3 text-xs">
              Ask for an image
            </button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const input = e.currentTarget.elements.namedItem('text') as HTMLInputElement
              send(input.value)
              input.value = ''
            }}
          >
            <input name="text" maxLength={500} placeholder="Message" aria-label="Message" className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm" />
            <button disabled={typing} className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50">
              Send
            </button>
          </form>
        </>
      )}
      <p className="pt-2 text-xs text-muted">
        {plus ? 'AI Plus: unlimited messages.' : `${left} of ${FREE_MESSAGES} free messages left today.`}{' '}
        <Link href="/ai" className={`${btn} !min-h-0 border-0 !px-0 underline`}>
          All characters
        </Link>
      </p>
    </div>
  )
}
