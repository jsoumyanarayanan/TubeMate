// src/app/(site)/ppv/page.tsx
'use client'
import Link from 'next/link'
import bundles from '@/data/bundles.json'
import { VideoBrowser } from '@/components/VideoBrowser'

export default function PpvPage() {
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Pay-per-view</h1>
      <p className="mb-4 text-sm text-muted">Rent for 48 hours at half price, or buy to keep. Your purchases are listed in your account.</p>
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {bundles.map((b) => (
          <Link key={b.id} href={`/bundles/${b.id}`} className="flex min-h-14 items-center justify-between rounded-lg border border-amber-400/50 px-4 text-sm">
            <span className="font-medium">{b.name}</span>
            <span className="text-amber-400">
              {b.videoIds.length} videos · {b.tokens} tokens
            </span>
          </Link>
        ))}
      </div>
      <VideoBrowser base={{ ppv: true }} />
    </>
  )
}
