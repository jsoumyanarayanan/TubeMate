// src/components/Stage.tsx
// Home modules that change with the member's stage (new, casual, regular, payer, lapsed).
// The rows and the next-step card come from /src/data/offers.json.
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getVideos, type Video, type VideoQuery } from '@/lib/api'
import { useAuth, usePaywall, useWallet } from '@/context/Providers'
import config from '@/data/offers.json'
import { getStage, nextStep, type Stage } from '@/lib/lifecycle/stage'
import { VideoCard } from '@/components/VideoCard'

type Step = { id: string; title: string; body: string; cta: string; action?: string; href?: string }
const btn = 'inline-grid min-h-11 place-items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white'

export function StageRows({ scroller, tile }: { scroller: string; tile: string }) {
  const { user, openLogin } = useAuth()
  const paywall = usePaywall()
  const wallet = useWallet()
  const purchased = wallet.history.some((t) => t.type === 'purchase')
  const [stage, setStage] = useState<Stage | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [loaded, setLoaded] = useState(false)

  // Read storage only after mount, so the server and client render the same markup.
  useEffect(() => {
    const s = getStage(purchased)
    setStage(s)
    getVideos({ ...(config.stageModules[s].query as VideoQuery), pageSize: 8 }).then((r) => (setVideos(r.items), setLoaded(true)))
  }, [purchased])

  // Until the data is in, reserve the same space so the rows below do not jump.
  if (!stage || !loaded)
    return (
      <>
        <div aria-hidden="true" className="grid gap-3">
          <div className="h-6 w-56 rounded bg-line" />
          <div className={scroller}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={tile}>
                <div className="aspect-video rounded bg-line" />
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="min-h-[104px]" />
      </>
    )
  const step = nextStep({ account: !!user, purchased, premium: !!user?.isPremium }) as Step | null
  const act = () => {
    if (!step) return
    if (step.action === 'login') openLogin()
    else if (step.action === 'tokens') wallet.openTopUp()
    else if (step.action === 'premium') paywall.openPremium()
  }

  return (
    <>
      {videos.length > 0 && (
        <section aria-labelledby="row-stage">
          <h2 id="row-stage" className="mb-3 text-lg font-semibold">
            {config.stageModules[stage].title}
          </h2>
          <div className={scroller}>
            {videos.map((v) => (
              <div key={v.id} className={tile}>
                <VideoCard video={v} />
              </div>
            ))}
          </div>
        </section>
      )}
      {step && (
        <section aria-label="Next step" className="flex min-h-[104px] flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{step.title}</p>
            <p className="text-sm text-muted">{step.body}</p>
          </div>
          {step.href ? (
            <Link href={step.href} className={btn}>
              {step.cta}
            </Link>
          ) : (
            <button onClick={act} className={btn}>
              {step.cta}
            </button>
          )}
        </section>
      )}
    </>
  )
}
