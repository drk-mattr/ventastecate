import Link from 'next/link'
import { MapPin, Plus } from 'lucide-react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { DynamicHero } from '@/components/home/dynamic-hero'
import { TrendingStrip } from '@/components/home/trending-strip'
import { CommunityFeed } from '@/components/home/community-feed'
import { ListingWithImages } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { getTranslations } from '@/lib/i18n'

interface HomeProps {
  searchParams: Promise<{ global?: string; sort?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient()
  const { global: globalParam, sort: sortParam } = await searchParams
  const isGlobal = globalParam === '1'
  // Sort modes: 'top' (algorithm, default), 'new' (chronological)
  const sortMode = sortParam === 'new' ? 'new' : 'top'

  // Detect user country via Cloudflare header (null in local dev)
  const headersList = await headers()
  const userCountry = headersList.get('cf-ipcountry') ?? null
  const t = getTranslations(userCountry)

  const listingSelect = `
    *,
    images:listing_images( id, image_url, order_index ),
    profile:profiles( id, username, display_name, avatar_url ),
    store:stores( id, slug, name, avatar_url )
  `

  // ── Trending strip: highest-scored from the last 7 days ──
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let trendingQuery = supabase
    .from('listings')
    .select(listingSelect)
    .eq('status', 'active')
    .gte('created_at', oneWeekAgo)

  if (userCountry && !isGlobal) {
    trendingQuery = trendingQuery.eq('country_code', userCountry)
  }

  const { data: trendingRaw } = await trendingQuery
    .order('ranking_score', { ascending: false })
    .limit(10)

  const trending: ListingWithImages[] = (trendingRaw || []).map(l => ({
    ...l,
    likes_count: l.likes_count ?? 0,
    saves_count: l.saves_count ?? 0,
    comments_count: l.comments_count ?? 0,
  }))

  // ── Main feed: ranked by algorithm or chronological ──
  let feedQuery = supabase
    .from('listings')
    .select(listingSelect)
    .eq('status', 'active')

  if (userCountry && !isGlobal) {
    feedQuery = feedQuery.eq('country_code', userCountry)
  }

  if (sortMode === 'top') {
    // Algorithm: ranking_score descending, with created_at as tiebreaker
    feedQuery = feedQuery
      .order('ranking_score', { ascending: false })
      .order('created_at', { ascending: false })
  } else {
    // Chronological: newest first
    feedQuery = feedQuery
      .order('created_at', { ascending: false })
  }

  const { data: feedRaw } = await feedQuery.limit(30)

  const listings: ListingWithImages[] = (feedRaw || []).map(l => ({
    ...l,
    likes_count: l.likes_count ?? 0,
    saves_count: l.saves_count ?? 0,
    comments_count: l.comments_count ?? 0,
  }))

  // Build sort toggle URL
  const sortToggleUrl = sortMode === 'top'
    ? (isGlobal ? '/?global=1&sort=new' : '/?sort=new')
    : (isGlobal ? '/?global=1' : '/')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Search */}
        <DynamicHero />

        {/* Trending strip — community ticker */}
        <TrendingStrip items={trending} />

        {/* Main grid */}
        <div className="container mx-auto px-4 py-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Sort toggle */}
              <Link
                href={sortMode === 'top' ? (isGlobal ? '/?global=1' : '/') : sortToggleUrl}
                className={`text-sm font-medium transition-colors ${
                  sortMode === 'top' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Destacados
              </Link>
              <Link
                href={sortMode === 'new' ? (isGlobal ? '/?global=1&sort=new' : '/?sort=new') : sortToggleUrl}
                className={`text-sm font-medium transition-colors ${
                  sortMode === 'new' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Recientes
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {userCountry && (
                <Link
                  href={isGlobal ? '/' : '/?global=1'}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {isGlobal ? (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.listings.onlyIn} {userCountry}</span>
                  ) : t.listings.seeAll}
                </Link>
              )}
              <Link
                href="/listings/new"
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-3 w-3" />
                Publicar
              </Link>
            </div>
          </div>

          {listings.length > 0 ? (
            <CommunityFeed initialListings={listings} />
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-4">
                {userCountry && !isGlobal
                  ? t.listings.noListingsInRegion
                  : t.listings.noListings}
              </p>
              {userCountry && !isGlobal && (
                <Link href="/?global=1" className="text-sm text-blue-600 hover:underline block mb-4">
                  {t.listings.seeWorldwide}
                </Link>
              )}
              <Button asChild size="sm">
                <Link href="/listings/new">{t.listings.postListing}</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
