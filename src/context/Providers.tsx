// src/context/Providers.tsx
// Mock auth, wallet and paywall kept in localStorage, plus the three shared modals.
'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import basePlans from '@/data/plans.json'
import basePacks from '@/data/tokenPacks.json'
import offersConfig from '@/data/offers.json'
import { canSpend, recordSpend } from '@/lib/lifecycle/spend'
import { formatPrice, currencies, type Currency } from '@/lib/currency'
import { useStored } from '@/lib/store'
import { track } from '@/lib/analytics'
import { applyMood } from '@/lib/mood'
import { record } from '@/lib/reco/events'
import { markHydrated } from '@/lib/reco/useReco'
import { Modal } from '@/components/Modal'

type Account = { name: string; email: string; plan: string | null; renewsAt: string | null; referredBy?: string | null }
export type Tx = { id: string; at: string; type: 'purchase' | 'spend' | 'bonus'; amount: number; reason: string }
type ModalName = 'login' | 'tokens' | 'premium' | null

type Auth = {
  ready: boolean
  user: (Account & { isPremium: boolean }) | null
  login: (email: string) => void
  logout: () => void
  setPlan: (plan: string | null) => void
  deleteAccount: () => void
  openLogin: () => void
}
type Wallet = {
  balance: number
  history: Tx[]
  credit: (amount: number, reason: string, type?: Tx['type']) => void
  debit: (amount: number, reason: string) => boolean
  canAfford: (amount: number) => boolean
  openTopUp: () => void
}
type Paywall = {
  unlocked: string[] // bought forever plus active 48-hour rentals
  rentals: Record<string, number> // video id to expiry time
  rent: (videoId: string, price: number) => boolean
  unlockMany: (videoIds: string[], price: number, reason: string) => boolean
  require: (need: { premium?: boolean; tokens?: number }) => boolean
  unlock: (videoId: string, price: number) => boolean
  openPremium: () => void
}
type Ui = { modal: ModalName; setModal: (m: ModalName) => void; currency: Currency; setCurrency: (c: Currency) => void }

const AuthContext = createContext<Auth | null>(null)
const WalletContext = createContext<Wallet | null>(null)
const PaywallContext = createContext<Paywall | null>(null)
const UiContext = createContext<Ui | null>(null)

function use<T>(ctx: React.Context<T | null>, name: string) {
  const value = useContext(ctx)
  if (!value) throw new Error(`${name} must be used inside <Providers>`)
  return value
}
export const useAuth = () => use(AuthContext, 'useAuth')
export const useWallet = () => use(WalletContext, 'useWallet')
export const usePaywall = () => use(PaywallContext, 'usePaywall')
const useUi = () => use(UiContext, 'useUi')

export function Price({ usd }: { usd: number }) {
  return <>{formatPrice(usd, useUi().currency)}</>
}

