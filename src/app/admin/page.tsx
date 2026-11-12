// src/app/admin/page.tsx
// Owner's admin area. The only place content is added. Changes are saved in the browser through
// /src/lib/db.ts until a real API replaces it. The login is a mock: the password is "admin".
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import basePlans from '@/data/plans.json'
import basePacks from '@/data/tokenPacks.json'
import baseCommission from '@/data/commission.json'
import { dbGet, dbSet, type ModerationItem, type Performer, type Video } from '@/lib/db'
import { useStored } from '@/lib/store'

const tabs = ['dashboard', 'videos', 'import', 'performers', 'taxonomy', 'monetisation', 'moderation'] as const
type Tab = (typeof tabs)[number]
const field = 'min-h-11 rounded-lg border border-line bg-ink px-3 text-sm'
const btn = 'min-h-11 rounded-lg border border-line px-4 text-sm'
const primary = 'min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white'
const th = 'py-2 pr-3 text-left font-medium text-muted'
const td = 'border-t border-line py-2 pr-3'

// Table state that reads and writes the mock database.
function useTable<K extends 'videos' | 'performers' | 'categories' | 'ads' | 'moderation'>(name: K) {
  const [rows, setRows] = useState(() => dbGet(name))
  useEffect(() => setRows(dbGet(name)), [name])
  const save = (next: ReturnType<typeof dbGet<K>>) => {
    dbSet(name, next)
    setRows(next)
  }
  return [rows, save] as const
}

function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => `"${String(Array.isArray(v) ? v.join('|') : v ?? '').replace(/"/g, '""')}"`
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `${name}.csv`
  a.click()
}

const blank = (): Video => ({ id: `v${Date.now().toString(36)}`, slug: '', title: '', src: '', thumb: '/placeholder/thumb.svg', durationSec: 600, views: 0, ratingPct: 0, uploadedAt: new Date().toISOString().slice(0, 10), quality: 'HD', isPremium: false, ppvPrice: null, categorySlug: 'category-01', tags: [], performerIds: [], published: false })

// The publishing rule: every linked performer needs age and consent records on file.
function publishError(v: Video, performers: Performer[]) {
  if (v.published === false) return ''
  if (!v.performerIds.length) return 'Link at least one performer before publishing.'
  const missing = v.performerIds.map((id) => performers.find((p) => p.id === id)).filter((p) => !p || !p.recordsOnFile)
  return missing.length ? `Cannot publish: no age and consent records on file for ${missing.map((p) => p?.name ?? 'unknown performer').join(', ')}.` : ''
}

