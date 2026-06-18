'use client'

import { createContext, useContext } from 'react'

// MVP default brand. The provider always supplies the resolved brand, but this
// fallback is set to Ventas Tecate so no "Papryka" string can leak if a consumer
// ever reads the context outside the provider.
const BrandContext = createContext('Ventas Tecate')

export function BrandProvider({ children, brandName }: { children: React.ReactNode; brandName: string }) {
  return <BrandContext.Provider value={brandName}>{children}</BrandContext.Provider>
}

export function useBrand() {
  return useContext(BrandContext)
}