export function CurrencySwitch() {
  const { currency, setCurrency } = useUi()
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Currency
      <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="min-h-11 rounded-lg border border-line bg-surface px-3">
        {currencies.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </label>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [account, setAccount] = useStored<Account | null>('tm_account', null)
  const [session, setSession] = useStored('tm_session', false)
  const [wallet, setWallet] = useStored<{ balance: number; history: Tx[] }>('tm_wallet', { balance: 0, history: [] })
  const [bought, setUnlocked] = useStored<string[]>('tm_unlocked', [])
  const [rentals, setRentals] = useStored<Record<string, number>>('tm_rentals', {})
  const [plans] = useStored('tm_db_plans', basePlans)
  const [packs] = useStored('tm_db_packs', basePacks)
  const [pay, setPay] = useState('Card')
  const [currency, setCurrency] = useStored<Currency>('tm_currency', 'USD')
  const [modal, setModal] = useState<ModalName>(null)
  const [limitNote, setLimitNote] = useState('')
  const [starterUsed, setStarterUsed] = useStored('tm_starter_used', false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
    markHydrated()
    applyMood()
    // Referral links carry ?ref=CODE. Keep it until sign-up.
    const ref = new URLSearchParams(location.search).get('ref')
    if (ref)
      try {
        localStorage.setItem('tm_ref', ref)
      } catch {}
  }, [])
  const unlocked = [...bought, ...Object.keys(rentals).filter((id) => rentals[id] > Date.now())]

  const user = session && account ? { ...account, isPremium: !!account.plan } : null

  const credit: Wallet['credit'] = (amount, reason, type = 'purchase') => {
    if (type === 'purchase' && amount > 0) track('token_purchase', { tokens: amount })
    setWallet((w) => ({
      balance: w.balance + amount,
      history: [{ id: crypto.randomUUID(), at: new Date().toISOString(), type, amount, reason }, ...w.history],
    }))
  }
  const debit: Wallet['debit'] = (amount, reason) => {
    if (amount > wallet.balance) {
      setModal('tokens')
      return false
    }
    credit(-amount, reason, 'spend')
    return true
  }

  // Token packs and plans go through the daily spend limit (Account controls) before any credit.
  const buyPack = (usd: number, tokens: number, reason: string, onDone?: () => void) => {
    const blocked = canSpend(usd)
    if (blocked) return setLimitNote(blocked)
    recordSpend(usd)
    credit(tokens, reason)
    onDone?.()
  }
  const starter = offersConfig.starterPack
  const buyStarter = () => buyPack(starter.priceUsd, starter.tokens + starter.bonus, 'Starter pack, first purchase', () => setStarterUsed(true))

  const auth: Auth = {
    ready,
    user,
    // Real authentication plugs in here. The demo accepts any email and password.
    login: (email) => {
      let referredBy: string | null = null
      try {
        referredBy = localStorage.getItem('tm_ref')
      } catch {}
      if (account?.email !== email) track('sign_up', { referredBy })
      setAccount((a) => (a?.email === email ? a : { name: email.split('@')[0], email, plan: null, renewsAt: null, referredBy }))
      setSession(true)
      setModal(null)
    },
    logout: () => setSession(false),
    setPlan: (planId) => {
      const plan = plans.find((p) => p.id === planId)
      const blocked = plan && plan.priceUsd > 0 ? canSpend(plan.priceUsd) : null
      if (blocked) return setLimitNote(blocked)
      if (plan && plan.priceUsd > 0) recordSpend(plan.priceUsd)
      const renewsAt = plan?.days ? new Date(Date.now() + plan.days * 864e5).toISOString() : null
      setAccount((a) => a && { ...a, plan: planId, renewsAt })
      if (plan && plan.priceUsd > 0) track('upgrade', { plan: plan.id })
      if (plan?.bonusTokens) credit(plan.bonusTokens, `${plan.name} plan bonus`, 'bonus')
      setModal(null)
    },
    deleteAccount: () => {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('tm_') && k !== 'tm_age_ok' && k !== 'tm_cookie_choice')
          .forEach((k) => localStorage.removeItem(k))
      } catch {}
      location.href = '/'
    },
    openLogin: () => setModal('login'),
  }
  const walletApi: Wallet = { ...wallet, credit, debit, canAfford: (n) => n <= wallet.balance, openTopUp: () => setModal('tokens') }
  const paywall: Paywall = {
    unlocked,
    rentals,
    rent: (videoId, price) => {
      if (!user) return setModal('login'), false
      if (!debit(price, `Rented video ${videoId} for 48 hours`)) return false
      record('purchase', { video: videoId })
      setRentals((r) => ({ ...r, [videoId]: Date.now() + 48 * 3600e3 }))
      return true
    },
    unlockMany: (ids, price, reason) => {
      if (!user) return setModal('login'), false
      if (!debit(price, reason)) return false
      setUnlocked((u) => [...new Set([...u, ...ids])])
      return true
    },
    require: ({ premium, tokens = 0 }) => {
      const need: ModalName = !user ? 'login' : premium && !user.isPremium ? 'premium' : tokens > wallet.balance ? 'tokens' : null
      if (need) setModal(need)
      return !need
    },
    unlock: (videoId, price) => {
      if (!user) return setModal('login'), false
      if (!debit(price, `Unlocked pay-per-view video ${videoId}`)) return false
      record('purchase', { video: videoId })
      setUnlocked((u) => [...u, videoId])
      return true
    },
    openPremium: () => setModal(user ? 'premium' : 'login'),
  }

  const close = () => (setModal(null), setLimitNote(''))
  const limitBox = limitNote && <p role="alert" className="mb-3 rounded-lg border border-accent p-3 text-sm">{limitNote}</p>
  const row = 'flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-line px-4 text-left hover:border-accent'
  // Payment provider goes here. Every purchase below is a mock and takes no money.
  const demoNote = (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Payment method">
        {['Card', 'Wallet', 'Crypto'].map((m) => (
          <button key={m} onClick={() => setPay(m)} aria-pressed={pay === m} className={`min-h-11 rounded-lg border text-sm ${pay === m ? 'border-accent text-accent' : 'border-line'}`}>
            {m}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Demo checkout. No payment is taken.</p>
    </>
  )

  return (
    <UiContext.Provider value={{ modal, setModal, currency, setCurrency }}>
      <AuthContext.Provider value={auth}>
        <WalletContext.Provider value={walletApi}>
          <PaywallContext.Provider value={paywall}>
            {children}

            {modal === 'login' && (
              <Modal title="Log in or sign up" onClose={close}>
                <form
                  className="grid gap-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    auth.login(new FormData(e.currentTarget).get('email') as string)
                  }}
                >
                  <input name="email" type="email" required placeholder="Email" aria-label="Email" className="min-h-11 rounded-lg border border-line bg-ink px-3" />
                  <input name="password" type="password" required placeholder="Password" aria-label="Password" className="min-h-11 rounded-lg border border-line bg-ink px-3" />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" required className="size-4 accent-accent" /> I confirm I am 18 or older
                  </label>
                  <button className="min-h-11 rounded-lg bg-accent font-semibold text-white">Continue</button>
                  <p className="text-xs text-muted">Demo login. Any email and password work.</p>
                </form>
              </Modal>
            )}

            {modal === 'tokens' && (
              <Modal title="Buy tokens" onClose={close}>
                <p className="mb-3 text-sm text-muted">Balance: {wallet.balance} tokens</p>
                {limitBox}
                <div className="grid gap-2">
                  {!starterUsed && (
                    <button className={`${row} border-accent`} onClick={buyStarter}>
                      <span>
                        Starter pack: {starter.tokens} tokens <span className="block text-xs text-accent">+{starter.bonus} bonus, first purchase only</span>
                      </span>
                      <span className="font-semibold">
                        <Price usd={starter.priceUsd} />
                      </span>
                    </button>
                  )}
                  {packs.map((p) => (
                    <button key={p.id} className={row} onClick={() => buyPack(p.priceUsd, p.tokens + p.bonus, `Bought ${p.tokens} token pack`)}>
                      <span>
                        {p.tokens} tokens {p.bonus > 0 && <span className="text-accent">+{p.bonus} bonus</span>}
                      </span>
                      <span className="font-semibold">
                        <Price usd={p.priceUsd} />
                      </span>
                    </button>
                  ))}
                </div>
                {demoNote}
              </Modal>
            )}

            {modal === 'premium' && (
              <Modal title="Go Premium" onClose={close}>
                <p className="mb-3 text-sm text-muted">No ads, HD and 4K, downloads and premium-only videos. Cancel anytime.</p>
                {limitBox}
                <div className="grid gap-2">
                  {plans.slice(1).map((p) => (
                    <button key={p.id} className={row} onClick={() => auth.setPlan(p.id)}>
                      <span>
                        {p.name} <span className="block text-xs text-muted">{p.note}</span>
                      </span>
                      <span className="text-right font-semibold">
                        <Price usd={p.priceUsd} /> <span className="block text-xs font-normal text-muted">{p.period}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {demoNote}
              </Modal>
            )}
          </PaywallContext.Provider>
        </WalletContext.Provider>
      </AuthContext.Provider>
    </UiContext.Provider>
  )
}
