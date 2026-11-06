// Items engine — server-side kind resolution + offering upsert (§5, §6).
//
// Used by POST /api/listings/[id]/item-tags and POST
// /api/businesses/[id]/items. Both routes run with the service-role
// client, so every check the RLS would do for a direct insert is
// enforced here in code first.
//
// Rules:
// - A kind named by the user is looked up by slug. If it exists it is
//   reused (a merged kind follows merge_to); if not, it is created
//   pending and parentless — it stays out of the tree until a
//   moderator places it (§4, §5).
// - Two concurrent creations of the same kind collide on the unique
//   slug and the second resolves to the existing row (conflict-safe
//   upsert, never check-then-create).
// - An offering is upserted on UNIQUE(business_id, kind_id): creating
//   the same (business, kind) twice resolves to the existing row.
// - An offering whose status is not 'visible' is never returned as
//   usable — the caller decides what to do with it.

import type { SupabaseClient } from '@supabase/supabase-js'
import { slugifyKindName, isValidKindSlug } from './normalize'
import type { ItemOrigin } from './types'

export type KindInput = { kind_id?: string; kind_name?: string }

export type ResolvedKind = {
  kindId: string
  kindName: string
  kindCreated: boolean
}

type KindRow = {
  id: string
  name: string
  status: string
  merge_to: string | null
}

function followMerge(row: KindRow): string {
  return row.status === 'merged' && row.merge_to ? row.merge_to : row.id
}

export async function resolveKind(
  admin: SupabaseClient,
  userId: string,
  input: KindInput,
): Promise<ResolvedKind> {
  if (input.kind_id) {
    const { data, error } = await admin
      .from('item_kinds')
      .select('id, name, status, merge_to')
      .eq('id', input.kind_id)
      .single()
    if (error || !data) throw new Error('Tipo no encontrado')
    if (data.status === 'rejected') throw new Error('Ese tipo no está disponible')
    const kindId = followMerge(data as KindRow)
    let kindName = (data as KindRow).name
    if (kindId !== data.id) {
      const { data: target } = await admin
        .from('item_kinds')
        .select('name')
        .eq('id', kindId)
        .maybeSingle()
      if (target) kindName = target.name
    }
    return { kindId, kindName, kindCreated: false }
  }

  const name = (input.kind_name || '').trim()
  if (name.length < 2 || name.length > 80) {
    throw new Error('Escribe el nombre de lo que probaste (2 a 80 caracteres)')
  }
  const slug = slugifyKindName(name)
  if (!isValidKindSlug(slug)) {
    throw new Error('No se pudo crear ese tipo con ese nombre')
  }

  // Reuse the existing kind when the slug already exists (exact
  // normalized collision resolves to the existing row, §5).
  const { data: existing } = await admin
    .from('item_kinds')
    .select('id, name, status, merge_to')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) {
    if (existing.status === 'rejected') throw new Error('Ese tipo no está disponible')
    return { kindId: followMerge(existing as KindRow), kindName: existing.name, kindCreated: false }
  }

  // Create pending + parentless. ignoreDuplicates makes the concurrent
  // race safe: on conflict nothing is inserted and we re-read the row
  // the other request created.
  const { data: created } = await admin
    .from('item_kinds')
    .upsert(
      { slug, name, status: 'pending', parent_id: null, created_by: userId },
      { onConflict: 'slug', ignoreDuplicates: true },
    )
    .select('id, name')
  const createdRow = (created as { id: string; name: string }[] | null)?.[0]
  if (createdRow) return { kindId: createdRow.id, kindName: createdRow.name, kindCreated: true }

  const { data: retry } = await admin
    .from('item_kinds')
    .select('id, name, status')
    .eq('slug', slug)
    .maybeSingle()
  if (!retry || retry.status === 'rejected') throw new Error('No se pudo crear el tipo')
  return { kindId: retry.id, kindName: retry.name, kindCreated: false }
}

export type UpsertedItem = {
  id: string
  business_id: string
  kind_id: string
  origin: ItemOrigin
  status: string
  created_by: string | null
  created_at: string
  created: boolean
}

export async function upsertItem(
  admin: SupabaseClient,
  userId: string,
  businessId: string,
  kindId: string,
  origin: ItemOrigin,
): Promise<UpsertedItem> {
  const { data: inserted } = await admin
    .from('items')
    .upsert(
      {
        business_id: businessId,
        kind_id: kindId,
        origin,
        status: 'visible',
        created_by: userId,
      },
      { onConflict: 'business_id,kind_id', ignoreDuplicates: true },
    )
    .select('id, business_id, kind_id, origin, status, created_by, created_at')
  const row = (inserted as UpsertedItem[] | null)?.[0]
  if (row) return { ...row, created: true }

  // Conflict: the offering already exists — resolve to it.
  const { data: existing, error } = await admin
    .from('items')
    .select('id, business_id, kind_id, origin, status, created_by, created_at')
    .eq('business_id', businessId)
    .eq('kind_id', kindId)
    .single()
  if (error || !existing) throw new Error('No se pudo guardar la oferta')
  return { ...(existing as UpsertedItem), created: false }
}

// Best-effort audit write: the history matters, but a failed audit
// insert must never fail the user's action. Loud in the logs instead.
export async function auditItemEvent(
  admin: SupabaseClient,
  event: { item_id?: string | null; kind_id?: string | null; actor_id: string; event: string; details?: Record<string, unknown> },
): Promise<void> {
  const { error } = await admin.from('item_audit_events').insert({
    item_id: event.item_id ?? null,
    kind_id: event.kind_id ?? null,
    actor_id: event.actor_id,
    event: event.event,
    details: event.details ?? null,
  })
  if (error) console.error('item_audit_events insert error:', error.message)
}
