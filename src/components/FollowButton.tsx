// src/components/FollowButton.tsx
'use client'
import { record } from '@/lib/reco/events'
import { toggle, useStored } from '@/lib/store'

export function FollowButton({ performerId }: { performerId: string }) {
  const [following, setFollowing] = useStored<string[]>('tm_following', [])
  const on = following.includes(performerId)
  return (
    <button
      onClick={() => (on || record('follow', { performer: performerId }), setFollowing((f) => toggle(f, performerId)))}
      aria-pressed={on}
      className={`min-h-11 rounded-full px-5 text-sm font-semibold ${on ? 'border border-line' : 'bg-accent text-white'}`}
    >
      {on ? 'Following' : 'Follow'}
    </button>
  )
}
