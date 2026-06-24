import Link from 'next/link'
import { MapPin, Plus } from 'lucide-react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { DynamicHero } from '@/components/home/dynamic-hero'
import { CommunityFeed } from '@/components/home/community-feed'
import { ListingWithImages } from '@/lib/types/database'
import { EmptyState } from '@/components/ui/empty-state'
import { getTranslations } from '@/lib/i18n'
import { LOCK_TO_TECATE, resolveCountry } from '@/lib/mvp-config'

interface HomeProps {
  searchParams: Promise<{ global?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient()
  const { global: globalParam } = await searchParams
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

  // Newest first — simple, honest ordering for the local marketplace.
  feedQuery = feedQuery.order('created_at', { ascending: false })

  const { data: feedRaw } = await feedQuery.limit(30)

  const listings: ListingWithImages[] = (feedRaw || []).map(l => ({
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

        {/* Main grid */}
        <div className="container mx-auto px-4 py-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">{t.listings.recent}</h2>
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
                className="hidden md:flex items-center gap-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:border-gray-400 hover:text-gray-900 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-3 w-3" />
                Publicar
              </Link>
            </div>
          </div>

          {listings.length > 0 ? (
            <CommunityFeed initialListings={listings} />
          ) : (
            <EmptyState
              imageSrc="/box_empty.png"
              imageAlt="Aún no hay anuncios"
              message="Aún no se ha publicado nada en Tecate."
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
