// Gastro — the food-discovery surface (v1).
//
// A feed of posts that mention a food item, newest first, plus the
// food-only "En tendencia" strip when the §11.3 gate passes. It
// is a presentation layer on the items engine, not a new engine:
// a post enters the feed by mentioning a food item, and the item
// chip on each card is the same one the home trending strip uses.
//
// Cold start (today: 0 mentions): the feed shows an honest empty
// state and the trending strip renders nothing until the gate
// passes — no seeded posts, no demo data on the live page. The
// feed respects the site-wide region cookie, like home.
//
// NOTE (2026-11-11): the posting form no longer offers item
// tagging (removed in PR #167 at the user's direction), so no new
// mention can be created today and this feed stays empty until a
// mention entry point is rebuilt. The empty state is honest and
// correct for now — it does not fake content.

import Link from 'next/link'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { LOCATION_COOKIE, townsForLocation, townFilterOr } from '@/lib/business-regions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TypeShortcuts } from '@/components/home/type-shortcuts'
import { CommunityFeed } from '@/components/home/community-feed'
import { ItemCarousel } from '@/components/items/item-carousel'
import { fetchTrendingItems } from '@/lib/items/carousel'
import { fetchFoodKindIds } from '@/lib/items/food-kinds'
import { excludePastEvents } from '@/lib/listings/event-dates'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import type { ListingWithImages } from '@/lib/types/database'

export const metadata: Metadata = {
  title: 'Gastro',
  description:
    'Lo que la gente está comiendo y recomendando en Tecate y alrededores: fotos y opiniones de la comunidad sobre platos y bebidas.',
}

export default async function GastroPage() {
  const cookieStore = await cookies()
  const regionLabel = cookieStore.get(LOCATION_COOKIE)?.value || 'Tecate'
  const feedTowns = townsForLocation(cookieStore.get(LOCATION_COOKIE)?.value)
  const townFilter = feedTowns ? townFilterOr(feedTowns) : null

  const listingSelect = `
    *,
    images:listing_images( id, image_url, order_index ),
    profile:profiles( id, username, display_name, avatar_url ),
    store:stores( id, slug, name, avatar_url )
  `

  const admin = createAdminClient()
  const supabase = await createClient()

  // Food mentions: listings whose item tag points at an offering
  // whose kind is in the food subtree. Newest first.
  let feedListings: ListingWithImages[] = []
  let foodKindIds: string[] = []
  if (admin) {
    foodKindIds = await fetchFoodKindIds(admin)
    if (foodKindIds.length > 0) {
      const { data: foodItems } = await admin
        .from('items')
        .select('id')
        .in('kind_id', foodKindIds)
        .eq('status', 'visible')
      const foodItemIds = ((foodItems || []) as { id: string }[]).map((i) => i.id)
      if (foodItemIds.length > 0) {
        const { data: tagRows } = await admin
          .from('listing_item_tags')
          .select('listing_id, created_at')
          .in('item_id', foodItemIds)
          .order('created_at', { ascending: false })
          .limit(500)
        const listingIds = [
          ...new Set(
            ((tagRows || []) as { listing_id: string }[]).map((t) => t.listing_id),
          ),
        ]
        if (listingIds.length > 0) {
          let feedQuery = supabase
            .from('listings')
            .select(listingSelect)
            .eq('status', 'active')
            .in('id', listingIds)
          if (townFilter) feedQuery = feedQuery.or(townFilter)
          const { data: feedRaw } = await feedQuery
            .order('created_at', { ascending: false })
            .limit(60)
          feedListings = excludePastEvents(
            ((feedRaw || []) as ListingWithImages[]),
          ).slice(0, 30)
        }
      }
    }
  }

  // Food-only "En tendencia" carousel — renders nothing until the
  // §11.3 gate passes for food kinds, same cold-start rule as home.
  const trendingItems =
    admin && foodKindIds.length > 0
      ? await fetchTrendingItems(admin, feedTowns, regionLabel, foodKindIds)
      : { cards: [], available: false }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <Suspense>
        <TypeShortcuts />
      </Suspense>
      <main className="container mx-auto px-4 py-5 flex-1">
        <h1 className="text-2xl font-bold text-gray-900">Gastro</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lo que la gente está comiendo y recomendando en {regionLabel}.
        </p>

        {trendingItems.cards.length > 0 && (
          <div className="mt-5">
            <ItemCarousel items={trendingItems.cards} />
          </div>
        )}

        <div className="mt-5">
          {feedListings.length > 0 ? (
            <CommunityFeed initialListings={feedListings} />
          ) : (
            <div className="rounded-xl border bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-gray-900">
                Aún no hay publicaciones de comida — sé el primero.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Publica una foto de lo que probaste y cuéntales a tus vecinos dónde está.
              </p>
              <Link
                href="/listings/new"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 text-sm font-semibold transition-colors"
              >
                <Plus className="h-4 w-4" /> Publica un anuncio — gratis
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
