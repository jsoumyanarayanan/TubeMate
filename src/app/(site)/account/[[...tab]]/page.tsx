// src/app/(site)/account/[[...tab]]/page.tsx
// All account screens in one route: /account, /account/favourites, /account/history,
// /account/playlists, /account/following, /account/subscription.
'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import basePlans from '@/data/plans.json'
import { videosByIds } from '@/lib/api'
import { dbGet } from '@/lib/db'
import { refCode } from '@/lib/growth'
import { FeedSettings } from '@/components/Reco'
import { useStored, type Playlist } from '@/lib/store'
import { Price, useAuth, usePaywall } from '@/context/Providers'
import { PerformerCard, VideoGrid, gridCols } from '@/components/VideoCard'

// Call code loads only when the Calls tab is opened.
const AccountCalls = dynamic(() => import('@/components/Calls').then((m) => m.AccountCalls))
const tabs = ['profile', 'favourites', 'history', 'playlists', 'following', 'purchases', 'calls', 'subscription', 'feed'] as const
const btn = 'min-h-11 rounded-lg border border-line px-4 text-sm'
const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'
const byIds = videosByIds
const empty = (text: string) => <p className="py-10 text-center text-sm text-muted">{text}</p>

export default function AccountPage({ params }: { params: { tab?: string[] } }) {
  const tab = (params.tab?.[0] ?? 'profile') as (typeof tabs)[number]
  const { ready, user, openLogin, logout, setPlan, deleteAccount } = useAuth()
  const { openPremium, unlocked } = usePaywall()
  const [plans] = useStored('tm_db_plans', basePlans)
  const performers = dbGet('performers')
  const [favourites] = useStored<string[]>('tm_favourites', [])
  const [history, setHistory] = useStored<string[]>('tm_history', [])
  const [following] = useStored<string[]>('tm_following', [])
  const [playlists, setPlaylists] = useStored<Playlist[]>('tm_playlists', [])
  const [emails, setEmails] = useStored('tm_email_prefs', { news: false, offers: false })
  const [confirm, setConfirm] = useState<'delete' | 'cancel' | 'offer' | null>(null)
  const [notice, setNotice] = useState('')

  if (!ready) return null
  // Feed settings work without an account, because a guest's profile lives on this device.
  if (tab === 'feed' && !user) return <FeedSettings />
  if (!user)
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <h1 className="text-lg font-semibold">Your account</h1>
        <p className="text-sm text-muted">Log in to see your favourites, history and subscription.</p>
        <button onClick={openLogin} className={primary}>
          Log in or sign up
        </button>
      </div>
    )

  const plan = plans.find((p) => p.id === user.plan) ?? plans[0]
  const move = (i: number, by: number) =>
    setPlaylists((all) => {
      const next = [...all]
      ;[next[i], next[i + by]] = [next[i + by], next[i]]
      return next
    })

  return (
    <>
      <h1 className="mb-3 text-lg font-semibold">Account</h1>
      <nav aria-label="Account" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t}
            href={t === 'profile' ? '/account' : `/account/${t}`}
            aria-current={t === tab ? 'page' : undefined}
            className={`flex min-h-11 items-center px-3 text-sm capitalize ${t === tab ? 'border-b-2 border-accent text-fg' : 'text-muted'}`}
          >
            {t}
          </Link>
        ))}
      </nav>
      {notice && (
        <p role="status" className="mb-3 text-sm text-muted">
          {notice}
        </p>
      )}

      {tab === 'profile' && (
        <div className="grid max-w-xl gap-4 text-sm">
          <div className="rounded-lg bg-surface p-4">
            <p className="font-medium">{user.name}</p>
            <p className="text-muted">{user.email}</p>
          </div>
          <fieldset className="rounded-lg bg-surface p-4">
            <legend className="font-medium">Email preferences</legend>
            {(['news', 'offers'] as const).map((k) => (
              <label key={k} className="flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={emails[k]} onChange={(e) => setEmails((p) => ({ ...p, [k]: e.target.checked }))} className="size-4 accent-accent" />
                {k === 'news' ? 'New videos from performers I follow' : 'Offers and discounts'}
              </label>
            ))}
          </fieldset>
          <p className="rounded-lg bg-surface p-4 text-muted">Discreet billing: charges appear under a neutral name on your statement, never the site name.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={logout} className={btn}>
              Log out
            </button>
            <button onClick={() => setConfirm('delete')} className={`${btn} text-accent`}>
              Delete account
            </button>
          </div>
          {confirm === 'delete' && (
            <div className="rounded-lg border border-accent p-4">
              <p>This removes your account, wallet, history and playlists from this device. It cannot be undone.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={deleteAccount} className={primary}>
                  Delete everything
                </button>
                <button onClick={() => setConfirm(null)} className={btn}>
                  Keep my account
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'favourites' && (favourites.length ? <VideoGrid videos={byIds(favourites)} ads={false} /> : empty('No favourites yet. Tap Favourite under any video.'))}

      {tab === 'history' &&
        (history.length ? (
          <>
            <button onClick={() => setHistory([])} className={`${btn} mb-4`}>
              Clear history
            </button>
            <VideoGrid videos={byIds(history)} ads={false} />
          </>
        ) : (
          empty('Nothing watched yet.')
        ))}

      {tab === 'following' &&
        (following.length ? (
          <div className={gridCols}>
            {performers.filter((p) => following.includes(p.id)).map((p) => (
              <PerformerCard key={p.id} performer={p} />
            ))}
          </div>
        ) : (
          empty('You are not following anyone yet.')
        ))}

      {tab === 'purchases' && (unlocked.length ? <VideoGrid videos={byIds(unlocked)} ads={false} /> : empty('No purchases yet. Pay-per-view videos and bundles you buy or rent appear here.'))}

      {tab === 'calls' && <AccountCalls />}
      {tab === 'feed' && <FeedSettings />}

      {tab === 'playlists' && (
        <div className="grid gap-4">
          <form
            className="flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement
              if (!input.value.trim()) return
              setPlaylists((all) => [...all, { id: crypto.randomUUID(), name: input.value.trim(), videoIds: [] }])
              input.value = ''
            }}
          >
            <input name="name" placeholder="New playlist name" aria-label="New playlist name" className="min-h-11 flex-1 rounded-lg border border-line bg-surface px-3" />
            <button className={primary}>Create</button>
          </form>
          {playlists.length === 0 && empty('No playlists yet. "Add to playlist" under a video saves it to your first playlist.')}
          {playlists.map((p, i) => (
            <section key={p.id} className="rounded-lg bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  value={p.name}
                  aria-label="Playlist name"
                  onChange={(e) => setPlaylists((all) => all.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 font-medium"
                />
                <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="grid size-11 place-items-center disabled:opacity-30">
                  <ArrowUp size={18} />
                </button>
                <button disabled={i === playlists.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="grid size-11 place-items-center disabled:opacity-30">
                  <ArrowDown size={18} />
                </button>
                <button
                  onClick={() => navigator.clipboard?.writeText(`${location.origin}/playlist/${p.id}?n=${encodeURIComponent(p.name)}&v=${p.videoIds.join(',')}&ref=${refCode(user.name)}`).then(() => setNotice('Playlist link copied'), () => setNotice('Copy failed'))}
                  className={btn}
                >
                  Copy share link
                </button>
                <button onClick={() => setPlaylists((all) => all.filter((x) => x.id !== p.id))} aria-label="Delete playlist" className="grid size-11 place-items-center">
                  <Trash2 size={18} />
                </button>
              </div>
              {p.videoIds.length ? <VideoGrid videos={byIds(p.videoIds)} ads={false} /> : <p className="text-sm text-muted">Empty playlist.</p>}
            </section>
          ))}
        </div>
      )}

      {tab === 'subscription' && (
        <div className="grid max-w-xl gap-4 text-sm">
          <div className="rounded-lg bg-surface p-4">
            <p className="text-muted">Current plan</p>
            <p className="text-lg font-semibold">{plan.name}</p>
            {user.isPremium && (
              <p className="text-muted">
                <Price usd={plan.priceUsd} /> {plan.period}. {user.renewsAt ? `Renews on ${user.renewsAt.slice(0, 10)}.` : 'Never renews.'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={openPremium} className={primary}>
              {user.isPremium ? 'Switch plan' : 'Go Premium'}
            </button>
            {user.isPremium && (
              <button onClick={() => setConfirm('offer')} className={btn}>
                Cancel subscription
              </button>
            )}
          </div>
          {confirm === 'offer' && (
            <div className="rounded-lg border border-line p-4">
              <p className="font-medium">Before you go: stay for half price for 3 months?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setConfirm(null)
                    setNotice('Offer applied. Your next 3 months are half price.')
                  }}
                  className={primary}
                >
                  Accept offer
                </button>
                <button
                  onClick={() => {
                    setPlan(null)
                    setConfirm(null)
                    setNotice('Subscription cancelled. You are on the Free plan.')
                  }}
                  className={btn}
                >
                  Cancel anyway
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
