// src/app/(site)/search/page.tsx
import { SponsoredResult } from '@/components/Ads'
import { MoodSearch } from '@/components/MoodSearch'

export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q ?? ''
  return (
    <>
      <form action="/search" role="search" className="mb-4">
        <label className="sr-only" htmlFor="q">
          Search videos
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search, or describe what you want: something slow and romantic" className="min-h-11 w-full rounded-full border border-line bg-surface px-4" />
      </form>
      <h1 className="mb-4 text-lg font-semibold">{q ? `Results for "${q}"` : 'Search'}</h1>
      <SponsoredResult />
      <MoodSearch q={q} />
    </>
  )
}
