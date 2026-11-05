import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { AddBusinessForm } from '@/components/businesses/add-business-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { REGIONS, townsForRegion, getRegionForTown } from '@/lib/business-regions'

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string; town?: string; region?: string }> }) {
  const { q, town, region } = await searchParams
  const supabase = await createClient()
  let query = supabase.from('businesses').select('*').order('name_normalized', { ascending: true }).limit(100)
  if (q) query = query.ilike('name_normalized', `%${q.toLowerCase().trim()}%`)
  if (town) query = query.eq('city', town)
  else if (region) query = query.in('city', townsForRegion(region))
  const { data: businesses } = await query

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <h1 className="text-2xl font-semibold mb-1">Negocios</h1>
        <p className="text-sm text-gray-500 mb-6">
          El índice de Tecate y alrededores: lugares que la comunidad conoce, aunque el dueño todavía no se haya registrado.
          Cualquiera puede agregar uno con solo su nombre.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <Link href="/businesses" className={`text-xs px-3 py-1.5 rounded-full ${!region && !town ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Todas</Link>
          {REGIONS.map((r) => (
            <Link key={r} href={`/businesses?region=${encodeURIComponent(r)}`} className={`text-xs px-3 py-1.5 rounded-full ${region === r ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{r}</Link>
          ))}
        </div>
        <form method="get" className="flex gap-2 mb-8">
          <Input name="q" defaultValue={q ?? ''} placeholder="Buscar un negocio…" className="flex-1" />
          <Button type="submit" variant="outline">Buscar</Button>
        </form>

        <h2 className="text-base font-medium mb-2 text-gray-700">Índice{businesses ? ` (${businesses.length})` : ''}</h2>
        {!businesses || businesses.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay negocios en el índice. Agrega el primero.</p>
        ) : (
          <ul className="divide-y divide-gray-200 border-y border-gray-200">
            {businesses.map((biz) => {
              const bizRegion = getRegionForTown(biz.city)
              return (
                <li key={biz.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/businesses/${biz.id}`} className="text-base font-semibold text-gray-900 hover:underline">{biz.name}</Link>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {[biz.category, biz.city || biz.location, bizRegion].filter(Boolean).join(' · ')}
                    </p>
                    {(biz.address || biz.phone) && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {[biz.address, biz.phone].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {(biz as { store_id?: string | null }).store_id && (
                      <p className="text-xs text-gray-500 mt-0.5">Negocio registrado</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">
                      {biz.mention_count ?? 0} {biz.mention_count === 1 ? 'mención' : 'menciones'} · {biz.followers_count ?? 0} {biz.followers_count === 1 ? 'seguidor' : 'seguidores'} · {biz.likes_count ?? 0} me gusta
                    </p>
                    <Link href={`/businesses/${biz.id}`} className="text-xs text-gray-900 underline mt-1 inline-block">Ver negocio</Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-12 max-w-xl">
          <h2 className="text-base font-medium mb-3 text-gray-700">Agregar un negocio</h2>
          <AddBusinessForm />
        </div>
      </main>
    </div>
  )
}
