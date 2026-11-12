// src/app/(site)/categories/page.tsx
'use client'
import { getCategories } from '@/lib/api'
import { useData } from '@/lib/store'
import { SkeletonGrid } from '@/components/Shell'
import { CategoryCard, gridCols } from '@/components/VideoCard'

export default function CategoriesPage() {
  const categories = useData(getCategories)
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">Categories</h1>
      {!categories && <SkeletonGrid />}
      <div className={gridCols}>{categories?.map((c) => <CategoryCard key={c.slug} category={c} />)}</div>
    </>
  )
}
