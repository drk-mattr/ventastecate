// Items engine — "Lo que ofrecen aquí" on the business page (§8, 034B).
//
// Server component. Lists the business's offerings (up to 5, ordered
// by all-time mentions — there is no activity score yet; 034D adds
// it), each with its EVIDENCE LEVEL, plus the affordance to add an
// offering without a full publication.
//
// Evidence levels (§8):
//   - "Mencionados por N personas" — mentions from distinct users.
//   - "Agregado por el dueño" — the claimed owner put it there.
//   - "Agregados por la comunidad · Sin menciones" — it exists because
//     someone added it, but nobody has posted about it yet.
//
// The photo of an offering is the first photo of its most recent
// ACTIVE listing where the offering is the PRIMARY tag (§9): a photo
// only evidences the item(s) it shows, so a secondary tag never
// lends its photo to another offering. No primary mention, no photo.
//
// NOTE on the client: this reads with the service-role client,
// because an offering's display name lives on its kind, and RLS
// hides pending kinds from anonymous readers — an offering created
// from a newly proposed kind would render nameless. The queries are
// explicitly filtered to visible offerings of this business and
// active listings only; nothing else is exposed.

import { createAdminClient } from '@/lib/supabase/admin'
import { AddOfferingForm } from './add-offering-form'
import { ItemReportButton } from './item-report-button'
import { Tag } from 'lucide-react'

type OfferingRow = {
  id: string
  kindName: string
  kindSlug: string
  origin: string
  createdBy: string | null
  creatorUsername: string | null
  createdAt: string
  mentionCount: number
  contributors: number
  photoUrl: string | null
  latestMentionAt: string | null
}

const MAX_SHOWN = 5

export async function BusinessOfferings({
  businessId,
  businessCategory,
}: {
  businessId: string
  businessCategory?: string | null
}) {
  const admin = createAdminClient()
  if (!admin) return null

  const { data: items } = await admin
    .from('items')
    .select('id, origin, created_by, created_at, kind:item_kinds(id, name, slug)')
    .eq('business_id', businessId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true })

  const rows: OfferingRow[] = []
  const itemIds = (items || []).map((i) => i.id)
  if (itemIds.length > 0) {
    const { data: tags } = await admin
      .from('listing_item_tags')
      .select(
        'item_id, is_primary, listing:listings(id, user_id, status, created_at, images:listing_images(image_url, order_index))',
      )
      .in('item_id', itemIds)

    const creatorIds = [...new Set((items || []).map((i) => i.created_by).filter(Boolean))] as string[]
    const usernames = new Map<string, string>()
    if (creatorIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, username')
        .in('id', creatorIds)
      for (const p of profiles || []) {
        if (p.username) usernames.set(p.id, p.username)
      }
    }

    for (const item of items || []) {
      const kind = item.kind as { name?: string; slug?: string } | null
      if (!kind?.name) continue
      const itemTags = (tags || []).filter((t) => t.item_id === item.id)
      const activeTags = itemTags.filter(
        (t) => (t.listing as { status?: string } | null)?.status === 'active',
      )
      const contributors = new Set(
        activeTags.map((t) => (t.listing as { user_id?: string } | null)?.user_id).filter(Boolean),
      )
      // Best photo: most recent ACTIVE listing where this offering is
      // the PRIMARY tag; its first image by order_index.
      let photoUrl: string | null = null
      const primaryActive = activeTags
        .filter((t) => t.is_primary)
        .sort(
          (a, b) =>
            new Date(
              (b.listing as { created_at?: string } | null)?.created_at ?? 0,
            ).getTime() -
            new Date((a.listing as { created_at?: string } | null)?.created_at ?? 0).getTime(),
        )
      for (const tag of primaryActive) {
        const images = (
          (tag.listing as { images?: { image_url: string; order_index: number }[] } | null)
            ?.images || []
        )
          .filter((img) => img.image_url)
          .sort((a, b) => a.order_index - b.order_index)
        if (images.length > 0) {
          photoUrl = images[0].image_url
          break
        }
      }
      const latestMentionAt =
        activeTags.length > 0
          ? activeTags
              .map((t) => (t.listing as { created_at?: string } | null)?.created_at ?? '')
              .sort()
              .pop() ?? null
          : null
      rows.push({
        id: item.id,
        kindName: kind.name,
        kindSlug: kind.slug ?? '',
        origin: item.origin,
        createdBy: item.created_by,
        creatorUsername: item.created_by ? (usernames.get(item.created_by) ?? null) : null,
        createdAt: item.created_at,
        mentionCount: activeTags.length,
        contributors: contributors.size,
        photoUrl,
        latestMentionAt,
      })
    }
  }

  rows.sort(
    (a, b) =>
      b.mentionCount - a.mentionCount ||
      b.contributors - a.contributors ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const shown = rows.slice(0, MAX_SHOWN)
  const extra = rows.length - shown.length

  // No offerings yet: the page looks like today, plus the subtle
  // affordance to add the first one (§8: the contribution must be
  // cheap — nobody should have to write a full post to say they
  // sell tamales de rajas).
  if (rows.length === 0) {
    return (
      <div className="border-b pb-6 mb-6">
        <AddOfferingForm businessId={businessId} businessCategory={businessCategory} />
      </div>
    )
  }

  return (
    <div className="border-b pb-6 mb-6">
      <h2 className="text-base font-medium mb-4 text-gray-700">Lo que ofrecen aquí</h2>
      <ul className="space-y-3">
        {shown.map((row) => (
          <li key={row.id} className="flex items-start gap-3">
            {row.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.photoUrl}
                alt=""
                className="h-12 w-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Tag className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{row.kindName}</p>
              <p className="text-xs text-gray-500">
                {row.contributors > 0
                  ? `Mencionados por ${row.contributors} ${row.contributors === 1 ? 'persona' : 'personas'}`
                  : row.origin === 'owner_claim'
                    ? 'Agregado por el dueño'
                    : 'Agregados por la comunidad · Sin menciones'}
              </p>
              <p className="text-xs text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {row.creatorUsername && (
                  <span>
                    Agregada por @{row.creatorUsername}
                    {' · '}
                    {new Date(row.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
                <ItemReportButton itemId={row.id} businessId={businessId} />
              </p>
            </div>
          </li>
        ))}
      </ul>
      {extra > 0 && <p className="text-xs text-gray-400 mt-3">y {extra} más</p>}
      <div className="mt-4">
        <AddOfferingForm businessId={businessId} businessCategory={businessCategory} />
      </div>
    </div>
  )
}
