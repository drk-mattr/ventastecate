import type { Conversation, ConversationBusiness, ConversationProfile } from './types'

/**
 * Messaging v2 Step 3 — shared shaping for conversation rows that
 * come from client-direct embed queries (the Contactar lookup and
 * the pending-composer create path in the composer). The server
 * route returns the same shape; see
 * app/api/messages/conversations/route.ts.
 *
 * Rows from these queries lack the route's unread_count /
 * last_message / image_url — default them. The embed resolves
 * listing to null when listing_id is null (migration 030, deleted
 * listing); listing_title is the snapshot taken at creation time.
 */

// A row from `.select('*, listing:listings(...), buyer:..., seller:...')`
export type ConversationEmbedRow = {
  id: string
  listing_id: string | null
  /** Set for business threads (migration 044); absent pre-044. */
  business_id?: string | null
  buyer_id: string
  seller_id: string
  created_at: string
  updated_at: string
  listing_title?: string | null
  // Step 4 archive flags — absent pre-031, defaulted to false below.
  archived_by_buyer?: boolean | null
  archived_by_seller?: boolean | null
  listing: {
    id: string
    title: string
    price?: number | null
    status?: string | null
  } | null
  buyer: ConversationProfile | null
  seller: ConversationProfile | null
}

export function normalizeConversation(
  row: ConversationEmbedRow,
  // Business threads carry no business embed (the client queries
  // stay embed-free for businesses so they work pre-044); the
  // caller passes the business it already loaded, if any.
  business?: ConversationBusiness | null
): Conversation {
  return {
    id: row.id,
    listing_id: row.listing_id,
    business_id: row.business_id ?? business?.id ?? null,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    listing: row.listing
      ? {
          id: row.listing.id,
          title: row.listing.title,
          price: row.listing.price ?? null,
          status: row.listing.status ?? null,
          image_url: null,
        }
      : null,
    business: business ?? null,
    listing_title: row.listing_title ?? null,
    archived_by_buyer: row.archived_by_buyer ?? false,
    archived_by_seller: row.archived_by_seller ?? false,
    buyer: row.buyer,
    seller: row.seller,
    unread_count: 0,
    last_message: null,
  }
}
