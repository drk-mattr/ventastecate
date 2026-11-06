import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { SuggestInfoForm } from '@/components/businesses/suggest-info-form'
import { groupCategories } from '@/lib/business-categories'

export default async function SuggestInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone, address, hours, category, website')
    .eq('id', id)
    .single()
  if (!business) notFound()

  const { data: rows } = await supabase.from('businesses').select('category').limit(2000)
  const categories = groupCategories((rows || []).map((r) => r.category)).map((g) => g.category)

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-xl">
        <Link href={`/businesses/${id}`} className="text-sm text-gray-500 underline">← Volver a {business.name}</Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">Agregar información</h1>
        <p className="text-sm text-gray-500 mb-6">
          Completa lo que sepas de {business.name}. Se publica de inmediato con tu nombre.
        </p>
        <SuggestInfoForm
          businessId={id}
          current={{
            phone: business.phone ?? '',
            address: business.address ?? '',
            hours: (business as { hours?: string | null }).hours ?? '',
            category: business.category ?? '',
            website: (business as { website?: string | null }).website ?? '',
          }}
          categories={categories}
        />
      </main>
    </div>
  )
}
