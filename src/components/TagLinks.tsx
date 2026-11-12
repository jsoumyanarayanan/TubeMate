// src/components/TagLinks.tsx
// "Related tags" chips for internal linking. Rendered on the server so crawlers can follow them.
import Link from 'next/link'

export function TagLinks({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <nav aria-label="Related tags" className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Related tags</span>
      {tags.map((t) => (
        <Link key={t} href={`/tags/${t}`} className="grid min-h-11 place-items-center rounded-full bg-surface px-3 hover:bg-line">
          #{t}
        </Link>
      ))}
    </nav>
  )
}
