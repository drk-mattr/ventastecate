export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

export type ListingType = 'product' | 'service' | 'event'

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
  store?: Store | null
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
