export type Brand = {
  name: string
  tagline: string
}

const BRANDS: Record<string, Brand> = {
  'ventastecate.com': {
    name: 'Ventas Tecate',
    tagline: 'Compra y vende en tu comunidad',
  },
  'www.ventastecate.com': {
    name: 'Ventas Tecate',
    tagline: 'Compra y vende en tu comunidad',
  },
}

// MVP: locked to the Ventas Tecate brand on every domain (including localhost and
// preview deploys) so the Papryka identity never leaks during the Tecate launch.
// Restore the Papryka default below when re-enabling multi-brand for expansion.
export const DEFAULT_BRAND: Brand = {
  name: 'Ventas Tecate',
  tagline: 'Compra y vende en tu comunidad',
}

export function getBrand(hostname: string): Brand {
  // Strip port — handles localhost:3001, localhost:3000, etc.
  const host = hostname.split(':')[0]
  return BRANDS[host] ?? DEFAULT_BRAND
}
