import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { REGIONS, townsForRegion, getRegionForTown } from '@/lib/business-regions'
import { groupCategories, variantsForCategory } from '@/lib/business-categories'

const PAGE_SIZE = 100
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
  if (categoria) query = query.in('category', variantsForCategory(categoria))
  if (letra) query = query.ilike('name_normalized', `${letra.toLowerCase()}%`)
  if (sortValue === 'mentions') query = query.order('mention_count', { ascending: false }).order('name_normalized', { ascending: true })
  else if (sortValue === 'followers') query = query.order('followers_count', { ascending: false }).order('name_normalized', { ascending: true })
  else if (sortValue === 'recent') query = query.order('created_at', { ascending: false })
  else query = query.order('name_normalized', { ascending: true })
  const from = (page - 1) * PAGE_SIZE
  const { data: raw } = await query.range(from, from + PAGE_SIZE)
  const hasMore = (raw?.length ?? 0) > PAGE_SIZE
  const businesses = (raw || []).slice(0, PAGE_SIZE)

  // Category chips: grouped by canonical label (hospital/hospitales are
  // one category), ranked by how many businesses use them. Only the top 20
  // show on the index; the full list lives on /businesses/categorias.
  // The "El índice en números" stats panel was deliberately removed from
  // this public page (2026-11-04): it fits an owner's ranking view, not
  // general browsing.
  const { data: catRows } = await supabase.from('businesses').select('category').limit(2000)
  const allCategories = groupCategories((catRows || []).map((r) => r.category))
  const topCategories = allCategories.slice(0, 20)
  const shownCategories = categoria && !topCategories.some((c) => c.category === categoria)
    ? [...topCategories, ...allCategories.filter((c) => c.category === categoria)]
    : topCategories

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold mb-1">Negocios</h1>
          <Link href="/businesses/new" aria-label="Agregar un negocio" title="Agregar un negocio" className="text-xl leading-none text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-full w-7 h-7 flex items-center justify-center shrink-0">+</Link>
        </div>
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
          {shownCategories.map(({ category: cat, count }) => (
            <Link key={cat} href={hrefWith(filters, { categoria: cat, page: 1 })} className={`text-xs px-3 py-1 rounded-full border ${categoria === cat ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>{cat} <span className="text-gray-400">{count}</span></Link>
          ))}
          <Link href="/businesses/categorias" className="text-xs px-3 py-1 text-gray-900 underline">Todas las categorías ({allCategories.length}) →</Link>
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
          <ul className="columns-1 md:columns-2 lg:columns-4 gap-8 border-t border-gray-200 pt-2">
            {businesses.map((biz) => {
              const bizRegion = getRegionForTown(biz.city)
              const meta = [biz.category, biz.city || biz.location, bizRegion, biz.address, biz.phone].filter(Boolean).join(' · ')
              const counts = `${biz.mention_count ?? 0} menc. · ${biz.followers_count ?? 0} seg. · ${biz.likes_count ?? 0} me gusta`
              return (
                <li key={biz.id} className="break-inside-avoid py-2 border-b border-gray-200">
                  <Link href={`/businesses/${biz.id}`} className="text-sm font-semibold text-gray-900 hover:underline block truncate">{biz.name}</Link>
                  <p className="text-xs text-gray-500 truncate" title={`${meta} · ${counts}`}>
                    {meta}{meta ? ' · ' : ''}{counts}
                  </p>
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
      </main>
    </div>
  )
}
