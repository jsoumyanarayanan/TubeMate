// src/lib/i18n.ts
// hreflang-ready. English only for now. The default language has no URL prefix and others get /<code>.
// To add a language: add it here, move the (site) folder under app/[locale], and translate the copy.
export const locales = ['en'] as const
export const defaultLocale = 'en'
export const localeNames: Record<string, string> = { en: 'English' }
export const localePath = (locale: string, path: string) => (locale === defaultLocale ? path : `/${locale}${path === '/' ? '' : path}`)
