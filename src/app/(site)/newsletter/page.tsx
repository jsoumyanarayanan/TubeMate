// src/app/(site)/newsletter/page.tsx
export default function NewsletterPage() {
  return (
    <div className="mx-auto grid max-w-xl gap-4 text-sm">
      <h1 className="text-lg font-semibold">Newsletter preview</h1>
      <div className="grid gap-4 rounded-lg bg-surface p-5">
        <p className="text-xl font-bold text-accent">TUBEMATE weekly</p>
        <p className="text-muted">Subject lines and previews stay neutral so the email is discreet in an inbox.</p>
        {[1, 2, 3].map((n) => (
          <div key={n} className="border-t border-line pt-3">
            <p className="font-medium">New this week {n}</p>
            <p className="text-muted">Demo item text.</p>
          </div>
        ))}
        <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted">Sponsored placement · partner offer</div>
        <p className="text-xs text-muted">You get this email because you opted in. Unsubscribe with one click.</p>
      </div>
    </div>
  )
}
