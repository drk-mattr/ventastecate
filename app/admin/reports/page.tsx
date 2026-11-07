import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSuperadminProfile } from '@/lib/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import type { Report } from '@/lib/types/database'

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
  const newCount = list.filter((r) => r.status === 'new').length

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
        {list.length === 0 ? (
          <p className="text-sm text-gray-500 border rounded-xl p-6 text-center">No hay reportes con ese filtro.</p>
        ) : (
          <div className="space-y-3">
            {list.map((r) => (
              <Link key={r.id} href={`/admin/reports/${r.id}`} className="block border rounded-xl p-4 hover:border-gray-400 transition">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{TYPE_LABEL[r.type] || r.type}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${r.status === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[r.status] || r.status}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p className="text-sm text-gray-700 mt-2 line-clamp-2">{r.description || r.listing_title || (r.story_id ? 'Historia reportada' : r.item_comment_id ? 'Comentario de artículo reportado' : r.business_review_id ? 'Opinión de negocio reportada' : 'Sin descripción')}</p>
                <p className="text-xs text-gray-400 mt-1">{r.reporter_label || 'Anónimo'}{r.listing_title ? ` · ${r.listing_title}` : ''}{r.email ? ` · ${r.email}` : ''}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
