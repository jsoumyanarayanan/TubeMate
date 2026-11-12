// src/app/(site)/store/page.tsx
import { gridCols } from '@/components/VideoCard'

const items = Array.from({ length: 8 }, (_, i) => ({ name: `Demo product ${String(i + 1).padStart(2, '0')}`, price: `$${19 + i * 5}.00`, partner: i % 2 === 1 }))

export default function StorePage() {
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Store</h1>
      <p className="mb-4 text-sm text-muted">Merchandise and partner products. Partner items are affiliate links, and we may earn a commission.</p>
      <div className={gridCols}>
        {items.map((it) => (
          <div key={it.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/placeholder/thumb.svg" alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
            <p className="mt-2 text-sm font-medium">{it.name}</p>
            <p className="text-xs text-muted">
              {it.price} {it.partner && '· Affiliate link'}
            </p>
          </div>
        ))}
      </div>
    </>
  )
}
