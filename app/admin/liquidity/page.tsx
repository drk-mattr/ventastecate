import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSuperadminProfile } from '@/lib/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

// Sell-through tracking — the sold loop's measurement half.
// Internal, superadmin-only, read-only. OfferUp managed to liquidity:
// % of items sold + time-to-sell, watched as a weekly curve. This page
// is that curve for Tecate.
//
// News posts are excluded from the headline numbers: their "sold"
// status means Cerrado, not a sale. The by-type breakdown still shows
// them, so nothing is hidden.
//
// If migration 036 (listings.sold_at) is not applied yet, the page
// still renders counts and % sold and says so plainly next to the
// time-to-sell numbers — it never 500s.

const MARKETPLACE_TYPES = ['product', 'service', 'event']
const TYPE_LABEL: Record<string, string> = {
  product: 'Productos',
  service: 'Servicios',
  event: 'Eventos',
  news: 'Noticias',
}
const WEEKS = 12
const ROW_LIMIT = 5000

function isMissingColumn(error: { code?: string } | null): boolean {
  return !!error && (error.code === '42703' || error.code === 'PGRST204' || error.code === '42P01')
}

function mondayOf(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  const day = (out.getDay() + 6) % 7 // Monday = 0
  out.setDate(out.getDate() - day)
  return out
}

function fmtPct(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)}%`
}

function fmtDays(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)} días`
}

