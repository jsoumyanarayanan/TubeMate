// src/middleware.ts
// Region block. Runs before the age gate and before any content loads.
import { NextResponse, type NextRequest } from 'next/server'
import { isBlocked } from '@/lib/geo'

export function middleware(req: NextRequest) {
  // The hosting platform or CDN sets one of these headers. x-country is for local testing.
  const country =
    req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry') ?? req.headers.get('x-country')
  if (isBlocked(country)) return NextResponse.rewrite(new URL('/region-blocked', req.url))
}

export const config = { matcher: ['/((?!_next/|favicon.ico|region-blocked).*)'] }
