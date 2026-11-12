// src/app/(site)/foryou/page.tsx
import { pageMeta } from '@/lib/seo'
import { Feed } from '@/components/Feed'

export const metadata = pageMeta('For You', 'A swipe feed of short teasers picked for you. Adults only (18+).', '/foryou')

export default function ForYouPage() {
  return (
    <>
      <h1 className="sr-only">For You</h1>
      <Feed />
    </>
  )
}
