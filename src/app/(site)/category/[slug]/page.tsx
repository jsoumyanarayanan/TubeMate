// src/app/(site)/category/[slug]/page.tsx
import { getCategories, relatedTags } from '@/lib/api'
import { titleCase } from '@/lib/format'
import { JsonLd, breadcrumbLd, pageMeta } from '@/lib/seo'
import { TagLinks } from '@/components/TagLinks'
import { VideoBrowser } from '@/components/VideoBrowser'

type Props = { params: { slug: string } }
const nameOf = async (slug: string) => (await getCategories()).find((c) => c.slug === slug)?.name ?? titleCase(slug)

export async function generateMetadata({ params }: Props) {
  const name = await nameOf(params.slug)
  return pageMeta(`${name} videos`, `Browse ${name} videos by newest, most viewed and top rated. Adults only (18+).`, `/category/${params.slug}`)
}

export default async function CategoryPage({ params }: Props) {
  const name = await nameOf(params.slug)
  return (
    <>
      <JsonLd data={breadcrumbLd([['Home', '/'], ['Categories', '/categories'], [name, `/category/${params.slug}`]])} />
      <h1 className="mb-2 text-lg font-semibold">{name}</h1>
      <TagLinks tags={relatedTags({ category: params.slug })} />
      <VideoBrowser base={{ category: params.slug }} />
    </>
  )
}
