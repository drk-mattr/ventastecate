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

// Default brand shown on all other domains (papryka.co, subdomains, localhost, etc.)
export const DEFAULT_BRAND: Brand = {
  name: 'Papryka',
  tagline: 'Buy and sell in your community',
}

export function getBrand(hostname: string): Brand {
  // Strip port — handles localhost:3001, localhost:3000, etc.
  const host = hostname.split(':')[0]
  return BRANDS[host] ?? DEFAULT_BRAND
}
