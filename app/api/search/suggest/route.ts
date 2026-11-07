// GET /api/search/suggest?q=<text>
//
// Live suggestions for the header search bar: active listings, item
// kinds, and businesses matching the text. Public read — the same data
// the public search page already shows. Scoped to the site-wide region
// cookie (default Tecate), like /search. A query under 2 chars returns
// empty sections; the bar only calls it from 2 chars up.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LOCATION_COOKIE, townsForLocation, townFilterOr } from '@/lib/business-regions'
import { searchKinds } from '@/lib/items/kind-search'
import { formatPrice } from '@/lib/listings/format-price'

export async function GET(request: NextRequest) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ listings: [], kinds: [], businesses: [] })
  }

  const towns = townsForLocation((await cookies()).get(LOCATION_COOKIE)?.value)
  const supabase = await createClient()

  // Listings. Migration 038 (currency / is_free) has not been applied
  // in prod yet, so the full select 400s with 42703 until the user
  // runs it — retry without the new columns (every existing listing
  // is MXN, which formatPrice defaults to). Same 42703-retry pattern
  // PR #93 uses elsewhere.
  type ListingRow = {
    id: string
    title: string
    price: number | null
    currency?: string | null
    is_free?: boolean | null
  }
  const runListingsQuery = async (select: string) => {
    let query = supabase
      .from('listings')
      .select(select)
      .eq('status', 'active')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    if (towns) query = query.or(townFilterOr(towns))
    return query.order('created_at', { ascending: false }).limit(5)
  }
  const fullRes = await runListingsQuery('id, title, price, currency, is_free')
  let listingRows: ListingRow[] = (fullRes.data ?? []) as unknown as ListingRow[]
  if (fullRes.error) {
    const retryRes = await runListingsQuery('id, title, price')
    listingRows = (retryRes.data ?? []) as unknown as ListingRow[]
  }

  let kinds: { slug: string; name: string; parent_name: string | null }[] = []
  const admin = createAdminClient()
  if (admin) {
    try {
      kinds = (await searchKinds(admin, q, { towns, limit: 3 })).map((k) => ({
        slug: k.slug,
        name: k.name,
        parent_name: k.parent_name,
      }))
    } catch {
      kinds = []
    }
  }

  let businessesQuery = supabase
    .from('businesses')
    .select('id, name, category, city')
    .ilike('name_normalized', `%${q.toLowerCase()}%`)
  if (towns) businessesQuery = businessesQuery.in('city', towns)
  const { data: businesses } = await businessesQuery
    .order('name_normalized', { ascending: true })
    .limit(4)

  return NextResponse.json({
    listings: listingRows.map((l) => ({
      id: l.id,
      title: l.title,
      priceLabel: formatPrice(l.price, l.currency, { isFree: l.is_free }),
    })),
    kinds,
    businesses: businesses || [],
  })
}