function parseRows(text: string): Record<string, string>[] {
  const t = text.trim()
  if (t.startsWith('[')) return JSON.parse(t)
  const [head, ...lines] = t.split(/\r?\n/).filter(Boolean)
  const cols = head.split(',').map((c) => c.trim())
  return lines.map((line) => Object.fromEntries(line.split(',').map((v, i) => [cols[i], v.trim()])))
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [videos, saveVideos] = useTable('videos')
  const [performers, savePerformers] = useTable('performers')
  const [categories, saveCategories] = useTable('categories')
  const [ads, saveAds] = useTable('ads')
  const [queue, saveQueue] = useTable('moderation')
  const [plans, setPlans] = useStored('tm_db_plans', basePlans)
  const [packs, setPacks] = useStored('tm_db_packs', basePacks)
  const [commission, setCommission] = useStored('tm_db_commission', baseCommission)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ key: keyof Video; dir: 1 | -1 }>({ key: 'uploadedAt', dir: -1 })
  const [edit, setEdit] = useState<Video | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [raw, setRaw] = useState('')
  const [preview, setPreview] = useState<{ row: Video; error: string }[]>([])

  useEffect(() => {
    try {
      setAuthed(sessionStorage.getItem('tm_admin') === '1')
    } catch {}
  }, [])

  if (!authed)
    return (
      <form
        className="mx-auto mt-24 grid max-w-sm gap-3 rounded-xl border border-line bg-surface p-6 text-sm"
        onSubmit={(e) => {
          e.preventDefault()
          if ((new FormData(e.currentTarget).get('password') as string) !== 'admin') return setError('Wrong password.')
          try {
            sessionStorage.setItem('tm_admin', '1')
          } catch {}
          setAuthed(true)
          setError('')
        }}
      >
        <h1 className="text-lg font-semibold">Admin sign in</h1>
        <input name="password" type="password" required placeholder="Password" aria-label="Password" className={field} />
        {error && <p role="alert" className="text-accent">{error}</p>}
        <button className={primary}>Sign in</button>
        <p className="text-xs text-muted">Mock login. The demo password is admin. Real admin authentication goes here.</p>
      </form>
    )

  const shown = videos
    .filter((v) => !q || `${v.title} ${v.slug} ${v.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir
    })
  const head = (key: keyof Video, label: string) => (
    <th className={th}>
      <button onClick={() => setSort({ key, dir: sort.key === key && sort.dir === 1 ? -1 : 1 })} className="min-h-11">
        {label} {sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}
      </button>
    </th>
  )
  const saveVideo = () => {
    if (!edit) return
    const problem = !edit.title.trim() || !edit.slug.trim() || !edit.src.trim() ? 'Title, slug and video URL are required.' : videos.some((v) => v.slug === edit.slug && v.id !== edit.id) ? 'That slug is already used.' : publishError(edit, performers)
    if (problem) return setError(problem)
    saveVideos(videos.some((v) => v.id === edit.id) ? videos.map((v) => (v.id === edit.id ? edit : v)) : [edit, ...videos])
    setEdit(null)
    setError('')
    setNotice(`Saved "${edit.title}".`)
  }
  const check = () => {
    try {
      const seen = new Set(videos.map((v) => v.slug))
      setPreview(
        parseRows(raw).map((r, i) => {
          const row: Video = { ...blank(), id: `v${Date.now().toString(36)}${i}`, ...r, durationSec: Number(r.durationSec), ppvPrice: r.ppvPrice ? Number(r.ppvPrice) : null, isPremium: String(r.isPremium) === 'true', tags: Array.isArray(r.tags) ? r.tags : String(r.tags ?? '').split('|').filter(Boolean), performerIds: Array.isArray(r.performerIds) ? r.performerIds : String(r.performerIds ?? '').split('|').filter(Boolean), published: String(r.published ?? 'true') !== 'false' }
          const error = !row.title || !row.slug || !row.src ? 'Missing title, slug or src' : seen.has(row.slug) ? 'Duplicate slug' : !(row.durationSec > 0) ? 'durationSec must be a number' : !categories.some((c) => c.slug === row.categorySlug) ? 'Unknown category' : publishError(row, performers)
          seen.add(row.slug)
          return { row, error }
        }),
      )
      setError('')
    } catch {
      setError('Could not read that. Paste a JSON array or CSV with a header row.')
    }
  }
  const tags = [...new Set(videos.flatMap((v) => v.tags))].sort()
  const bars = (title: string, data: [string, number][]) => {
    const max = Math.max(...data.map((d) => d[1]))
    return (
      <section className="rounded-lg bg-surface p-4">
        <h2 className="mb-3 font-semibold">{title}</h2>
        {data.map(([label, n]) => (
          <div key={label} className="mb-2 grid grid-cols-[130px_minmax(0,1fr)_60px] items-center gap-2 text-xs">
            <span className="truncate text-muted">{label}</span>
            <div className="h-3 rounded bg-line">
              <div className="h-full rounded bg-accent" style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums">{n.toLocaleString('en')}</span>
          </div>
        ))}
      </section>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-4 text-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          <span className="text-accent">TUBEMATE</span> admin
        </h1>
        <span className="flex gap-4">
          <Link href="/admin/growth" className="text-accent underline">
            Owner metrics
          </Link>{' '}
          <Link href="/admin/reco" className="text-accent underline">
            Reco debug
          </Link>
          <Link href="/" className="text-accent underline">
            View site
          </Link>
        </span>
      </div>
      <nav aria-label="Admin" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button key={t} onClick={() => (setTab(t), setNotice(''), setError(''))} aria-current={t === tab ? 'page' : undefined} className={`min-h-11 px-3 capitalize ${t === tab ? 'border-b-2 border-accent' : 'text-muted'}`}>
            {t}
            {t === 'moderation' && queue.some((i) => i.status === 'open') && <span className="ml-1 rounded-full bg-accent px-1.5 text-[11px] text-white">{queue.filter((i) => i.status === 'open').length}</span>}
          </button>
        ))}
      </nav>
      {notice && <p role="status" className="mb-3 rounded-lg bg-surface p-3">{notice}</p>}
      {error && !edit && <p role="alert" className="mb-3 text-accent">{error}</p>}

      {tab === 'dashboard' && (
        <div className="grid gap-4 md:grid-cols-2">
          <p className="text-xs text-muted md:col-span-2">Mock figures for layout only.</p>
          {bars('Revenue by stream (USD, 30 days)', [['Premium', 48200], ['Tokens and tips', 31500], ['Calls', 18900], ['Ads', 12400], ['AI characters', 9800], ['Pay-per-view', 6100]])}
          {bars('New sign-ups by week', [['Week 1', 1240], ['Week 2', 1410], ['Week 3', 1380], ['Week 4', 1620]])}
          {bars('Premium conversions by week', [['Week 1', 96], ['Week 2', 118], ['Week 3', 109], ['Week 4', 141]])}
          {bars('Top videos by views', [...videos].sort((a, b) => b.views - a.views).slice(0, 5).map((v) => [v.title, v.views]))}
          {bars('Top performers by followers', [...performers].sort((a, b) => b.followers - a.followers).slice(0, 5).map((p) => [p.name, p.followers]))}
        </div>
      )}

      {tab === 'videos' && !edit && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, slug or tag" aria-label="Search videos" className={`${field} min-w-0 flex-1`} />
            <button onClick={() => (setEdit(blank()), setError(''))} className={primary}>
              Add video
            </button>
            <button onClick={() => exportCsv('videos', shown)} className={btn}>
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {head('title', 'Title')}
                  {head('categorySlug', 'Category')}
                  {head('views', 'Views')}
                  {head('uploadedAt', 'Added')}
                  <th className={th}>Status</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 50).map((v) => (
                  <tr key={v.id}>
                    <td className={td}>{v.title}</td>
                    <td className={td}>{v.categorySlug}</td>
                    <td className={`${td} tabular-nums`}>{v.views.toLocaleString('en')}</td>
                    <td className={td}>{v.uploadedAt}</td>
                    <td className={td}>{v.published === false ? <span className="text-amber-400">Unpublished</span> : 'Published'}</td>
                    <td className={td}>
                      <button onClick={() => (setEdit(v), setError(''))} className="min-h-11 text-accent underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            Showing {Math.min(50, shown.length)} of {shown.length}.
          </p>
        </>
      )}

      {tab === 'videos' && edit && (
        <div className="grid max-w-2xl gap-3">
          <h2 className="font-semibold">{videos.some((v) => v.id === edit.id) ? 'Edit video' : 'Add video'}</h2>
          {([['title', 'Title'], ['slug', 'Slug'], ['src', 'Video URL'], ['thumb', 'Thumbnail URL']] as const).map(([k, label]) => (
            <label key={k} className="grid gap-1">
              {label}
              <input value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} className={field} />
            </label>
          ))}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="grid gap-1">
              Duration (seconds)
              <input type="number" value={edit.durationSec} onChange={(e) => setEdit({ ...edit, durationSec: Number(e.target.value) })} className={field} />
            </label>
            <label className="grid gap-1">
              Quality
              <select value={edit.quality} onChange={(e) => setEdit({ ...edit, quality: e.target.value })} className={field}>
                <option>HD</option>
                <option>4K</option>
              </select>
            </label>
            <label className="grid gap-1">
              Category
              <select value={edit.categorySlug} onChange={(e) => setEdit({ ...edit, categorySlug: e.target.value })} className={field}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              Pay-per-view price
              <input type="number" value={edit.ppvPrice ?? ''} placeholder="None" onChange={(e) => setEdit({ ...edit, ppvPrice: e.target.value ? Number(e.target.value) : null })} className={field} />
            </label>
          </div>
          <label className="grid gap-1">
            Tags (comma separated)
            <input value={edit.tags.join(', ')} onChange={(e) => setEdit({ ...edit, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} className={field} />
          </label>
          <fieldset>
            <legend className="mb-1">Performers</legend>
            <div className="flex flex-wrap gap-x-4">
              {performers.map((p) => (
                <label key={p.id} className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" checked={edit.performerIds.includes(p.id)} onChange={(e) => setEdit({ ...edit, performerIds: e.target.checked ? [...edit.performerIds, p.id] : edit.performerIds.filter((id) => id !== p.id) })} className="size-4 accent-accent" />
                  {p.name}
                  {!p.recordsOnFile && <span className="text-xs text-amber-400">no records</span>}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={edit.isPremium} onChange={(e) => setEdit({ ...edit, isPremium: e.target.checked })} className="size-4 accent-accent" /> Premium only
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={edit.published !== false} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} className="size-4 accent-accent" /> Published
          </label>
          {error && <p role="alert" className="rounded-lg border border-accent p-3 text-accent">{error}</p>}
          <div className="flex gap-2">
            <button onClick={saveVideo} className={primary}>
              Save
            </button>
            <button onClick={() => (setEdit(null), setError(''))} className={btn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div className="grid gap-3">
          <p className="text-muted">Paste a JSON array or CSV matching the videos schema, or choose a file. Use | between several tags or performer ids in CSV. This is how the existing library gets linked.</p>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={7} aria-label="Rows to import" placeholder="title,slug,src,durationSec,categorySlug,performerIds,tags" className="rounded-lg border border-line bg-ink p-3 font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            <input type="file" accept=".json,.csv,.txt" aria-label="Import file" onChange={async (e) => setRaw((await e.target.files?.[0]?.text()) ?? '')} className="min-h-11" />
            <button onClick={check} className={btn}>
              Preview
            </button>
            {preview.length > 0 && (
              <button
                onClick={() => {
                  const good = preview.filter((p) => !p.error).map((p) => p.row)
                  saveVideos([...good, ...videos])
                  setNotice(`Imported ${good.length} of ${preview.length} rows. ${preview.length - good.length} had errors and were skipped.`)
                  setPreview(preview.filter((p) => p.error))
                }}
                className={primary}
              >
                Import {preview.filter((p) => !p.error).length} valid rows
              </button>
            )}
          </div>
          {preview.length > 0 && (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Title</th>
                  <th className={th}>Slug</th>
                  <th className={th}>Result</th>
                </tr>
              </thead>
              <tbody>
                {preview.map(({ row, error }, i) => (
                  <tr key={i}>
                    <td className={td}>{row.title}</td>
                    <td className={td}>{row.slug}</td>
                    <td className={`${td} ${error ? 'text-accent' : 'text-green-400'}`}>{error || 'Ready'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'performers' && (
        <div className="overflow-x-auto">
          <button onClick={() => exportCsv('performers', performers)} className={`${btn} mb-3`}>
            Export CSV
          </button>
          <table className="w-full">
            <thead>
              <tr>
                {['Name', 'Verified', 'Age and consent records on file', 'Record reference', 'Audio rate', 'Video rate'].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {performers.map((p) => {
                const set = (patch: Partial<Performer>) => savePerformers(performers.map((x) => (x.id === p.id ? { ...x, ...patch } : x)))
                return (
                  <tr key={p.id}>
                    <td className={td}>{p.name}</td>
                    <td className={td}>
                      <input type="checkbox" aria-label={`${p.name} verified`} checked={p.isVerified} onChange={(e) => set({ isVerified: e.target.checked })} className="size-4 accent-accent" />
                    </td>
                    <td className={td}>
                      <input type="checkbox" aria-label={`${p.name} records on file`} checked={p.recordsOnFile} onChange={(e) => set({ recordsOnFile: e.target.checked })} className="size-4 accent-accent" />
                    </td>
                    <td className={td}>
                      <input aria-label={`${p.name} record reference`} value={p.recordRef} onChange={(e) => set({ recordRef: e.target.value })} className={`${field} w-32`} />
                    </td>
                    <td className={td}>
                      <input type="number" aria-label={`${p.name} audio rate`} value={p.audioRatePerMin} onChange={(e) => set({ audioRatePerMin: Number(e.target.value) })} className={`${field} w-20`} />
                    </td>
                    <td className={td}>
                      <input type="number" aria-label={`${p.name} video rate`} value={p.videoRatePerMin} onChange={(e) => set({ videoRatePerMin: Number(e.target.value) })} className={`${field} w-20`} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'taxonomy' && (
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-2 font-semibold">Categories</h2>
            {categories.map((c) => (
              <div key={c.slug} className="mb-2 flex gap-2">
                <input aria-label={`Name of ${c.slug}`} value={c.name} onChange={(e) => saveCategories(categories.map((x) => (x.slug === c.slug ? { ...x, name: e.target.value } : x)))} className={`${field} min-w-0 flex-1`} />
                <button onClick={() => saveCategories(categories.filter((x) => x.slug !== c.slug))} className={btn}>
                  Delete
                </button>
              </div>
            ))}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement
                const name = input.value.trim()
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                if (name && !categories.some((c) => c.slug === slug)) saveCategories([...categories, { slug, name }])
                input.value = ''
              }}
            >
              <input name="name" placeholder="New category" aria-label="New category" className={`${field} min-w-0 flex-1`} />
              <button className={primary}>Add</button>
            </form>
          </section>
          <section>
            <h2 className="mb-2 font-semibold">Tags</h2>
            {tags.map((t) => (
              <div key={t} className="mb-2 flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  {t} <span className="text-xs text-muted">({videos.filter((v) => v.tags.includes(t)).length} videos)</span>
                </span>
                <button onClick={() => saveVideos(videos.map((v) => ({ ...v, tags: v.tags.filter((x) => x !== t) })))} className={btn}>
                  Remove from all
                </button>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === 'monetisation' && (
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-2 font-semibold">Plans (USD)</h2>
            {plans.filter((p) => p.id !== 'free').map((p) => (
              <label key={p.id} className="mb-2 flex items-center justify-between gap-2">
                {p.name}
                <input type="number" step="0.01" value={p.priceUsd} onChange={(e) => setPlans(plans.map((x) => (x.id === p.id ? { ...x, priceUsd: Number(e.target.value) } : x)))} className={`${field} w-28`} />
              </label>
            ))}
            <h2 className="mb-2 mt-5 font-semibold">Token packs (USD)</h2>
            {packs.map((p) => (
              <label key={p.id} className="mb-2 flex items-center justify-between gap-2">
                {p.tokens} tokens + {p.bonus} bonus
                <input type="number" step="0.01" value={p.priceUsd} onChange={(e) => setPacks(packs.map((x) => (x.id === p.id ? { ...x, priceUsd: Number(e.target.value) } : x)))} className={`${field} w-28`} />
              </label>
            ))}
            <h2 className="mb-2 mt-5 font-semibold">Commission rates (share paid out)</h2>
            {Object.entries(commission).map(([k, v]) => (
              <label key={k} className="mb-2 flex items-center justify-between gap-2">
                {k}
                <input type="number" step="0.05" min={0} max={1} value={v} onChange={(e) => setCommission({ ...commission, [k]: Number(e.target.value) })} className={`${field} w-28`} />
              </label>
            ))}
          </section>
          <section>
            <h2 className="mb-2 font-semibold">Ad slots</h2>
            {ads.map((a) => (
              <div key={a.id} className="mb-2 flex items-center justify-between gap-2">
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" checked={a.enabled} onChange={(e) => saveAds(ads.map((x) => (x.id === a.id ? { ...x, enabled: e.target.checked } : x)))} className="size-4 accent-accent" />
                  {a.id} <span className="text-xs text-muted">{a.size}</span>
                </label>
                {a.frequencyCapMin !== undefined && (
                  <label className="flex items-center gap-2 text-xs text-muted">
                    Cap (minutes)
                    <input type="number" min={0} value={a.frequencyCapMin} onChange={(e) => saveAds(ads.map((x) => (x.id === a.id ? { ...x, frequencyCapMin: Number(e.target.value) } : x)))} className={`${field} w-20`} />
                  </label>
                )}
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === 'moderation' && (
        <div className="grid gap-3">
          <button onClick={() => exportCsv('moderation', queue)} className={`${btn} justify-self-start`}>
            Export CSV
          </button>
          {!queue.length && <p className="text-muted">The queue is empty. Reports and removal requests from the site appear here.</p>}
          {queue.map((item) => {
            const set = (patch: Partial<ModerationItem>) => saveQueue(queue.map((x) => (x.id === item.id ? { ...x, ...patch } : x)))
            const video = videos.find((v) => v.id === item.subject || item.subject.includes(v.slug))
            return (
              <div key={item.id} className="grid gap-2 rounded-lg bg-surface p-4">
                <p>
                  <span className="font-mono">{item.id}</span> · <span className="capitalize">{item.kind}</span> · {item.at.slice(0, 10)} · <span className={item.status === 'open' ? 'text-amber-400' : 'text-green-400'}>{item.status}</span>
                </p>
                <p className="text-muted">
                  {item.subject}: {item.detail}
                </p>
                <input value={item.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Notes" aria-label={`Notes for ${item.id}`} className={field} />
                <div className="flex flex-wrap gap-2">
                  {video && video.published !== false && (
                    <button onClick={() => (saveVideos(videos.map((v) => (v.id === video.id ? { ...v, published: false } : v))), setNotice(`"${video.title}" is unpublished.`))} className={primary}>
                      Unpublish now
                    </button>
                  )}
                  <button onClick={() => set({ status: item.status === 'open' ? 'resolved' : 'open' })} className={btn}>
                    {item.status === 'open' ? 'Mark resolved' : 'Reopen'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
