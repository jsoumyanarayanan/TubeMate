// src/lib/currency.ts
// Prices are stored in USD. Only USD and EUR are offered.
export type Currency = 'USD' | 'EUR'
export const currencies: Currency[] = ['USD', 'EUR']
const rate: Record<Currency, number> = { USD: 1, EUR: 0.92 } // TODO: live rate from the payment provider

export const formatPrice = (usd: number, currency: Currency = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(usd * rate[currency])
