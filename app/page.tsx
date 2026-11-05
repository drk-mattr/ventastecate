import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { headers, cookies } from 'next/headers'
import { LOCATION_COOKIE, townsForLocation } from '@/lib/business-regions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TypeShortcuts } from '@/components/home/type-shortcuts'
import { CommunityFeed } from '@/components/home/community-feed'
import { TrendingStrip } from '@/components/home/trending-strip'
import { TopBusinesses, TopBusiness } from '@/components/businesses/top-businesses'
import { FirstVisit } from '@/components/home/first-visit'
import { ListingWithImages } from '@/lib/types/database'
import { getTranslations } from '@/lib/i18n'
import { LOCK_TO_TECATE, resolveCountry } from '@/lib/mvp-config'

interface HomeProps {
  searchParams: Promise<{ global?: string; feed?: string }>
}

// Alive-score computation lives outside the page component: Date.now()
// is flagged as impure during render by the repo's purity lint.
async function getTopBusinesses(supabase: Awaited<ReturnType<typeof createClient>>, towns: string[] | null): Promise<TopBusiness[]> {
// ── Top negocios: alive score, last 30 days only ──
// Per design doc (hidden_files/business-ranking-design-2026-11-04.md):
// a business ranks on what happened under its shell recently, not on
// all-time totals, so old shells cannot sit on top forever.
let topBusinesses: TopBusiness[] = []
{
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  let businessesQuery = supabase.from('businesses').select('id, name, location, category, mention_count, followers_count')
  if (towns) businessesQuery = businessesQuery.in('city', towns)
  const { data: businesses } = await businessesQuery
  const { data: recentListings } = await supabase.from('listings')
    .select('id, created_at, likes_count, saves_count, comments_count, tagged_business_id')
    .eq('status', 'active').gte('created_at', since)
  const recentIds = (recentListings || []).map((l) => l.id)
  const { data: recentTags } = recentIds.length > 0
    ? await supabase.from('listing_business_tags').select('listing_id, business_id').in('listing_id', recentIds)
    : { data: [] as { listing_id: string; business_id: string }[] }
  const { data: recentFollows } = await supabase.from('business_follows').select('business_id').gte('created_at', since)
  const { data: recentLikes } = await supabase.from('business_likes').select('business_id').gte('created_at', since)
  const score = new Map<string, { points: number; mentions: number; lastMention: number }>()
  const add = (id: string, points: number, isMention: boolean, ts?: number) => {
    const cur = score.get(id) || { points: 0, mentions: 0, lastMention: 0 }
    cur.points += points
    if (isMention) { cur.mentions += 1; cur.lastMention = Math.max(cur.lastMention, ts || 0) }
    score.set(id, cur)
  }
  const now = Date.now()
  for (const l of recentListings || []) {
    const hoursAge = Math.max((now - new Date(l.created_at).getTime()) / 3600000, 0)
    const points = (1 + (l.likes_count ?? 0) + (l.saves_count ?? 0) * 2.5 + (l.comments_count ?? 0) * 1.5) / Math.pow(hoursAge + 2, 1.2)
    const ids = new Set<string>()
    if (l.tagged_business_id) ids.add(l.tagged_business_id)
    for (const tag of recentTags || []) if (tag.listing_id === l.id) ids.add(tag.business_id)
    for (const id of ids) add(id, points, true, new Date(l.created_at).getTime())
  }
  for (const f of recentFollows || []) add(f.business_id, 2, false)
  for (const lk of recentLikes || []) add(lk.business_id, 1, false)
  const byId = new Map((businesses || []).map((b) => [b.id, b]))
  topBusinesses = [...score.entries()]
    .filter(([, s]) => s.points > 0)
    .sort((a, b) => b[1].points - a[1].points || b[1].lastMention - a[1].lastMention || ((byId.get(b[0])?.mention_count ?? 0) - (byId.get(a[0])?.mention_count ?? 0)))
    .slice(0, 20)
    .map(([id, s]) => {
      const b = byId.get(id)
      return b ? { id, name: b.name, location: b.location, category: b.category, mentionCount30: s.mentions, followersCount: b.followers_count ?? 0 } : null
    })
    .filter((b): b is TopBusiness => b !== null)
}
  return topBusinesses
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

  // Site-wide location: the header selector's cookie, default Tecate.
  // Listings carry city and/or a free-text location, so the filter covers
  // both (old community posts have city null but location set).
  const cookieStore = await cookies()
  const feedTowns = townsForLocation(cookieStore.get(LOCATION_COOKIE)?.value)
  const townFilter = feedTowns ? `city.in.(${feedTowns.join(',')}),location.in.(${feedTowns.join(',')})` : null

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
  if (townFilter) feedQuery = feedQuery.or(townFilter)

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
  if (townFilter) trendingQuery = trendingQuery.or(townFilter)

  trendingQuery = trendingQuery
    .order('ranking_score', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: trendingRaw } = await trendingQuery.limit(12)

  const topBusinesses = await getTopBusinesses(supabase, feedTowns)

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
        {/* No hero anymore: search lives in the header nav bar, and this
            slim row keeps the type/category shortcuts. The space the
            hero took is now the Top section below. */}
        <TypeShortcuts />

        {/* Trending: only when engagement exists, so it never shows an empty row */}
        {trending.length > 0 && <TrendingStrip items={trending} />}
        <TopBusinesses items={topBusinesses} />

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
          {/* Header row: feed only — the feed-area Publicar was removed
              2026-11-04, the header's orange Publicar is the one CTA. */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{showFollowing ? 'Siguiendo' : t.listings.recent}</h2>
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
