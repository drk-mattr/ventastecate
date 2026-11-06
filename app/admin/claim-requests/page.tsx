import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSuperadminProfile } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ClaimRequestActions } from '@/components/admin/claim-request-actions'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

export default async function AdminClaimRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const adminProfile = await getSuperadminProfile()
  if (!adminProfile) redirect('/login')
  const sp = await searchParams
  const status = sp.status === 'approved' || sp.status === 'rejected' ? sp.status : 'pending'

  const admin = createAdminClient()
  let list: Record<string, unknown>[] = []
  if (admin) {
    const { data } = await admin
      .from('business_claim_requests')
      .select('id, business_id, user_id, owner_name, whatsapp_number, note, status, created_at')
      .eq('status', status)
      .order('created_at', { ascending: false })
    list = (data as Record<string, unknown>[]) || []
  }

  // Names for the rows, batched.
  const businessIds = [...new Set(list.map((r) => r.business_id as string))]
  const userIds = [...new Set(list.map((r) => r.user_id as string).filter(Boolean))]
  const businessNames = new Map<string, string>()
  const requesterNames = new Map<string, string>()
  if (admin && businessIds.length > 0) {
    const { data } = await admin.from('businesses').select('id, name').in('id', businessIds)
    for (const b of (data as { id: string; name: string }[]) || []) businessNames.set(b.id, b.name)
  }
  if (admin && userIds.length > 0) {
    const { data } = await admin.from('profiles').select('id, username, display_name').in('id', userIds)
    for (const p of (data as { id: string; username: string; display_name: string }[]) || []) {
      requesterNames.set(p.id, `${p.display_name} (@${p.username})`)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-1">Solicitudes de reclamo</h1>
        <p className="text-sm text-gray-500 mb-6">
          Solo visibles para superadmin. Aprobar marca el negocio como reclamado
          (insignia &ldquo;Negocio reclamado&rdquo;); rechazar cierra la solicitud.
          La verificación es manual en esta versión.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/claim-requests?status=${s}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${status === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'}`}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-gray-500 border rounded-xl p-6 text-center">No hay solicitudes {STATUS_LABEL[status].toLowerCase()}.</p>
        ) : (
          <div className="space-y-3">
            {list.map((r) => {
              const businessId = r.business_id as string
              const createdAt = r.created_at as string
              return (
                <div key={r.id as string} className="border rounded-xl p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/businesses/${businessId}`} className="text-sm font-semibold text-gray-900 hover:underline">
                      {businessNames.get(businessId) || 'Negocio'}
                    </Link>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${status === 'pending' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">
                    {(r.owner_name as string) || 'Sin nombre de dueño'} · WhatsApp {(r.whatsapp_number as string)}
                  </p>
                  {(r.note as string) && (
                    <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{r.note as string}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Solicitado por {requesterNames.get(r.user_id as string) || 'desconocido'}
                  </p>
                  {status === 'pending' && (
                    <div className="mt-3">
                      <ClaimRequestActions requestId={r.id as string} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
