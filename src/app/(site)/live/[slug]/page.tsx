// src/app/(site)/live/[slug]/page.tsx
import dynamic from 'next/dynamic'
import { SkeletonGrid } from '@/components/Shell'

// Room and chat code loads only here.
const Room = dynamic(() => import('@/components/Room').then((m) => m.Room), { loading: () => <SkeletonGrid count={4} /> })

export default function RoomPage({ params }: { params: { slug: string } }) {
  return <Room slug={params.slug} />
}
