import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { AddBusinessForm } from '@/components/businesses/add-business-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Store, MapPin } from 'lucide-react'

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const supabase = await createClient()
  let query = supabase.from('businesses').select('*').order('mention_count', { ascending: false }).limit(50)
  if (q) query = query.ilike('name_normalized', `%${q.toLowerCase().trim()}%`)
  const { data: businesses } = await query

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-1">Negocios</h1>
        <p className="text-sm text-gray-500 mb-6">
          El índice de Tecate: negocios que la comunidad conoce, aunque el dueño todavía no se haya registrado.
          Cualquiera puede agregar uno con solo su nombre.
        </p>

        <form method="get" className="flex gap-2 mb-8">
          <Input name="q" defaultValue={q ?? ''} placeholder="Buscar un negocio…" className="flex-1" />
          <Button type="submit" variant="outline">Buscar</Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-base font-medium mb-3 text-gray-700">Agregar un negocio</h2>
            <AddBusinessForm />
          </div>
          <div>
            <h2 className="text-base font-medium mb-3 text-gray-700">Más mencionados</h2>
            {!businesses || businesses.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no hay negocios en el índice. Agrega el primero.</p>
            ) : (
              <ul className="space-y-2">
                {businesses.map((biz) => (
                  <li key={biz.id} className="border rounded-xl px-3 py-2.5 flex items-center gap-3">
                    <Store className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/businesses/${biz.id}`} className="text-sm font-medium hover:underline block truncate">{biz.name}</Link>
                      {(biz.location || biz.category) && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          {biz.location && <><MapPin className="h-3 w-3" />{biz.location}</>}
                          {biz.location && biz.category && ' · '}{biz.category}
                        </p>
                      )}
                    </div>
                    {biz.mention_count > 0 && (
                      <span className="text-xs text-gray-500 shrink-0">{biz.mention_count} {biz.mention_count === 1 ? 'mención' : 'menciones'}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
