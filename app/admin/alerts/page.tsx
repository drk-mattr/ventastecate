import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSuperadminProfile } from '@/lib/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { EmailAlertCard } from '@/components/admin/email-alert-card'
import type { EmailAlert } from '@/lib/types/database'

const TABS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'archived', label: 'Archivados' },
]

export default async function AdminAlertsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await getSuperadminProfile()
  if (!admin) redirect('/login')
  const sp = await searchParams
  const supabase = await createClient()
  let q = supabase
    .from('email_alerts')
    .select('id, from_address, subject, body, received_at, status, created_at')
    .order('received_at', { ascending: false })
  if (sp.status) q = q.eq('status', sp.status)
  const { data } = await q
  const list = (data ?? []) as unknown as EmailAlert[]
  const newCount = list.filter((a) => a.status === 'new').length

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-1">Alertas de correo</h1>
        <p className="text-sm text-gray-500 mb-6">
          Solo visibles para superadmin. {newCount ? `${newCount} sin leer.` : 'Nada pendiente.'} Cada correo a hola@ventastecate.com también llega a Gmail.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => (
            <Link
              key={t.label}
              href={t.value ? `/admin/alerts?status=${t.value}` : '/admin/alerts'}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${sp.status === t.value ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-gray-500 border rounded-xl p-6 text-center">No hay alertas con ese filtro.</p>
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <EmailAlertCard key={a.id} alert={a} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
