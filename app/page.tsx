import Link from 'next/link'
import { MapPin, Plus } from 'lucide-react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { DynamicHero } from '@/components/home/dynamic-hero'
import { CommunityFeed } from '@/components/home/community-feed'
import { TrendingStrip } from '@/components/home/trending-strip'
import { FirstVisit } from '@/components/home/first-visit'
import { ListingWithImages } from '@/lib/types/database'
import { getTranslations } from '@/lib/i18n'
import { LOCK_TO_TECATE, resolveCountry } from '@/lib/mvp-config'

interface HomeProps {
  searchParams: Promise<{ global?: string; feed?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient()
  const { global: globalParam, feed: feedParam } = await searchParams
  const showFollowing = feedParam === 'siguiendo'
  // MVP: the worldwide view is disabled while locked to Tecate.
  const isGlobal = !LOCK_TO_TECATE && globalParam === '1'

  // Detect user country via Cloudflare header; resolveCountry() forces the MVP
  // market (MX) so border-town visitors on US IPs see Tecate listings.
  const headersList = await headers()
  const userCountry = resolveCountry(headersList.get('cf-ipcountry') ?? null)
  const t = getTranslations(userCountry)

  const listingSelect = `
    *,
    images:listing_images( id, image_url, order_index ),
    profile:profiles( id, username, display_name, avatar_url ),
    store:stores( id, slug, name, avatar_url )
  `

  // ── Main feed: newest first ──
  let feedQuery = supabase
    .from('listings')
    .select(listingSelect)
    .eq('status', 'active')

  if (userCountry && !isGlobal) {
    feedQuery = feedQuery.eq('country_code', userCountry)
  }

  // Following feed: listings from sellers the logged-in user follows,
  // newest first, reusing the same card shell as the main feed.
  let followingIds: string[] = []
  if (showFollowing) {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id)
      followingIds = (follows || []).map((f) => f.following_id)
      if (followingIds.length > 0) {
        feedQuery = feedQuery.in('user_id', followingIds)
      }
    }
  }

  // Newest first — simple, honest ordering for the local marketplace.
  feedQuery = feedQuery.order('created_at', { ascending: false })

  const { data: feedRaw } = await feedQuery.limit(30)
  const feedListings = showFollowing && followingIds.length === 0 ? [] : feedRaw

  const listings: ListingWithImages[] = (feedListings || []).map(l => ({
    ...l,
    likes_count: l.likes_count ?? 0,
    saves_count: l.saves_count ?? 0,
    comments_count: l.comments_count ?? 0,
  }))

  // ── Trending: engagement-ranked, so good posts actually get seen ──
  // The ranking_score formula (likes 1, comments 1.5, saves 2.5,
  // conversations 4, with time decay) already exists in the DB and is used
  // by search, but the homepage previously ignored it entirely.
  let trendingQuery = supabase
    .from('listings')
    .select(listingSelect)
    .eq('status', 'active')

  if (userCountry && !isGlobal) {
    trendingQuery = trendingQuery.eq('country_code', userCountry)
  }

  trendingQuery = trendingQuery
    .order('ranking_score', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: trendingRaw } = await trendingQuery.limit(12)

  const trending: ListingWithImages[] = (trendingRaw || [])
    .filter(l => (l.likes_count ?? 0) + (l.saves_count ?? 0) + (l.comments_count ?? 0) > 0)
    .map(l => ({
      ...l,
      likes_count: l.likes_count ?? 0,
      saves_count: l.saves_count ?? 0,
      comments_count: l.comments_count ?? 0,
    }))

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Search */}
        <DynamicHero />

        {/* Trending: only when engagement exists, so it never shows an empty row */}
        {trending.length > 0 && <TrendingStrip items={trending} />}

        {/* Main grid */}
        <div className="container mx-auto px-4 py-5">
          {/* Feed tabs: Recientes / Siguiendo */}
          <div className="flex items-center gap-4 mb-4 border-b border-gray-200">
            <Link href="/" className={`pb-2 text-sm font-semibold ${!showFollowing ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
              {t.listings.recent}
            </Link>
            <Link href="/?feed=siguiendo" className={`pb-2 text-sm font-semibold ${showFollowing ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
              Siguiendo
            </Link>
          </div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{showFollowing ? 'Siguiendo' : t.listings.recent}</h2>
            <div className="flex items-center gap-3">
              {!LOCK_TO_TECATE && userCountry && (
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
                className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-full transition-colors"
              >
                <Plus className="h-4 w-4" />
                Publicar
              </Link>
            </div>
          </div>

          {listings.length > 0 ? (
            <CommunityFeed initialListings={listings} />
          ) : showFollowing ? (
            <div className="rounded-xl border bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-gray-900">Aún no sigues a nadie.</p>
              <p className="text-sm text-gray-500 mt-1">Sigue a un vendedor para ver sus anuncios aquí.</p>
            </div>
          ) : (
            <FirstVisit />
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
