// src/components/Discreet.tsx
// Discreet mode: neutral tab title and icon, thumbnails blurred until tapped, an option to
// keep no history, and a quick exit (press Esc twice) that works on every page.
'use client'
import { useEffect, useState } from 'react'
import { EyeOff } from 'lucide-react'
import { isDiscreet, noHistory, setPref } from '@/lib/prefs'

const NEUTRAL_PAGE = 'https://www.wikipedia.org'
const NEUTRAL_TITLE = 'Notes'
const NEUTRAL_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%23c8c8d0'/%3E%3C/svg%3E"
// replace() keeps this site out of the back button.
export const quickExit = () => location.replace(NEUTRAL_PAGE)

// Mounted in the root layout so it runs on every page, including admin, share and embed pages.
export function QuickExit() {
  useEffect(() => {
    let last = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (Date.now() - last < 600) quickExit()
      last = Date.now()
    }
    // The real title is kept so it can be restored when discreet mode is turned off.
    let real = document.title
    const apply = () => {
      const on = isDiscreet()
      document.documentElement.classList.toggle('discreet', on)
      if (document.title !== NEUTRAL_TITLE) real = document.title
      if (on && document.title !== NEUTRAL_TITLE) document.title = NEUTRAL_TITLE
      if (!on && document.title === NEUTRAL_TITLE) document.title = real
      const icon = document.getElementById('tm-icon')
      if (on && !icon) document.head.append(Object.assign(document.createElement('link'), { id: 'tm-icon', rel: 'icon', href: NEUTRAL_ICON }))
      if (!on) icon?.remove()
    }
    apply()
    // Next.js rewrites the title on every navigation, so watch the head and re-apply.
    const watcher = new MutationObserver(apply)
    watcher.observe(document.head, { childList: true, subtree: true, characterData: true })
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('tm:prefs', apply)
    return () => {
      watcher.disconnect()
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('tm:prefs', apply)
    }
  }, [])
  return null
}

// Header menu with the privacy switches and a quick-exit button for touch screens.
export function PrivacyMenu() {
  const [open, setOpen] = useState(false)
  const [, refresh] = useState(0)
  const row = (key: 'tm_discreet' | 'tm_no_history', on: boolean, label: string, hint: string) => (
    <label className="flex min-h-11 items-start gap-2 py-1">
      <input type="checkbox" checked={on} onChange={(e) => (setPref(key, e.target.checked), refresh((n) => n + 1))} className="mt-1 size-4 accent-accent" />
      <span>
        {label}
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  )
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 items-center gap-2 rounded px-3 text-sm text-muted hover:text-fg">
        <EyeOff size={16} aria-hidden /> Privacy
      </button>
      {open && (
        <div className="z-50 rounded-lg border border-line bg-surface p-3 text-sm md:absolute md:right-0 md:top-full md:w-72 md:shadow-lg">
          {row('tm_discreet', isDiscreet(), 'Discreet mode', 'Neutral tab title and icon. Thumbnails stay blurred until you tap them.')}
          {row('tm_no_history', noHistory(), 'Keep no history', 'No watch history, resume points or feed learning on this device.')}
          <button onClick={quickExit} className="mt-2 min-h-11 w-full rounded-lg border border-line">
            Quick exit
          </button>
          <p className="mt-2 text-xs text-muted">Or press Esc twice on any page.</p>
        </div>
      )}
    </div>
  )
}
