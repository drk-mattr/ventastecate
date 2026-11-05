import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { AddBusinessForm } from '@/components/businesses/add-business-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { REGIONS, townsForRegion, getRegionForTown } from '@/lib/business-regions'

const PAGE_SIZE = 50
const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('')
const SORTS = [
  { value: 'alpha', label: 'A–Z' },
  { value: 'mentions', label: 'Más mencionados' },
  { value: 'followers', label: 'Más seguidos' },
  { value: 'recent', label: 'Recientes' },
] as const

type Filters = { q?: string; town?: string; region?: string; categoria?: string; letra?: string; sort?: string }

function hrefWith(base: Filters, overrides: Partial<Filters> & { page?: number }): string {
  const params = new URLSearchParams()
  const merged: Record<string, string | number | undefined> = { ...base, ...overrides }
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === '' || (key === 'page' && value === 1)) continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `/businesses?${qs}` : '/businesses'
}

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<Filters & { page?: string }> }) {
  const params = await searchParams
  const { q, town, region, categoria, letra, sort } = params
  const page = Math.max(parseInt(params.page || '1', 10) || 1, 1)
  const sortValue = SORTS.some((s) => s.value === sort) ? sort! : 'alpha'
  const filters: Filters = { q, town, region, categoria, letra, sort: sortValue }

  const supabase = await createClient()
  // Only the columns the row shows — never * — so a thousands-row index
  // does not pay for columns nobody sees. No count query either: the
  // footer reads "page N" from whether a next page exists.
  let query = supabase.from('businesses')
    .select('id, name, name_normalized, location, city, category, address, phone, mention_count, followers_count, likes_count, store_id, created_at')
  if (q) query = query.ilike('name_normalized', `%${q.toLowerCase().trim()}%`)
  if (town) query = query.eq('city', town)
  else if (region) query = query.in('city', townsForRegion(region))
  if (categoria) query = query.eq('category', categoria)
  if (letra) query = query.ilike('name_normalized', `${letra.toLowerCase()}%`)
  if (sortValue === 'mentions') query = query.order('mention_count', { ascending: false }).order('name_normalized', { ascending: true })
  else if (sortValue === 'followers') query = query.order('followers_count', { ascending: false }).order('name_normalized', { ascending: true })
  else if (sortValue === 'recent') query = query.order('created_at', { ascending: false })
  else query = query.order('name_normalized', { ascending: true })
  const from = (page - 1) * PAGE_SIZE
  const { data: raw } = await query.range(from, from + PAGE_SIZE)
  const hasMore = (raw?.length ?? 0) > PAGE_SIZE
  const businesses = (raw || []).slice(0, PAGE_SIZE)

  // Category chips from the categories actually present (capped at 1000 rows
  // for the chip list; the weighted-category system will replace this).
  const { data: catRows } = await supabase.from('businesses').select('category').limit(1000)
  const categories = [...new Set((catRows || []).map((r) => r.category).filter(Boolean) as string[])].sort()

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <h1 className="text-2xl font-semibold mb-1">Negocios</h1>
        <p className="text-sm text-gray-500 mb-6">
          El índice de Tecate y alrededores: lugares que la comunidad conoce, aunque el dueño todavía no se haya registrado.
          Cualquiera puede agregar uno con solo su nombre.
        </p>

        <div className="sticky top-14 z-40 bg-white pb-3 -mx-4 px-4 pt-1">
          <div className="flex flex-wrap gap-2 mb-3">
            <Link href={hrefWith(filters, { region: undefined, town: undefined, page: 1 })} className={`text-xs px-3 py-1.5 rounded-full ${!region && !town ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Todas</Link>
            {REGIONS.map((r) => (
              <Link key={r} href={hrefWith(filters, { region: r, town: undefined, page: 1 })} className={`text-xs px-3 py-1.5 rounded-full ${region === r ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{r}</Link>
            ))}
          </div>
          <form method="get" className="flex gap-2">
            {region && <input type="hidden" name="region" value={region} />}
            {town && <input type="hidden" name="town" value={town} />}
            {categoria && <input type="hidden" name="categoria" value={categoria} />}
            {letra && <input type="hidden" name="letra" value={letra} />}
            {sortValue !== 'alpha' && <input type="hidden" name="sort" value={sortValue} />}
            <Input name="q" defaultValue={q ?? ''} placeholder="Buscar un negocio…" className="flex-1" />
            <Button type="submit" variant="outline">Buscar</Button>
          </form>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {LETTERS.map((letter) => (
            <Link key={letter} href={hrefWith(filters, { letra: letter, page: 1 })} className={`text-xs px-1.5 py-1 rounded ${letra === letter ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>{letter}</Link>
          ))}
          {letra && <Link href={hrefWith(filters, { letra: undefined, page: 1 })} className="text-xs px-1.5 py-1 text-gray-900 underline">Quitar letra</Link>}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <Link key={cat} href={hrefWith(filters, { categoria: cat, page: 1 })} className={`text-xs px-3 py-1 rounded-full border ${categoria === cat ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>{cat}</Link>
          ))}
          {categoria && <Link href={hrefWith(filters, { categoria: undefined, page: 1 })} className="text-xs px-3 py-1 text-gray-900 underline">Quitar categoría</Link>}
        </div>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-medium text-gray-700">Índice</h2>
          <div className="flex gap-1">
            {SORTS.map((s) => (
              <Link key={s.value} href={hrefWith(filters, { sort: s.value, page: 1 })} className={`text-xs px-2 py-1 rounded ${sortValue === s.value ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>{s.label}</Link>
            ))}
          </div>
        </div>

        {!businesses || businesses.length === 0 ? (
          <p className="text-sm text-gray-500">No hay negocios con ese filtro. Prueba otra letra, categoría o región.</p>
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
                    {biz.store_id && (
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

        <div className="flex items-center justify-between mt-6">
          {page > 1 ? (
            <Link href={hrefWith(filters, { page: page - 1 })} className="text-sm text-gray-900 underline">← Anterior</Link>
          ) : <span />}
          <span className="text-xs text-gray-500">Página {page}{hasMore ? '' : ' · fin del índice'}</span>
          {hasMore ? (
            <Link href={hrefWith(filters, { page: page + 1 })} className="text-sm text-gray-900 underline">Siguiente →</Link>
          ) : <span />}
        </div>

        <div className="mt-12 max-w-xl">
          <h2 className="text-base font-medium mb-3 text-gray-700">Agregar un negocio</h2>
          <AddBusinessForm />
        </div>
      </main>
    </div>
  )
}
