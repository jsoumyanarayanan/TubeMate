// src/app/(site)/[...slug]/page.tsx
// Legal and trust pages. All text is placeholder and must be replaced with lawyer-approved text.
import Link from 'next/link'
import { notFound } from 'next/navigation'

const pages: Record<string, { title: string; body: string[] }> = {
  terms: { title: 'Terms of Service', body: ['You must be 18 or older to use this site.', 'Accounts, payments, refunds, acceptable use and termination are described here.'] },
  privacy: { title: 'Privacy Policy', body: ['What we collect, why, how long we keep it and how to delete it.', 'Viewing interests are sensitive data. Personalisation is off until you opt in, and you can erase your data at any time from your account.'] },
  cookies: { title: 'Cookie Policy', body: ['Essential cookies keep you signed in and remember your age confirmation.', 'Optional cookies remember settings. You can change your choice at any time.'] },
  '2257': { title: '18 U.S.C. 2257 Record-Keeping Statement', body: ['All performers appearing on this site were 18 or older at the time of production.', 'Custodian of Records: [name], [street address], [city, state, postcode]. Fill this block in before launch.'] },
  'parental-controls': { title: 'Parental Controls', body: ['This site is labelled with the RTA tag so filtering software can block it.', 'To block adult sites, turn on the content filters built into your device, browser or home router, or install a dedicated parental control tool.'] },
  'report-abuse': { title: 'Report Abuse', body: ['If you believe content here is illegal or shows someone without consent, tell us and we take it offline while we review it.', 'Urgent contact: [abuse email and phone]. For immediate danger, contact local emergency services.'] },
  safety: { title: 'Safety and Community Rules', body: ['Every performer is a verified adult with consent on record for each video.', 'Banned: anyone under 18, content made or shared without consent, real-person impersonation, and anything illegal. Breaking the rules ends the account.'] },
  contact: { title: 'Contact', body: ['Support: [support email]. Press: [press email]. Legal: [legal email].'] },
}

export default function LegalPage({ params }: { params: { slug: string[] } }) {
  const page = pages[params.slug[0]]
  if (!page || params.slug.length > 1) notFound()
  return (
    <article className="mx-auto grid max-w-2xl gap-3 text-sm">
      <h1 className="text-lg font-semibold">{page.title}</h1>
      <p className="rounded-lg bg-amber-400/15 p-3 text-amber-300">Placeholder text. Replace with lawyer-approved text before launch.</p>
      {page.body.map((p) => (
        <p key={p} className="text-muted">
          {p}
        </p>
      ))}
      {['report-abuse', 'safety'].includes(params.slug[0]) && (
        <Link href="/content-removal" className="text-accent underline">
          Open the content removal and report form
        </Link>
      )}
    </article>
  )
}
