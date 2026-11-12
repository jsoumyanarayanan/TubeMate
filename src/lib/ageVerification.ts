// src/lib/ageVerification.ts
export const AGE_KEY = 'tm_age_ok'
const DAYS = 30

export const hasAgeConsent = () =>
  typeof window !== 'undefined' && Number(localStorage.getItem(AGE_KEY) ?? 0) > Date.now()

export function storeAgeConsent() {
  localStorage.setItem(AGE_KEY, String(Date.now() + DAYS * 864e5))
  document.cookie = `${AGE_KEY}=1; max-age=${DAYS * 86400}; path=/; samesite=lax`
}

export type AgeResult = { verified: boolean; method: 'self-declared' | 'provider' }

// TODO: self-declaration is not accepted in the EU, the UK and many US states.
// Call a third-party age verification provider here, chosen by region, before launch.
export async function verifyAge(_region: string): Promise<AgeResult> {
  return { verified: hasAgeConsent(), method: 'self-declared' }
}
