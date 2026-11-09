import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSuperadminProfile } from '@/lib/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import type { Report } from '@/lib/types/database'
import { formatVideoDuration } from '@/lib/video/validate'

const STATUS_LABEL: Record<string, string> = { new: 'Nuevo', reviewed: 'En revisión', resolved: 'Resuelto' }
const TYPE_LABEL: Record<string, string> = {
  bug: 'Bug', suggestion: 'Sugerencia', other: 'Otro',
  spam: 'Spam o duplicado', scam: 'Fraude o estafa', prohibited: 'Artículo prohibido',
  offensive: 'Contenido ofensivo', listing_other: 'Otro motivo',
  message_spam: 'Spam (mensaje)', message_harassment: 'Acoso (mensaje)',
  message_scam: 'Fraude (mensaje)', message_offensive: 'Ofensivo (mensaje)',
  message_other: 'Otro (mensaje)',
  story_spam: 'Historia: spam', story_offensive: 'Historia: contenido ofensivo',
  story_prohibited: 'Historia: contenido prohibido', story_other: 'Historia: otro motivo',
  item_comment_spam: 'Comentario (artículo): spam', item_comment_offensive: 'Comentario (artículo): contenido ofensivo',
  item_comment_prohibited: 'Comentario (artículo): contenido prohibido', item_comment_other: 'Comentario (artículo): otro motivo',
  business_review_spam: 'Opinión (negocio): spam', business_review_offensive: 'Opinión (negocio): contenido ofensivo',
  business_review_prohibited: 'Opinión (negocio): contenido prohibido', business_review_other: 'Opinión (negocio): otro motivo',
}

// B7: one-tap flags on a business offering land in `item_reports`,
// a separate table the flag route writes to — not in `reports`.
// The flag's own status stays authoritative and the report API is
// untouched; flags are surfaced here as inbox entries instead, so a
// moderator can see them. There is no status-change UI for a flag
// yet; each entry links to the offering so it can be inspected.
type ItemFlag = {
  id: string
  item_id: string
  kind_id: string | null
  reporter_id: string | null
  reason: string
  status: string
  created_at: string
}
const ITEM_FLAG_REASON_LABEL: Record<string, string> = {
  incorrecto: 'Información incorrecta',
  duplicado: 'Duplicado',
  spam: 'Spam',
  prohibido: 'Contenido prohibido',
  otro: 'Otro motivo',
}

