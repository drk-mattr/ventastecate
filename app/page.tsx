import Link from 'next/link'
import { Suspense } from 'react'
import { headers, cookies } from 'next/headers'
import { LOCATION_COOKIE, townsForLocation, townFilterOr } from '@/lib/business-regions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TypeShortcuts } from '@/components/home/type-shortcuts'
import { CommunityFeed } from '@/components/home/community-feed'
import { TrendingStrip } from '@/components/home/trending-strip'
import { ItemCarousel } from '@/components/items/item-carousel'
import { fetchTrendingItems } from '@/lib/items/carousel'
import { TopBusinesses, TopBusiness } from '@/components/businesses/top-businesses'
import { FirstVisit } from '@/components/home/first-visit'
import { StoriesRail } from '@/components/stories/stories-rail'
import { ListingWithImages, StoryWithAuthor } from '@/lib/types/database'
import { getEngagementCounts, attachEngagementCounts } from '@/lib/listings/engagement-counts'
import { getTranslations } from '@/lib/i18n'
import { resolveCountry } from '@/lib/mvp-config'

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
    .select('id, created_at, tagged_business_id')
    .eq('status', 'active').gte('created_at', since)
  const recentIds = (recentListings || []).map((l) => l.id)
  // Engagement lives in the per-action tables, not on the listing row
  // (likes_count / saves_count / comments_count were dropped by
  // migration 016 and never existed on prod) — count rows here.
  const engagement = await getEngagementCounts(supabase, recentIds)
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
    const c = engagement.get(l.id)
    const points = (1 + (c?.likes ?? 0) + (c?.saves ?? 0) * 2.5 + (c?.comments ?? 0) * 1.5) / Math.pow(hoursAge + 2, 1.2)
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

