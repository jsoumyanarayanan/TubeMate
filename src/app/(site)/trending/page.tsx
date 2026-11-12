// src/app/(site)/trending/page.tsx
import Link from 'next/link'
import { pageMeta } from '@/lib/seo'
import { RisingPerformers } from '@/components/Growth'
import { VideoBrowser } from '@/components/VideoBrowser'

const tabs = [['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly']] as const
export const metadata = pageMeta('Trending videos', 'Trending adult videos today, this week and this month, plus rising performers. 18+.', '/trending')

export default function Page({ searchParams }: { searchParams: { t?: string } }) {
  const trend = tabs.find(([id]) => id === searchParams.t)?.[0] ?? 'week'
  return (
    <>
      <h1 className="mb-3 text-lg font-semibold">Trending</h1>
      <nav aria-label="Period" className="mb-4 flex gap-2">
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/trending?t=${id}`} aria-current={id === trend ? 'page' : undefined} className={`grid min-h-11 place-items-center rounded-full border px-4 text-sm ${id === trend ? 'border-accent bg-accent text-white' : 'border-line'}`}>
            {label}
          </Link>
        ))}
      </nav>
      <RisingPerformers />
      <VideoBrowser key={trend} base={{ trend }} defaultSort="trending" />
    </>
  )
}