export default async function AdminLiquidityPage() {
  const adminProfile = await getSuperadminProfile()
  if (!adminProfile) redirect('/login')

  const admin = createAdminClient()
  let configError = false
  let migrationPending = false

  let activeCount = 0
  let soldCount = 0
  let inactiveCount = 0
  let byType: { type: string; active: number; sold: number }[] = []
  let byTown: { town: string; active: number; sold: number }[] = []
  let weekly: { weekStart: Date; created: number; sold: number }[] = []
  let medianDays: number | null = null

  if (!admin) {
    configError = true
  } else {
    // Headline counts.
    const [activeRes, soldRes, inactiveRes] = await Promise.all([
      admin.from('listings').select('id', { count: 'exact', head: true }).in('listing_type', MARKETPLACE_TYPES).eq('status', 'active'),
      admin.from('listings').select('id', { count: 'exact', head: true }).in('listing_type', MARKETPLACE_TYPES).eq('status', 'sold'),
      admin.from('listings').select('id', { count: 'exact', head: true }).in('listing_type', MARKETPLACE_TYPES).eq('status', 'inactive'),
    ])
    activeCount = activeRes.count ?? 0
    soldCount = soldRes.count ?? 0
    inactiveCount = inactiveRes.count ?? 0

    // By-type breakdown (all types, for transparency).
    const { data: typeRows } = await admin
      .from('listings')
      .select('listing_type, status')
      .limit(ROW_LIMIT)
    const typeMap = new Map<string, { active: number; sold: number }>()
    for (const r of (typeRows ?? []) as { listing_type: string; status: string }[]) {
      const e = typeMap.get(r.listing_type) ?? { active: 0, sold: 0 }
      if (r.status === 'active') e.active += 1
      if (r.status === 'sold') e.sold += 1
      typeMap.set(r.listing_type, e)
    }
    byType = [...typeMap.entries()]
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.active + b.sold - (a.active + a.sold))

    // By-town breakdown (city, falling back to the free-text location).
    const { data: townRows } = await admin
      .from('listings')
      .select('city, location, status')
      .in('listing_type', MARKETPLACE_TYPES)
      .limit(ROW_LIMIT)
    const townMap = new Map<string, { active: number; sold: number }>()
    for (const r of (townRows ?? []) as { city: string | null; location: string | null; status: string }[]) {
      const town = (r.city || r.location || 'Sin lugar').trim()
      const e = townMap.get(town) ?? { active: 0, sold: 0 }
      if (r.status === 'active') e.active += 1
      if (r.status === 'sold') e.sold += 1
      townMap.set(town, e)
    }
    byTown = [...townMap.entries()]
      .map(([town, v]) => ({ town, ...v }))
      .sort((a, b) => b.active + b.sold - (a.active + a.sold))
      .slice(0, 10)

    // Weekly cohort trend: of the listings created in each week, how
    // many have sold — the rising %-sold-per-week curve.
    const { data: weekRows } = await admin
      .from('listings')
      .select('created_at, status')
      .in('listing_type', MARKETPLACE_TYPES)
      .limit(ROW_LIMIT)
    const nowMonday = mondayOf(new Date())
    const buckets = new Map<number, { created: number; sold: number }>()
    for (let i = 0; i < WEEKS; i++) {
      const start = new Date(nowMonday)
      start.setDate(start.getDate() - i * 7)
      buckets.set(start.getTime(), { created: 0, sold: 0 })
    }
    for (const r of (weekRows ?? []) as { created_at: string; status: string }[]) {
      const key = mondayOf(new Date(r.created_at)).getTime()
      const b = buckets.get(key)
      if (!b) continue
      b.created += 1
      if (r.status === 'sold') b.sold += 1
    }
    weekly = [...buckets.entries()]
      .map(([t, v]) => ({ weekStart: new Date(t), ...v }))
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())

    // Median time-to-sell (needs migration 036's sold_at column).
    const { data: soldRows, error: soldError } = await admin
      .from('listings')
      .select('created_at, sold_at')
      .in('listing_type', MARKETPLACE_TYPES)
      .eq('status', 'sold')
      .order('sold_at', { ascending: false })
      .limit(1000)
    if (soldError) {
      if (isMissingColumn(soldError)) {
        migrationPending = true
      } else {
        console.error('Liquidity sold_at query failed:', soldError.message)
      }
    } else {
      const durations = (soldRows ?? [])
        .map((r) => {
          const soldAt = (r as { sold_at?: string | null }).sold_at
          if (!soldAt) return null
          return (new Date(soldAt).getTime() - new Date((r as { created_at: string }).created_at).getTime()) / 86_400_000
        })
        .filter((d): d is number => d !== null && d >= 0)
        .sort((a, b) => a - b)
      if (durations.length > 0) {
        const mid = Math.floor(durations.length / 2)
        medianDays = durations.length % 2 === 1
          ? durations[mid]
          : (durations[mid - 1] + durations[mid]) / 2
      }
    }
  }

  const listed = activeCount + soldCount
  const sellThrough = listed > 0 ? (soldCount / listed) * 100 : null

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-1">Liquidez</h1>
        <p className="text-sm text-gray-500 mb-6">
          Solo visible para superadmin. % de anuncios vendidos y tiempo de venta — la curva que decide si el círculo de Tecate está vivo.
        </p>

        {configError && (
          <p className="text-sm text-red-600 border border-red-200 rounded-xl p-4 mb-6">
            No se pudo conectar con la base de datos (falta la clave de servicio). Las cifras no se pueden calcular.
          </p>
        )}

        {/* Headline numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="border rounded-xl p-4">
            <p className="text-2xl font-semibold">{activeCount}</p>
            <p className="text-xs text-gray-500">Activos</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-2xl font-semibold">{soldCount}</p>
            <p className="text-xs text-gray-500">Vendidos</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-2xl font-semibold">{fmtPct(sellThrough)}</p>
            <p className="text-xs text-gray-500">% vendido (vendidos / activos + vendidos)</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-2xl font-semibold">{fmtDays(medianDays)}</p>
            <p className="text-xs text-gray-500">Tiempo medio de venta (mediana)</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-8">
          Inactivos: {inactiveCount} (no cuentan en el % vendido). Productos, servicios y eventos. Las noticias no cuentan: su estado «vendido» significa cerrado.
        </p>

        {migrationPending && (
          <p className="text-sm text-gray-700 border rounded-xl p-4 mb-8">
            Migración 036 pendiente: la columna sold_at aún no existe, así que el tiempo medio de venta no se puede calcular. Aplica la migración 036 y vuelve — los conteos y el % vendido ya funcionan.
          </p>
        )}

        {/* Weekly cohort trend */}
        <h2 className="text-base font-semibold mb-3">Por semana — anuncios creados vs vendidos</h2>
        <p className="text-xs text-gray-500 mb-3">Cohorte por semana de creación: de los anuncios creados esa semana, cuántos ya se vendieron.</p>
        <div className="border rounded-xl overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">Semana del</th>
                <th className="px-4 py-2 font-medium text-right">Creados</th>
                <th className="px-4 py-2 font-medium text-right">Vendidos</th>
                <th className="px-4 py-2 font-medium text-right">% vendido</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.weekStart.toISOString()} className="border-b last:border-0">
                  <td className="px-4 py-2">{w.weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                  <td className="px-4 py-2 text-right">{w.created}</td>
                  <td className="px-4 py-2 text-right">{w.sold}</td>
                  <td className="px-4 py-2 text-right">{fmtPct(w.created > 0 ? (w.sold / w.created) * 100 : null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* By type */}
        <h2 className="text-base font-semibold mb-3">Por tipo</h2>
        <div className="border rounded-xl overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium text-right">Activos</th>
                <th className="px-4 py-2 font-medium text-right">Vendidos</th>
                <th className="px-4 py-2 font-medium text-right">% vendido</th>
              </tr>
            </thead>
            <tbody>
              {byType.length === 0 ? (
                <tr><td className="px-4 py-3 text-gray-500" colSpan={4}>Aún no hay anuncios.</td></tr>
              ) : byType.map((t) => {
                const total = t.active + t.sold
                return (
                  <tr key={t.type} className="border-b last:border-0">
                    <td className="px-4 py-2">{TYPE_LABEL[t.type] || t.type}</td>
                    <td className="px-4 py-2 text-right">{t.active}</td>
                    <td className="px-4 py-2 text-right">{t.sold}</td>
                    <td className="px-4 py-2 text-right">{fmtPct(total > 0 ? (t.sold / total) * 100 : null)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* By town */}
        <h2 className="text-base font-semibold mb-3">Por lugar</h2>
        <div className="border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">Lugar</th>
                <th className="px-4 py-2 font-medium text-right">Activos</th>
                <th className="px-4 py-2 font-medium text-right">Vendidos</th>
                <th className="px-4 py-2 font-medium text-right">% vendido</th>
              </tr>
            </thead>
            <tbody>
              {byTown.length === 0 ? (
                <tr><td className="px-4 py-3 text-gray-500" colSpan={4}>Aún no hay anuncios.</td></tr>
              ) : byTown.map((t) => {
                const total = t.active + t.sold
                return (
                  <tr key={t.town} className="border-b last:border-0">
                    <td className="px-4 py-2">{t.town}</td>
                    <td className="px-4 py-2 text-right">{t.active}</td>
                    <td className="px-4 py-2 text-right">{t.sold}</td>
                    <td className="px-4 py-2 text-right">{fmtPct(total > 0 ? (t.sold / total) * 100 : null)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  )
}
