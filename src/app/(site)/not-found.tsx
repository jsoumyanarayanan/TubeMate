// src/app/(site)/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="grid place-items-center gap-3 py-24 text-center">
      <p className="text-5xl font-bold text-accent">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link href="/" className="grid min-h-11 place-items-center rounded-lg bg-accent px-4 font-semibold text-white">
        Back to home
      </Link>
    </div>
  )
}
