// src/app/(site)/tags/[tag]/page.tsx
import { relatedTags } from '@/lib/api'
import { titleCase } from '@/lib/format'
import { JsonLd, breadcrumbLd, pageMeta } from '@/lib/seo'
import { TagLinks } from '@/components/TagLinks'
import { VideoBrowser } from '@/components/VideoBrowser'

type Props = { params: { tag: string } }

export function generateMetadata({ params }: Props) {
  const name = titleCase(params.tag)
  return pageMeta(`${name} videos`, `Videos tagged ${name}, with related tags to explore. Adults only (18+).`, `/tags/${params.tag}`)
}

export default function TagPage({ params }: Props) {
  return (
    <>
      <JsonLd data={breadcrumbLd([['Home', '/'], ['Tags', '/search'], [titleCase(params.tag), `/tags/${params.tag}`]])} />
      <h1 className="mb-2 text-lg font-semibold">Tag: {params.tag}</h1>
      <TagLinks tags={relatedTags({ tag: params.tag })} />
      <VideoBrowser base={{ tag: params.tag }} />
    </>
  )
}