// ── Stories: non-expired, newest first. Lives outside the page
// component for the same purity reason as getTopBusinesses (Date.now()
// is flagged during render). Pre-040 the table does not exist — the
// query fails closed and the rail simply stays hidden.
async function getStories(supabase: Awaited<ReturnType<typeof createClient>>): Promise<StoryWithAuthor[]> {
  const { data } = await supabase
    .from('stories')
    .select('id, image_url, caption, overlays, listing_id, business_id, created_at, expires_at, author:profiles(id, username, display_name, avatar_url)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(24)
  const stories: StoryWithAuthor[] = []
  for (const row of (data || []) as unknown as Array<Record<string, unknown>>) {
    const rawAuthor = row.author
    const author = Array.isArray(rawAuthor) ? rawAuthor[0] : rawAuthor
    if (!author || typeof author !== 'object') continue
    stories.push({ ...(row as object), author } as StoryWithAuthor)
  }
  return stories
}

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient()
  const { feed: feedParam } = await searchParams
  const showFollowing = feedParam === 'siguiendo'

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
  // Case-insensitive (townFilterOr uses ilike): a listing whose city was
  // saved free-typed as "tecate" still matches the "Tecate" town.
  const townFilter = feedTowns ? townFilterOr(feedTowns) : null

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

  // One auth lookup for the page: the Siguiendo branch and the stories
  // rail (add-story affordance) both need to know if someone is signed in.
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Following feed: listings from sellers the logged-in user follows,
  // newest first, reusing the same card shell as the main feed.
  let followingIds: string[] = []
  let followedBusinessIds: string[] = []
  if (showFollowing) {
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

  // Primary item mention per trending listing, for the # tag chip
  // (kind wins over category when present). listing_item_tags is
  // publicly readable for tags on visible items + active listings
  // (034 RLS), so the anon client can run this — no admin needed.
  // At cold start (0 mentions) this is empty and every chip falls
  // back to the listing's category.
  const trendingIds = (trendingRaw || []).map((l) => l.id)
  const primaryKinds: Record<string, { name: string; slug: string }> = {}
  if (trendingIds.length > 0) {
    const { data: primaryTags } = await supabase
      .from('listing_item_tags')
      .select('listing_id, item:items(kind:item_kinds(name, slug, status))')
      .in('listing_id', trendingIds)
      .eq('is_primary', true)
    for (const t of ((primaryTags || []) as unknown) as {
      listing_id: string
      item: unknown
    }[]) {
      // PostgREST types the to-one embeds as arrays; normalize both shapes.
      const item = (Array.isArray(t.item) ? t.item[0] : t.item) as {
        kind?: unknown
      } | null
      const kindRaw = item?.kind
      const kind = (Array.isArray(kindRaw) ? kindRaw[0] : kindRaw) as {
        name: string
        slug: string
        status: string
      } | null
      if (kind && kind.status === 'approved') {
        primaryKinds[t.listing_id] = { name: kind.name, slug: kind.slug }
      }
    }
  }

  const topBusinesses = await getTopBusinesses(supabase, feedTowns)
  const stories = await getStories(supabase)

  // ── Trending items: the cross-kind "En tendencia" carousel
  // (034D activity ordering + §11.3 gate, same as the type pages).
  // Renders nothing until the gate passes — at cold start (0
  // mentions) the row simply does not exist.
  const admin = createAdminClient()
  const trendingItems = admin
    ? await fetchTrendingItems(admin, feedTowns, cookieStore.get(LOCATION_COOKIE)?.value || 'Tecate')
    : { cards: [], available: false }

  // Real engagement counts for the feed + trending rows, in one call.
  // The `*` select above never carries likes/saves/comments (those
  // columns don't exist on prod), so without this the trending gate
  // below would always see 0 and the strip could never render.
  const homeEngagement = await getEngagementCounts(
    supabase,
    [...(feedListings || []).map((l) => l.id), ...(trendingRaw || []).map((l) => l.id)],
  )

  const listings: ListingWithImages[] = attachEngagementCounts(
    feedListings || [],
    homeEngagement,
  )

  const trending: ListingWithImages[] = attachEngagementCounts(
    trendingRaw || [],
    homeEngagement,
  ).filter((l) => l.likes_count + l.saves_count + l.comments_count > 0)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Stories: circles at the top, WhatsApp/Instagram pattern.
            Renders nothing until a real story exists (or someone is
            signed in and can add one). */}
        <StoriesRail stories={stories} signedIn={Boolean(currentUser)} currentUserId={currentUser?.id ?? null} />
        {/* No hero anymore: search lives in the header nav bar, and this
            slim row keeps the type/category shortcuts. The space the
            hero took is now the Top section below. */}
        {/* TypeShortcuts reads the URL for its selected pill, so it
            needs a Suspense boundary (useSearchParams). */}
        <Suspense>
          <TypeShortcuts />
        </Suspense>

        {/* Trending: only when engagement exists, so it never shows an empty row */}
        {trending.length > 0 && <TrendingStrip items={trending} locationLabel={cookieStore.get(LOCATION_COOKIE)?.value || 'Tecate'} primaryKinds={primaryKinds} />}
        {/* Trending items: only when the §11.3 gate passes, so it never shows an empty row */}
        {trendingItems.cards.length > 0 && <ItemCarousel items={trendingItems.cards} />}
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
          {/* No heading here: the tabs above already say
              "Anuncios Recientes" / "Siguiendo" — repeating it as an
              H2 was a duplicate line every competitor app skips. */}
          {listings.length > 0 ? (
            <CommunityFeed initialListings={listings} />
          ) : showFollowing ? (
            <div className="rounded-xl border bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-gray-900">Aún no sigues a nadie.</p>
              <p className="text-sm text-gray-500 mt-1">Sigue a un vendedor o a un negocio para ver sus anuncios aquí.</p>
            </div>
          ) : (
            <FirstVisit place={cookieStore.get(LOCATION_COOKIE)?.value || 'Tecate'} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
