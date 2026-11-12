// src/components/CookieBanner.tsx
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const KEY = 'tm_cookie_choice'

export function CookieBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => setShow(!localStorage.getItem(KEY)), [])
  if (!show) return null

  const choose = (choice: 'all' | 'essential') => {
    localStorage.setItem(KEY, choice)
    setShow(false)
  }
  return (
    <div role="region" aria-label="Cookies" className="fixed inset-x-2 bottom-16 z-40 mx-auto max-w-2xl rounded-xl border border-line bg-surface p-4 text-sm md:bottom-4">
      <p className="text-muted">
        We use essential cookies to run the site, and optional ones to remember your settings.{' '}
        <Link href="/privacy" className="text-fg underline">
          Privacy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => choose('all')} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">
          Accept all
        </button>
        <button onClick={() => choose('essential')} className="min-h-11 rounded-lg border border-line px-4">
          Essential only
        </button>
      </div>
    </div>
  )
}
