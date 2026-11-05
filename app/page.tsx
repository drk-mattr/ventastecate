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

  // Language only: resolveCountry() forces es-MX so border-town visitors on
  // US IPs still get Spanish. It no longer filters the feed (soft region):
  // San Diego / Tijuana / Tecate are one corridor, and a country filter hid
  // US-posted border listings entirely.
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

  // Following feed: listings from sellers the logged-in user follows,
  // newest first, reusing the same card shell as the main feed.
  let followingIds: string[] = []
  let followedBusinessIds: string[] = []
  if (showFollowing) {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id)
      followingIds = (follows || []).map((f) => f.following_id)
      const { data: bizFollows } = await supabase
        .from('business_follows')
        .select('business_id')
        .eq('user_id', currentUser.id)
      followedBusinessIds = (bizFollows || []).map((f) => f.business_id)
      if (followingIds.length > 0) {
        feedQuery = feedQuery.in('user_id', followingIds)
      }
    }
  }

  // Newest first — simple, honest ordering for the local marketplace.
  feedQuery = feedQuery.order('created_at', { ascending: false })

  const { data: feedRaw } = await feedQuery.limit(30)
  // If only businesses are followed, the seller feed must start empty —
  // otherwise the unfiltered newest-30 would leak into Siguiendo.
  let feedListings = showFollowing && followingIds.length === 0 ? [] : feedRaw
  // Following a business adds its mentions to Siguiendo: listings tagged with
  // it, or linked via the junction table, merged and re-sorted newest first.
  if (showFollowing && followedBusinessIds.length > 0) {
    const { data: junction } = await supabase
      .from('listing_business_tags').select('listing_id').in('business_id', followedBusinessIds)
    const junctionIds = (junction || []).map((j) => j.listing_id)
    let bizListings: typeof feedRaw = []
    if (junctionIds.length > 0 || followedBusinessIds.length > 0) {
      const { data } = await supabase
        .from('listings').select(listingSelect).eq('status', 'active')
        .or(`tagged_business_id.in.(${followedBusinessIds.join(',')})${junctionIds.length ? `,id.in.(${junctionIds.join(',')})` : ''}`)
      bizListings = data
    }
    const byId = new Map<string, NonNullable<typeof feedRaw>[number]>()
    for (const l of [...(feedListings || []), ...(bizListings || [])]) byId.set(l.id, l)
    feedListings = [...byId.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 30)
  }

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
              <p className="text-sm text-gray-500 mt-1">Sigue a un vendedor o a un negocio para ver sus anuncios aquí.</p>
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
