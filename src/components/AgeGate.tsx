// src/components/AgeGate.tsx
'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { hasAgeConsent, storeAgeConsent } from '@/lib/ageVerification'

export function AgeGate({ children }: { children: ReactNode }) {
  // Closed by default so nothing shows before the check runs.
  const [ok, setOk] = useState(false)
  useEffect(() => setOk(hasAgeConsent()), [])

  return (
    <>
      {/* inert removes the page from focus order and from assistive tech while the gate is up */}
      <div {...(ok ? {} : { inert: '' as unknown as undefined })} className={ok ? '' : 'pointer-events-none select-none blur-xl'}>
        {children}
      </div>
      {!ok && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-title"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/90 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 text-center">
            <p className="text-2xl font-bold text-accent">TUBEMATE</p>
            <h1 id="age-title" className="mt-4 text-xl font-semibold">
              Adults only
            </h1>
            <p className="mt-2 text-muted">
              This site contains adult material. You must be 18 or older to enter.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                autoFocus
                onClick={() => {
                  storeAgeConsent()
                  setOk(true)
                }}
                className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white"
              >
                I am 18 or older, enter
              </button>
              <a
                href="https://www.wikipedia.org"
                className="grid min-h-11 place-items-center rounded-lg border border-line px-4 text-muted"
              >
                Leave
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
