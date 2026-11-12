// src/lib/geo.ts
// Regions where the site is not offered. ISO 3166-1 alpha-2 codes.
export const blockedRegions = ['IN']

export const isBlocked = (country?: string | null) =>
  !!country && blockedRegions.includes(country.toUpperCase())
