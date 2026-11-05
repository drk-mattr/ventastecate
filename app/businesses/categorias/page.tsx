import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { groupCategories } from '@/lib/business-categories'

export default async function BusinessCategoriesPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase.from('businesses').select('category').limit(2000)
  const categories = groupCategories((rows || []).map((r) => r.category))

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Link href="/businesses" className="text-sm text-gray-500 underline">← Volver al índice</Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">Categorías</h1>
        <p className="text-sm text-gray-500 mb-6">
          Todas las categorías del índice, de la más usada a la menos usada. Toca una para ver sus negocios.
        </p>
        <ul className="columns-1 md:columns-2 lg:columns-4 gap-8 border-t border-gray-200 pt-2">
          {categories.map(({ category, count }) => (
            <li key={category} className="break-inside-avoid py-2 border-b border-gray-200 flex items-baseline justify-between gap-4">
              <Link href={`/businesses?categoria=${encodeURIComponent(category)}`} className="text-sm font-semibold text-gray-900 hover:underline truncate">{category}</Link>
              <span className="text-xs text-gray-500 shrink-0">{count}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
