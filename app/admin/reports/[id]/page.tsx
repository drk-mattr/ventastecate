import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSuperadminProfile } from '@/lib/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ReportActions } from '@/components/admin/report-actions'
import { BorderReportActions } from '@/components/admin/border-report-actions'
import { formatWait } from '@/lib/border/estimate'

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
  border_spam: 'Garita: spam', border_offensive: 'Garita: contenido ofensivo',
  border_other: 'Garita: otro motivo',
}

async function ItemCommentReportPreview({ commentId }: { commentId: string }) {
  // Item comments are public-read, so the anon client can see the
  // reported comment; a deleted comment renders the fallback line.
  const supabase = await createClient()
  const { data: comment } = await supabase.from('item_comments').select('id, item_id, body').eq('id', commentId).maybeSingle()
  if (!comment) return <p className="text-sm mt-3 text-gray-500">Comentario eliminado.</p>
  return (
    <div className="mt-3">
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.body}</p>
      <p className="text-sm mt-2"><Link href={`/items/${comment.item_id}`} className="underline">Ver artículo comentado</Link></p>
    </div>
  )
}

async function BusinessReviewReportPreview({ reviewId }: { reviewId: string }) {
  // Business reviews are public-read, so the anon client can see the
  // reported review; a deleted review renders the fallback line.
  const supabase = await createClient()
  const { data: review } = await supabase.from('business_reviews').select('id, business_id, rating, body').eq('id', reviewId).maybeSingle()
  if (!review) return <p className="text-sm mt-3 text-gray-500">Opinión eliminada.</p>
  return (
    <div className="mt-3">
      <p className="text-sm text-gray-800">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
      {review.body && <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{review.body}</p>}
      <p className="text-sm mt-2"><Link href={`/businesses/${review.business_id}`} className="underline">Ver negocio opinado</Link></p>
    </div>
  )
}

async function BorderReportPreview({ borderReportId }: { borderReportId: string }) {
  // Border posts are public-read, so the anon client can see the
  // flagged post; a hidden post still renders (hidden_at only
  // removes it from the feed and the estimate).
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('border_line_reports')
    .select('id, lane, direction, wait_minutes, status, note, photo_url, hidden_at, created_at')
    .eq('id', borderReportId)
    .maybeSingle()
  if (!post) return <p className="text-sm mt-3 text-gray-500">Reporte de garita eliminado.</p>
  const p = post as unknown as {
    id: string
    lane: string
    direction: string
    wait_minutes: number
    status: string
    note: string | null
    photo_url: string | null
    hidden_at: string | null
    created_at: string
  }
  const laneLabel = p.lane === 'auto' ? 'Auto general' : p.lane === 'peatonal' ? 'A pie' : 'Camiones'
  const directionLabel = p.direction === 'norte' ? 'a EUA' : 'a México'
  return (
    <div className="mt-3">
      <p className="text-sm text-gray-800">
        <span className="font-semibold">{formatWait(p.wait_minutes)}</span> · {laneLabel} ·{' '}
        {directionLabel} · {p.status === 'ya_cruce' ? 'Ya cruzó' : 'En la fila'} ·{' '}
        {new Date(p.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
      </p>
      {p.note && <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{p.note}</p>}
      {p.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photo_url} alt="Foto de la fila reportada" className="mt-2 max-h-64 rounded-lg object-contain bg-gray-100" />
      )}
      {p.hidden_at && <p className="text-sm text-gray-500 mt-2">Oculto del feed.</p>}
      <p className="text-sm mt-2">
        <Link href={`/garita#border-report-${p.id}`} className="underline">
          Ver reporte en La Garita
        </Link>
      </p>
    </div>
  )
}

