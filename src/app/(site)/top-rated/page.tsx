// src/app/(site)/top-rated/page.tsx
import { pageMeta } from '@/lib/seo'
import { VideoBrowser } from '@/components/VideoBrowser'

export const metadata = pageMeta('Top rated videos', 'The best rated adult videos, as voted by members. 18+.', '/top-rated')

export default function Page() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">Top Rated</h1>
      <VideoBrowser defaultSort="rating" />
    </>
  )
}