type InboxEntry = {
  key: string
  href: string
  typeLabel: string
  status: string
  createdAt: string
  description: string
  meta: string
  /** Native video (migration 050): duration + poster frame, so the
   * moderator can triage a video report without opening the detail
   * page. Set only when the reported listing has a native clip. */
  video?: { durationSeconds: number | null; thumbnailUrl: string | null }
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; type?: string }> }) {
  const admin = await getSuperadminProfile()
  if (!admin) redirect('/login')
  const sp = await searchParams
  const supabase = await createClient()
  // Pre-042 the business_review_id column does not exist yet and the
  // select errors — retry without it so the inbox still lists reports.
  const baseSelect = 'id, type, description, email, listing_id, listing_title, conversation_id, story_id, item_comment_id, reporter_label, status, created_at'
  async function fetchReports(withReview: boolean): Promise<Report[] | null> {
    // A computed select string makes the query builder's inferred row
    // type collapse, so the result is cast back to Report rows.
    const select = withReview ? baseSelect.replace('item_comment_id', 'item_comment_id, business_review_id') : baseSelect
    let q = supabase.from('reports').select(select).order('created_at', { ascending: false })
    if (sp.status) q = q.eq('status', sp.status)
    if (sp.type) q = q.eq('type', sp.type)
    const { data } = await q
    return (data ?? null) as unknown as Report[] | null
  }
  let reports = await fetchReports(true)
  if (!reports) reports = await fetchReports(false)
  const list = reports || []

  // Native video (migration 050): enrich reported listings with
  // their clip's duration + poster frame. Plain query + JS join,
  // same pattern as the flags below. Pre-050 the columns do not
  // exist — the query errors and the enrichment is skipped, never
  // breaking the inbox.
  const videoByListingId = new Map<string, { durationSeconds: number | null; thumbnailUrl: string | null }>()
  const reportListingIds = [...new Set(list.map((r) => r.listing_id).filter((v): v is string => v !== null))]
  if (reportListingIds.length > 0) {
    const { data: videoListings, error: videoError } = await supabase
      .from('listings')
      .select('id, video_storage_path, video_duration_seconds, video_thumbnail_url')
      .in('id', reportListingIds)
    if (!videoError && videoListings) {
      for (const v of videoListings as unknown as { id: string; video_storage_path: string | null; video_duration_seconds: number | null; video_thumbnail_url: string | null }[]) {
        if (v.video_storage_path) {
          videoByListingId.set(v.id, { durationSeconds: v.video_duration_seconds, thumbnailUrl: v.video_thumbnail_url })
        }
      }
    }
  }

  // Offering flags (B7). A type filter hides them: flags carry a
  // reason, not a report type, so they only join the unfiltered view.
  let itemFlags: ItemFlag[] = []
  if (!sp.type) {
    let fq = supabase.from('item_reports').select('id, item_id, kind_id, reporter_id, reason, status, created_at').order('created_at', { ascending: false })
    if (sp.status) fq = fq.eq('status', sp.status)
    const { data } = await fq
    itemFlags = (data ?? []) as unknown as ItemFlag[]
  }
  // Enrich flags with the offering (business · kind) and reporter
  // names, via plain queries + JS joins.
  const itemById = new Map<string, { business_id: string | null; kind_id: string | null }>()
  const kindNameById = new Map<string, string>()
  const businessNameById = new Map<string, string>()
  const reporterNameById = new Map<string, string>()
  if (itemFlags.length > 0) {
    const flagItemIds = [...new Set(itemFlags.map((f) => f.item_id))]
    const flagReporterIds = [...new Set(itemFlags.map((f) => f.reporter_id).filter((v): v is string => v !== null))]
    const { data: items } = await supabase.from('items').select('id, business_id, kind_id').in('id', flagItemIds)
    const itemRows = (items ?? []) as unknown as { id: string; business_id: string | null; kind_id: string | null }[]
    for (const it of itemRows) itemById.set(it.id, it)
    const bizIds = [...new Set(itemRows.map((it) => it.business_id).filter((v): v is string => v !== null))]
    const kindIds = [...new Set([...itemRows.map((it) => it.kind_id), ...itemFlags.map((f) => f.kind_id)].filter((v): v is string => v !== null))]
    if (bizIds.length > 0) {
      const { data: biz } = await supabase.from('businesses').select('id, name').in('id', bizIds)
      for (const b of (biz ?? []) as unknown as { id: string; name: string }[]) businessNameById.set(b.id, b.name)
    }
    if (kindIds.length > 0) {
      const { data: kinds } = await supabase.from('item_kinds').select('id, name').in('id', kindIds)
      for (const k of (kinds ?? []) as unknown as { id: string; name: string }[]) kindNameById.set(k.id, k.name)
    }
    if (flagReporterIds.length > 0) {
      const { data: reporters } = await supabase.from('profiles').select('id, username').in('id', flagReporterIds)
      for (const p of (reporters ?? []) as unknown as { id: string; username: string | null }[]) reporterNameById.set(p.id, p.username ?? '')
    }
  }

  const entries: InboxEntry[] = [
    ...list.map((r): InboxEntry => ({
      key: `report-${r.id}`,
      href: `/admin/reports/${r.id}`,
      typeLabel: TYPE_LABEL[r.type] || r.type,
      status: r.status,
      createdAt: r.created_at,
      description: r.description || r.listing_title || (r.story_id ? 'Historia reportada' : r.item_comment_id ? 'Comentario de artículo reportado' : r.business_review_id ? 'Opinión de negocio reportada' : 'Sin descripción'),
      meta: `${r.reporter_label || 'Anónimo'}${r.listing_title ? ` · ${r.listing_title}` : ''}${r.email ? ` · ${r.email}` : ''}`,
      video: r.listing_id ? videoByListingId.get(r.listing_id) : undefined,
    })),
    ...itemFlags.map((f): InboxEntry => {
      const item = itemById.get(f.item_id)
      const kindName = (item?.kind_id && kindNameById.get(item.kind_id)) || (f.kind_id && kindNameById.get(f.kind_id)) || null
      const businessName = (item?.business_id && businessNameById.get(item.business_id)) || null
      const offering = [businessName, kindName].filter(Boolean).join(' · ') || 'Ofrecimiento'
      const reporter = (f.reporter_id && reporterNameById.get(f.reporter_id)) || 'Anónimo'
      return {
        key: `item-flag-${f.id}`,
        href: `/items/${f.item_id}`,
        typeLabel: 'Ofrecimiento reportado',
        status: f.status,
        createdAt: f.created_at,
        description: `${ITEM_FLAG_REASON_LABEL[f.reason] || f.reason} — ${offering}`,
        meta: `${reporter} · ${offering}`,
      }
    }),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const newCount = entries.filter((e) => e.status === 'new').length

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-1">Reportes</h1>
        <p className="text-sm text-gray-500 mb-6">
          Solo visibles para superadmin. {newCount ? `${newCount} sin revisar.` : 'Nada pendiente.'} Los reportes también llegan a Discord como aviso.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/admin/reports" className={`px-3 py-1.5 rounded-full text-xs font-medium border ${!sp.status ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'}`}>Todos</Link>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <Link key={v} href={`/admin/reports?status=${v}`} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${sp.status === v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'}`}>{l}</Link>
          ))}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500 border rounded-xl p-6 text-center">No hay reportes con ese filtro.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <Link key={e.key} href={e.href} className="block border rounded-xl p-4 hover:border-gray-400 transition">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{e.typeLabel}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${e.status === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[e.status] || e.status}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(e.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p className="text-sm text-gray-700 mt-2 line-clamp-2">{e.description}</p>
                {e.video && (
                  <span className="mt-2 flex items-center gap-2">
                    {e.video.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.video.thumbnailUrl} alt="" className="h-10 w-16 rounded object-cover bg-gray-100" />
                    )}
                    <span className="text-xs font-medium text-gray-600">
                      Video{formatVideoDuration(e.video.durationSeconds) ? ` · ${formatVideoDuration(e.video.durationSeconds)}` : ''}
                    </span>
                  </span>
                )}
                <p className="text-xs text-gray-400 mt-1">{e.meta}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
