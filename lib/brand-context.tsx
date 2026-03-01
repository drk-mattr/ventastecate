'use client'

import { createContext, useContext } from 'react'

const BrandContext = createContext('Papryka')

export function BrandProvider({ children, brandName }: { children: React.ReactNode; brandName: string }) {
  return <BrandContext.Provider value={brandName}>{children}</BrandContext.Provider>
}

export function useBrand() {
  return useContext(BrandContext)
}