async function BorderReportActionsSlot({ borderReportId }: { borderReportId: string }) {
  // The hidden state lives on the border post, not on the
  // report row — fetch it here so the buttons show the current
  // state. A deleted post renders nothing.
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('border_line_reports')
    .select('hidden_at')
    .eq('id', borderReportId)
    .maybeSingle()
  if (!post) return null
  const hiddenAt = (post as unknown as { hidden_at: string | null }).hidden_at
  return (
    <div className="mb-6">
      <BorderReportActions
        borderReportId={borderReportId}
        hidden={Boolean(hiddenAt)}
        hiddenAt={hiddenAt}
      />
    </div>
  )
}

async function StoryReportPreview({ storyId }: { storyId: string }) {
  // Expired stories are invisible to the public read policy, so an
  // expired story renders the fallback line instead of its image.
  const supabase = await createClient()
  const { data: story } = await supabase.from('stories').select('id, image_url, listing_id, business_id').eq('id', storyId).maybeSingle()
  if (!story) return <p className="text-sm mt-3 text-gray-500">Historia expirada o eliminada.</p>
  return (
    <div className="mt-3">
      {/* Plain img: the story may already be expired by review time. */}
      <img src={story.image_url} alt="Historia reportada" className="max-h-64 rounded-lg object-contain bg-gray-100" />
      {story.listing_id && <p className="text-sm mt-2"><Link href={`/listings/${story.listing_id}`} className="underline">Ver anuncio enlazado</Link></p>}
      {story.business_id && <p className="text-sm mt-2"><Link href={`/businesses/${story.business_id}`} className="underline">Ver negocio enlazado</Link></p>}
    </div>
  )
}

export default async function AdminReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getSuperadminProfile()
  if (!admin) redirect('/login')
  const { id } = await params
  const supabase = await createClient()
  const { data: report } = await supabase.from('reports').select('*').eq('id', id).single()
  if (!report) notFound()
  const { data: notes } = await supabase.from('report_notes').select('*').eq('report_id', id).order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Link href="/admin/reports" className="text-sm text-gray-500 hover:underline">← Todos los reportes</Link>
        <h1 className="text-2xl font-semibold mt-3 mb-1">{TYPE_LABEL[report.type] || report.type}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {STATUS_LABEL[report.status] || report.status} · {new Date(report.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} · {report.reporter_label || 'Anónimo'}
        </p>
        <div className="border rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.description || 'Sin descripción'}</p>
          {report.listing_id && (
            <p className="text-sm mt-3"><Link href={`/listings/${report.listing_id}`} className="underline">{report.listing_title || 'Ver anuncio reportado'}</Link></p>
          )}
          {report.conversation_id && (
            <p className="text-sm mt-3"><Link href={`/messages?conversation=${report.conversation_id}`} className="underline">Ver conversación reportada</Link></p>
          )}
          {report.story_id && <StoryReportPreview storyId={report.story_id} />}
          {report.item_comment_id && <ItemCommentReportPreview commentId={report.item_comment_id} />}
          {report.business_review_id && <BusinessReviewReportPreview reviewId={report.business_review_id} />}
          {report.border_report_id && <BorderReportPreview borderReportId={report.border_report_id} />}
          {report.email && <p className="text-xs text-gray-500 mt-3">Email del usuario: {report.email}</p>}
        </div>
        {report.border_report_id && (
          <BorderReportActionsSlot borderReportId={report.border_report_id} />
        )}
        <h2 className="text-lg font-semibold mb-3">Notas y respuestas</h2>
        <div className="space-y-3 mb-6">
          {(notes || []).length === 0 && <p className="text-sm text-gray-500">Aún no hay notas.</p>}
          {(notes || []).map((n) => (
            <div key={n.id} className="border rounded-xl p-3">
              <p className="text-[11px] font-medium text-gray-500 mb-1">{n.kind === 'reply' ? 'Respuesta enviada por correo' : 'Nota interna'} · {new Date(n.created_at).toLocaleDateString('es-MX')}</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
        <ReportActions reportId={report.id} status={report.status} hasEmail={Boolean(report.email)} />
      </main>
      <Footer />
    </div>
  )
}
