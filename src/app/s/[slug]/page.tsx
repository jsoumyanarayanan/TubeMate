// src/app/s/[slug]/page.tsx
// Safe-for-work share page. Social platforms reject explicit previews, so this page shows
// a blurred poster and a neutral title only. The Watch button leads to the age-gated site
// and carries the sharer's referral code.
import type { Metadata } from 'next'
import Link from 'next/link'
import { getVideo } from '@/lib/api'
import { duration } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Shared video',
  description: 'A video was shared with you. Adults only (18+).',
  robots: { index: false, follow: false },
}

export default async function SharePage({ params, searchParams }: { params: { slug: string }; searchParams: { ref?: string } }) {
  const video = await getVideo(params.slug)
  const ref = /^[A-Z0-9]{1,8}$/.test(searchParams.ref ?? '') ? searchParams.ref : ''
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-5 text-center">
        <p className="text-xl font-bold text-accent">TUBEMATE</p>
        <div className="relative mt-4 aspect-video overflow-hidden rounded-lg bg-ink">
          <div className="absolute inset-0 scale-125 bg-cover bg-center blur-2xl" style={{ backgroundImage: `url(${video?.thumb ?? '/placeholder/thumb.svg'})` }} />
          <span className="absolute inset-0 grid place-items-center text-3xl font-bold">18+</span>
        </div>
        <h1 className="mt-4 text-lg font-semibold">A video was shared with you</h1>
        <p className="mt-1 text-sm text-muted">
          {video ? `${duration(video.durationSec)} · ${video.quality} · ` : ''}Adult material. You must be 18 or older to watch.
        </p>
        <Link href={`/video/${params.slug}${ref ? `?ref=${ref}` : ''}`} className="mt-5 grid min-h-11 place-items-center rounded-lg bg-accent px-4 font-semibold text-white">
          I am 18 or older, watch
        </Link>
        <a href="https://www.wikipedia.org" className="mt-2 grid min-h-11 place-items-center rounded-lg border border-line px-4 text-muted">
          Leave
        </a>
      </div>
    </main>
  )
}
