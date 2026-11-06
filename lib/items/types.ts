// Items engine — shared types (§3, §6 of the v1.1 brief).
//
// An item is an OFFERING: one business + one kind. It is not a SKU.

export type ItemKind = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  status: 'pending' | 'approved' | 'merged' | 'rejected'
}

export type ItemOrigin = 'owner_claim' | 'community' | 'mention'

export type BusinessItem = {
  id: string
  business_id: string
  kind_id: string
  origin: ItemOrigin
  status: 'visible' | 'hidden' | 'reviewing'
  created_by: string | null
  created_at: string
  kind?: ItemKind | null
}

// One entry in a listing's item-tag selection. The first entry is the
// primary tag; the rest are secondary (they do not get the full weight
// of the listing, §7.4). An entry is either an existing offering
// (itemId), an existing kind to create an offering from (kindId), or
// a brand-new kind typed by the user (kindName, resolved server-side).
export type SelectedItemTag = {
  itemId?: string
  kindId?: string
  kindName: string
  kindSlug: string
  isNewKind?: boolean
}

// Shape returned by GET /api/items/search.
export type ItemSearchResult = {
  items: {
    id: string
    kind_id: string
    kind_name: string
    kind_slug: string
    origin: ItemOrigin
    mention_count: number
    contributors: number
  }[]
  kinds: {
    id: string
    name: string
    slug: string
    parent_id: string | null
  }[]
}
