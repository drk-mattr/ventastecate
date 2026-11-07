import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSuperadminProfile } from '@/lib/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ReportActions } from '@/components/admin/report-actions'

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
          {report.email && <p className="text-xs text-gray-500 mt-3">Email del usuario: {report.email}</p>}
        </div>
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
