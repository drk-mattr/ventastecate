// Items engine — type page (§8, §12: 034C Discovery, 034D Activity).
//
// /tipos/<slug>: the kind, its offers (businesses offering it, with
// evidence), and the listings mentioning it. A parent kind shows the
// offers of all its approved descendants. Lists are always (kind ×
// place): the place is the site-wide location scope (vt_region cookie;
// ?region= overrides for a shared link only — same rule as
// /businesses).
//
// Ordering (034D): two lists, two honest labels (§7).
//   - "En tendencia" — activity-ordered (activity_score, §7.1),
//     numbered, rendered ONLY when the §11.3 confidence gate passes
//     (>= 3 scoring items in Tecate, >= 5 / 2 towns / 5 users
//     elsewhere, leader with >= 3 distinct contributors). Below
//     the gate there is no trending list at all.
//   - "Más mencionados" — the mention-count sort (distinct
//     contributors, then mentions). Numbered only when the same
//     gate passes; with mentions but no gate, the list shows
//     unnumbered with the honest note ("Todavía no hay suficiente
//     para ordenar."); with zero mentions anywhere the heading is
//     neutral ("Negocios que lo ofrecen") — a list of "Sin
//     menciones" rows is not a ranking.
// No "Más recomendados" / "Lo mejor de Tecate" anywhere: there is
// no item_feedback data, so no recommendation_score exists (§7.2).
//
// A pending kind renders too (its name is already visible on the
// business page that links here); it has no parent breadcrumb and no
// children. A merged kind redirects to its target; a rejected or
// unknown slug 404s.

import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { CommunityFeed } from '@/components/home/community-feed'
import { EmptyState } from '@/components/ui/empty-state'
import { Tag, ChevronRight } from 'lucide-react'
import {
  LOCATION_COOKIE,
  LOCATION_OPTIONS,
  townsForLocation,
} from '@/lib/business-regions'
import { fetchItemsEvidence } from '@/lib/items/evidence'
import { fetchItemActivity, TRENDING_LIMIT } from '@/lib/items/activity'
import type { Metadata } from 'next'
import type { ListingWithImages } from '@/lib/types/database'

type KindRow = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  status: string
  merge_to: string | null
}

type BusinessRow = {
  id: string
  name: string
  category: string | null
  city: string | null
  location: string | null
  image_url: string | null
}

type Offer = {
  itemId: string
  business: BusinessRow
  kindId: string
  kindName: string
  origin: string
  createdAt: string
  mentionCount: number
  contributors: number
  photoUrl: string | null
}

// One offer row, shared by both lists. The rank number shows only
// when the list is a real ranking (gate passed, §7.3); unranked
// lists show the same rows without numbers.
function OfferRow({
  offer,
  rank,
  multiKind,
}: {
  offer: Offer
  rank?: number
  multiKind: boolean
}) {
  return (
    <li className="flex items-start gap-3">
      {rank !== undefined && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-semibold mt-3">
          {rank}
        </span>
      )}
      {offer.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={offer.photoUrl}
          alt=""
          className="h-12 w-12 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <Tag className="h-5 w-5 text-gray-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/businesses/${offer.business.id}`}
          className="text-sm font-medium text-gray-900 hover:underline truncate block"
        >
          {offer.business.name}
        </Link>
        <p className="text-xs text-gray-500">
          {[offer.business.category, offer.business.city || offer.business.location]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {multiKind && <p className="text-xs text-gray-400">{offer.kindName}</p>}
        <p className="text-xs text-gray-500">
          {offer.contributors > 0
            ? `Mencionados por ${offer.contributors} ${offer.contributors === 1 ? 'persona' : 'personas'}`
            : offer.origin === 'owner_claim'
              ? 'Agregado por el dueño'
              : 'Agregados por la comunidad · Sin menciones'}
        </p>
      </div>
    </li>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  if (!admin) return { title: 'Tipos | Ventas Tecate' }
  const { data: kind } = await admin
    .from('item_kinds')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .maybeSingle()
  if (!kind || (kind as KindRow).status === 'rejected') {
    return { title: 'Tipo no encontrado | Ventas Tecate' }
  }
  const name = (kind as KindRow).name
  return {
    // No "| Ventas Tecate" suffix here — the layout's title template
    // adds it (PR #80 lesson: including it renders it twice).
    title: `${name} en Tecate`,
    description: `Negocios en Tecate que ofrecen ${name.toLowerCase()} y las publicaciones que lo mencionan en Ventas Tecate.`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'}/tipos/${slug}`,
    },
  }
}

