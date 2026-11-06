export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  whatsapp_number?: string | null
  email_message_notifications?: boolean | null
  created_at: string
  updated_at: string
  is_superadmin?: boolean
}


export type ListingType = 'product' | 'service' | 'event' | 'news'

export type StoreType = 'general' | 'real_estate' | 'automotive'

export type Store = {
  id: string
  owner_id: string
  slug: string
  name: string
  store_type: StoreType
  description?: string
  avatar_url?: string
  location?: string
  created_at: string
  updated_at: string
}

export type RealEstateMetadata = {
  type: 'real_estate'
  property_type: 'casa' | 'departamento' | 'terreno' | 'local' | 'oficina'
  transaction_type: 'venta' | 'renta'
  bedrooms?: number
  bathrooms?: number
  construction_m2?: number
  lot_m2?: number
  parking_spots?: number
}

export type AutomotiveMetadata = {
  type: 'automotive'
  make: string
  model: string
  year: number
  mileage_km?: number
  transmission?: 'manual' | 'automatica'
  fuel_type?: 'gasolina' | 'diesel' | 'electrico' | 'hibrido'
  color?: string
  doors?: number
}

export type ListingMetadata = RealEstateMetadata | AutomotiveMetadata

export type Listing = {
  id: string
  user_id: string
  store_id?: string | null
  listing_type: ListingType
  title: string
  description: string
  price: number
  category: string
  location: string
  country_code?: string | null
  city?: string | null
  state_region?: string | null
  metadata?: ListingMetadata | null
  video_url?: string | null
  tagged_business_id?: string | null
  conversation_count?: number
  ranking_score?: number
  status: 'active' | 'sold' | 'inactive'
  sold_at?: string | null
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
  store?: Store | null
  likes_count?: number
  saves_count?: number
  comments_count?: number
  user_has_liked?: boolean
  user_has_saved?: boolean
  tagged_business?: Business | null
}

export type Business = {
  id: string
  name: string
  name_normalized: string
  store_id?: string | null
  store?: Store | null
  location?: string | null
  category?: string | null
  mention_count: number
  followers_count?: number
  likes_count?: number
  phone?: string | null
  address?: string | null
  city?: string | null
  state_region?: string | null
  country_code?: string | null
  created_by?: string | null
  created_at: string
}

export type ListingLike = {
  id: string
  listing_id: string
  user_id: string
  created_at: string
}

export type ListingSave = {
  id: string
  listing_id: string
  user_id: string
  created_at: string
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

export type ListingComment = {
  id: string
  listing_id: string
  user_id: string
  content: string
  created_at: string
  profile?: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
}

export type Report = {
  id: string
  type: string
  description?: string | null
  email?: string | null
  listing_id?: string | null
  listing_title?: string | null
  reporter_id?: string | null
  reporter_label?: string | null
  status: 'new' | 'reviewed' | 'resolved'
  created_at: string
  updated_at: string
}

export type ReportNote = {
  id: string
  report_id: string
  author_id?: string | null
  kind: 'note' | 'reply'
  body: string
  created_at: string
}
