/**
 * Message-thread price formatting — the strip over a conversation.
 * Thin wrapper over the shared listing formatter so the thread and
 * the listing page can never disagree about a price.
 */
import { formatPrice as formatListingPrice } from '@/lib/listings/format-price'

export function formatPrice(
  price: number | null | undefined,
  currency?: string | null,
  opts?: { isFree?: boolean | null },
): string {
  return formatListingPrice(price, currency, opts)
}
