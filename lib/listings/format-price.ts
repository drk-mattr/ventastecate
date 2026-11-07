/**
 * Shared listing price formatter — one function every display site
 * uses, so a price is never formatted with a hardcoded currency
 * again. Rules:
 * - is_free → "Gratis" (a free item is not a $0 item).
 * - price ≤ 0 (and not free) → "Consultar precio".
 * - USD shows the currency explicitly ("$8,000.00 USD"): a bare "$"
 *   is ambiguous in Mexico, where MXN is the default.
 * - No conversion anywhere — the price displays as entered.
 * - A missing currency (pre-migration-038 rows) reads as MXN.
 */
export type ListingCurrency = 'MXN' | 'USD'

export function formatPrice(
  price: number | null | undefined,
  currency?: ListingCurrency | string | null,
  opts?: { isFree?: boolean | null },
): string {
  if (opts?.isFree) return 'Gratis'
  if (!price || price <= 0) return 'Consultar precio'
  const cur: ListingCurrency = currency === 'USD' ? 'USD' : 'MXN'
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: cur,
  }).format(price)
  return cur === 'USD' ? `${formatted} USD` : formatted
}
