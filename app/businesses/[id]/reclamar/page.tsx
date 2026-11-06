import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ClaimForm } from '@/components/businesses/claim-form'

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, claimed_by')
    .eq('id', id)
    .single()
  if (!business) notFound()

  const claimed = Boolean((business as { claimed_by?: string | null }).claimed_by)
  let alreadyPending = false
  const { data: { user } } = await supabase.auth.getUser()
  if (user && !claimed) {
    const { data } = await supabase
      .from('business_claim_requests')
      .select('id')
      .eq('business_id', id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()
    // Pre-032 the table is missing and the query errors; treat as none.
    alreadyPending = Boolean(data)
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-xl">
        <Link href={`/businesses/${id}`} className="text-sm text-gray-500 underline">← Volver a {business.name}</Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">Reclamar este negocio</h1>
        {claimed ? (
          <p className="text-sm text-gray-500 mt-2">Este negocio ya fue reclamado.</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Si eres el dueño de {business.name}, pide la gestión de su página.
              El equipo revisa la solicitud y te avisa. Reclamar es gratis y no
              cambia nada de lo que la comunidad ya agregó.
            </p>
            <ClaimForm businessId={id} alreadyPending={alreadyPending} />
          </>
        )}
      </main>
    </div>
  )
}
