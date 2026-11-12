// src/app/(site)/page.tsx
import { pageMeta } from '@/lib/seo'
import { Home } from '@/components/Home'

export const metadata = pageMeta('Adult videos, live rooms and calls for 18+', 'Free and premium adult videos in HD and 4K, live rooms, paid calls and AI characters. Verified adult performers only. 18+.', '/')

export default function HomePage() {
  return <Home />
}
