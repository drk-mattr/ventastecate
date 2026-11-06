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
  /** First listing image (lowest order_index), if the listing has one. */
  image_url: string | null
}

export type LastMessage = {
  content: string
  created_at: string
}

export type Conversation = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  created_at: string
  updated_at: string
  listing: ConversationListing | null
  buyer: ConversationProfile | null
  seller: ConversationProfile | null
  unread_count: number
  last_message: LastMessage | null
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
}
