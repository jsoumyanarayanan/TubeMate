// src/app/(site)/new/page.tsx
import { pageMeta } from '@/lib/seo'
import { VideoBrowser } from '@/components/VideoBrowser'

export const metadata = pageMeta('New videos', 'The newest adult videos, updated daily. 18+.', '/new')

export default function Page() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">New</h1>
      <VideoBrowser defaultSort="newest" />
    </>
  )
}