export default async function TypePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ region?: string }>
}) {
  const { slug } = await params
  const { region } = await searchParams
  const admin = createAdminClient()
  if (!admin) notFound()

  const { data: kindRow } = await admin
    .from('item_kinds')
    .select('id, name, slug, parent_id, status, merge_to')
    .eq('slug', slug)
    .maybeSingle()
  const kind = kindRow as KindRow | null
  if (!kind || kind.status === 'rejected') notFound()
  if (kind.status === 'merged' && kind.merge_to) {
    const { data: target } = await admin
      .from('item_kinds')
      .select('slug')
      .eq('id', kind.merge_to)
      .maybeSingle()
    if ((target as { slug?: string } | null)?.slug) {
      redirect(`/tipos/${(target as { slug: string }).slug}`)
    }
    notFound()
  }
  // From here the kind is 'approved' or 'pending'.

  // Location scope: ?region= for this shared link only, else the header
  // selector's cookie, else Tecate (same rule as /businesses).
  const cookieStore = await cookies()
  const cookieRegion = cookieStore.get(LOCATION_COOKIE)?.value
  const requestedRegion = region === 'Tecate y alrededores' ? 'Alrededores' : region
  const effectiveRegion = LOCATION_OPTIONS.some((o) => o.label === requestedRegion)
    ? requestedRegion!
    : LOCATION_OPTIONS.some((o) => o.label === cookieRegion)
      ? cookieRegion!
      : 'Tecate'
  const scopeTowns = townsForLocation(effectiveRegion)

  // Approved tree, for the parent breadcrumb, the children chips, and
  // the descendant expansion (a parent page shows every child's offers).
  const { data: approvedKinds } = await admin
    .from('item_kinds')
    .select('id, name, slug, parent_id, status')
    .eq('status', 'approved')
    .limit(500)
  const approved = (approvedKinds || []) as KindRow[]
  const byId = new Map(approved.map((k) => [k.id, k]))
  const parent = kind.parent_id ? (byId.get(kind.parent_id) ?? null) : null
  const children = approved.filter((k) => k.parent_id === kind.id)
  const descendantIds = new Set<string>()
  const walk = (id: string) => {
    for (const child of approved.filter((k) => k.parent_id === id)) {
      if (!descendantIds.has(child.id)) {
        descendantIds.add(child.id)
        walk(child.id)
      }
    }
  }
  walk(kind.id)
  const kindIds = [kind.id, ...descendantIds]

  // Visible offers of this kind (and descendants), with their businesses.
  const { data: items } = await admin
    .from('items')
    .select('id, business_id, kind_id, origin, created_by, created_at, kind:item_kinds(id, name, slug)')
    .in('kind_id', kindIds)
    .eq('status', 'visible')
    .order('created_at', { ascending: true })
    .limit(200)
  const itemRows = (items || []) as {
    id: string
    business_id: string
    kind_id: string
    origin: string
    created_by: string | null
    created_at: string
    kind: { id?: string; name?: string; slug?: string } | null
  }[]
  const businessIds = [...new Set(itemRows.map((i) => i.business_id))]
  const { data: businesses } =
    businessIds.length > 0
      ? await admin
          .from('businesses')
          .select('id, name, category, city, location, image_url')
          .in('id', businessIds)
          .limit(200)
      : { data: [] as BusinessRow[] }
  const bizById = new Map(((businesses || []) as BusinessRow[]).map((b) => [b.id, b]))

  const inScope = (b: BusinessRow) =>
    !scopeTowns ||
    scopeTowns.includes(b.city ?? '') ||
    (!b.city && scopeTowns.includes(b.location ?? ''))

  const evidence = await fetchItemsEvidence(
    admin,
    itemRows.map((i) => i.id),
  )

  const allOffers: Offer[] = []
  for (const item of itemRows) {
    const biz = bizById.get(item.business_id)
    if (!biz) continue
    const ev = evidence.get(item.id) ?? {
      mentionCount: 0,
      contributors: 0,
      photoUrl: null,
      latestMentionAt: null,
      listingIds: [],
    }
    allOffers.push({
      itemId: item.id,
      business: biz,
      kindId: item.kind_id,
      kindName: item.kind?.name ?? kind.name,
      origin: item.origin,
      createdAt: item.created_at,
      mentionCount: ev.mentionCount,
      contributors: ev.contributors,
      photoUrl: ev.photoUrl,
    })
  }
  const offers = allOffers.filter((o) => inScope(o.business))
  // "Más mencionados" sort (§7.1): distinct contributors first, then
  // mentions, then newest.
  offers.sort(
    (a, b) =>
      b.contributors - a.contributors ||
      b.mentionCount - a.mentionCount ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const hasMentions = offers.some((o) => o.contributors > 0)
  const totalMentions = offers.reduce((s, o) => s + o.mentionCount, 0)
  const multiKind = new Set(offers.map((o) => o.kindId)).size > 1

  // Activity (§7.1, 034D): the scored rows and the §11.3 gate for
  // this (kind × place). When migration 035 has not been applied
  // yet the helper reports available: false and nothing below
  // renders as a ranking — the page keeps its 034C state.
  const activity =
    offers.length > 0
      ? await fetchItemActivity(admin, kindIds, scopeTowns, effectiveRegion)
      : null
  const showTrending = (activity?.available ?? false) && (activity?.gate.passes ?? false)
  const trendingOffers = showTrending
    ? (activity?.rows ?? [])
        .map((r) => offers.find((o) => o.itemId === r.itemId))
        .filter((o): o is Offer => !!o)
        .slice(0, TRENDING_LIMIT)
    : []

  // Mentioning listings: active listings tagging any in-scope offer,
  // newest first. The listing ids come from the same evidence query.
  const mentionListingIds = [
    ...new Set(
      offers.flatMap(
        (o) =>
          evidence.get(o.itemId)?.listingIds ?? [],
      ),
    ),
  ]
  let mentionListings: ListingWithImages[] = []
  if (mentionListingIds.length > 0) {
    const { data: listings } = await admin
      .from('listings')
      .select(
        `*,
        images:listing_images(id, image_url, order_index),
        profile:profiles(id, username, display_name, avatar_url),
        store:stores(id, slug, name, avatar_url)`,
      )
      .in('id', mentionListingIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20)
    mentionListings = (listings || []) as ListingWithImages[]
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb: parent kind, then this kind. */}
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          {parent ? (
            <>
              <Link href={`/tipos/${parent.slug}`} className="hover:underline">
                {parent.name}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          ) : null}
          <span className="text-gray-700">{kind.name}</span>
        </p>
        <h1 className="text-lg font-semibold leading-tight">{kind.name}</h1>
        <p className="text-xs text-gray-500 mt-1">
          {offers.length > 0
            ? `${offers.length} ${offers.length === 1 ? 'negocio' : 'negocios'} · ${totalMentions} ${totalMentions === 1 ? 'mención' : 'menciones'} · en ${effectiveRegion}`
            : `En ${effectiveRegion}`}
        </p>
        {effectiveRegion !== 'Todas' && (
          <p className="text-xs text-gray-400 mt-1">
            Mostrando {effectiveRegion}.{' '}
            <Link href={`/tipos/${slug}?region=Todas`} className="underline">
              Ver en todas las ubicaciones
            </Link>
          </p>
        )}

        {/* Child kinds: the parent's broader filter, one tap per child. */}
        {children.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500">También:</span>
            {children.map((c) => (
              <Link
                key={c.id}
                href={`/tipos/${c.slug}`}
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* En tendencia (034D): activity-ordered, numbered. Only
            when the §11.3 gate passes — below it there is no trending
            list at all, and the mentions below show unranked. */}
        {showTrending && (
          <section className="mt-6">
            <h2 className="text-base font-semibold mb-3">En tendencia</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trendingOffers.map((o, i) => (
                <OfferRow key={o.itemId} offer={o} rank={i + 1} multiKind={multiKind} />
              ))}
            </ul>
          </section>
        )}

        {/* Offers. */}
        {offers.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-base font-semibold mb-3">
              {hasMentions ? 'Más mencionados' : 'Negocios que lo ofrecen'}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offers.map((o, i) => (
                <OfferRow
                  key={o.itemId}
                  offer={o}
                  rank={showTrending ? i + 1 : undefined}
                  multiKind={multiKind}
                />
              ))}
            </ul>
            {hasMentions && activity?.available && !showTrending && (
              <p className="text-xs text-gray-400 mt-3">
                Todavía no hay suficiente para ordenar.
              </p>
            )}
          </section>
        ) : (
          <EmptyState
            surface
            message={
              allOffers.length > 0
                ? `Hay negocios que ofrecen ${kind.name} en otras ubicaciones, pero ninguno en ${effectiveRegion}.`
                : `Aún no hay negocios que ofrezcan ${kind.name}.`
            }
          >
            {allOffers.length > 0 ? (
              <Link
                href={`/tipos/${slug}?region=Todas`}
                className="text-sm text-gray-900 underline"
              >
                Ver en todas las ubicaciones
              </Link>
            ) : (
              <p className="text-sm text-gray-500">
                Si sabes de un negocio que lo ofrece, agrégalo desde su página con
                “¿Falta algo que venden aquí?”.
              </p>
            )}
          </EmptyState>
        )}

        {/* Mentions: the evidence, newest first. */}
        {mentionListings.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold mb-3">Publicaciones que lo mencionan</h2>
            <CommunityFeed
              initialListings={mentionListings}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
            />
          </section>
        )}
        {offers.length > 0 && mentionListings.length === 0 && (
          <p className="text-xs text-gray-400 mt-8">
            Aún no hay publicaciones que mencionen este tipo.
          </p>
        )}
      </main>
    </div>
  )
}
