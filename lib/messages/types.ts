/**
 * Messaging v2 Step 2 — shared types for the messages UI.
 *
 * These mirror what the Step 1 server routes return, so the split
 * components are typed end to end instead of `any`:
 * - GET /api/messages/conversations -> Conversation[]
 * - GET /api/messages/conversations/[id]/messages -> Message[]
 */

export type ConversationProfile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

export type ConversationListing = {
  id: string
  title: string
  /** MXN price; null when the listing has no price. */
  price: number | null
  /** listings.status: 'active' | 'sold' | 'inactive'. Null when unknown. */
  status: string | null
  /** First listing image (lowest order_index), if the listing has one. */
  image_url: string | null
}

export type LastMessage = {
  content: string
  created_at: string
}

export type Conversation = {
  id: string
  /** Null once the listing is deleted (migration 030, ON DELETE SET NULL). */
  listing_id: string | null
  buyer_id: string
  seller_id: string
  created_at: string
  updated_at: string
  /**
   * Step 4 archive flags, per participant. Normalized to false
   * pre-migration-031 by the server route and by
   * normalizeConversation. A thread archived by one participant
   * is hidden from that participant's list only.
   */
  archived_by_buyer: boolean
  archived_by_seller: boolean
  listing: ConversationListing | null
  /**
   * Title snapshot taken when the conversation was created, so a
   * thread stays readable after its listing is deleted. Null for
   * threads created before migration 030.
   */
  listing_title: string | null
  buyer: ConversationProfile | null
  seller: ConversationProfile | null
  unread_count: number
  last_message: LastMessage | null
}

/**
 * Is this thread archived for the given participant? Pure function
 * of the row — the list route already filters by it, but the thread
 * header menu needs it to label the action Archivar/Desarchivar.
 */
export function isArchivedFor(conv: Conversation, userId: string): boolean {
  return conv.buyer_id === userId ? conv.archived_by_buyer : conv.archived_by_seller
}

/** A thread that does not exist yet: Contactar was tapped, nothing inserted. */
export type PendingListing = {
  id: string
  title: string
  price: number | null
  status: string | null
  image_url: string | null
}

export type PendingThread = {
  listingId: string
  sellerId: string
  listing: PendingListing
  seller: ConversationProfile | null
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
}
