export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

export type Listing = {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  category: string
  location: string
  status: 'active' | 'sold' | 'inactive'
  created_at: string
  updated_at: string
}

export type ListingImage = {
  id: string
  listing_id: string
  image_url: string
  order_index: number
  created_at: string
}

export type ListingWithImages = Listing & {
  images: ListingImage[]
  profile: Profile
}

export type Conversation = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  created_at: string
  updated_at: string
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read: boolean
}

export type ConversationWithDetails = Conversation & {
  listing: Listing
  buyer: Profile
  seller: Profile
  messages: Message[]
  unread_count?: number
}
