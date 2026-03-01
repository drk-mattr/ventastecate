'use client'

import { createContext, useContext } from 'react'

// null = unknown (local dev, no CF header) → no country filtering applied
const RegionContext = createContext<string | null>(null)

export function RegionProvider({
  children,
  countryCode,
}: {
  children: React.ReactNode
  countryCode: string | null
}) {
  return <RegionContext.Provider value={countryCode}>{children}</RegionContext.Provider>
}

export function useRegion(): string | null {
  return useContext(RegionContext)
}
