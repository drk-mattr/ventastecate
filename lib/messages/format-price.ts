/**
 * Messaging v2 Step 3 — MXN price formatting, same rule as the
 * listing detail page: a price of 0 (or missing) means the seller
 * did not set one. Helper lives outside any component (purity lint).
 */
export function formatPrice(price: number | null | undefined): string {
  if (!price || price <= 0) return 'Consultar precio'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(price)
}
