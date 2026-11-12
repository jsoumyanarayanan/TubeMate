// src/app/region-blocked/page.tsx
// Shown by the middleware to visitors from blocked regions. No site shell and no content.
export const metadata = { title: 'Not available', robots: { index: false } }

export default function RegionBlocked() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Not available in your region</h1>
        <p className="mt-2 text-muted">This service is not offered where you are.</p>
      </div>
    </main>
  )
}
