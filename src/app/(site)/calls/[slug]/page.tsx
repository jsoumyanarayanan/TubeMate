// src/app/(site)/calls/[slug]/page.tsx
import dynamic from 'next/dynamic'
import { SkeletonGrid } from '@/components/Shell'

// Call code loads only here.
const CallFlow = dynamic(() => import('@/components/Calls').then((m) => m.CallFlow), { loading: () => <SkeletonGrid count={4} /> })

export default function CallPage({ params }: { params: { slug: string } }) {
  return <CallFlow slug={params.slug} />
}
