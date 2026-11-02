import Link from 'next/link'
import { Plus, Search, MessageCircle, MapPin, Tag, Wrench, UtensilsCrossed, Home, KeyRound, LandPlot, CalendarDays, Newspaper } from 'lucide-react'

const CATEGORIES = [
  { label: 'Productos', href: '/search?type=product', icon: Tag, bg: 'bg-gray-100 text-gray-900' },
  { label: 'Servicios', href: '/search?type=service', icon: Wrench, bg: 'bg-gray-100 text-gray-900' },
  { label: 'Comida', href: '/search?category=Comida', icon: UtensilsCrossed, bg: 'bg-gray-100 text-gray-900' },
  { label: 'Casas en Renta', href: '/search?category=Casas%20en%20Renta', icon: Home, bg: 'bg-gray-100 text-gray-900' },
  { label: 'Casas en Venta', href: '/search?category=Casas%20en%20Venta', icon: KeyRound, bg: 'bg-gray-100 text-gray-900' },
  { label: 'Terrenos', href: '/search?category=Terrenos', icon: LandPlot, bg: 'bg-gray-100 text-gray-900' },
  { label: 'Eventos', href: '/search?type=event', icon: CalendarDays, bg: 'bg-gray-100 text-gray-900' },
  { label: 'Noticias', href: '/search?type=news', icon: Newspaper, bg: 'bg-slate-200 text-slate-700' },
]

const STEPS = [
  { n: '1', title: 'Publica', text: 'Toma una foto, ponle precio y publícalo en menos de un minuto.' },
  { n: '2', title: 'Mensajea', text: 'Los vecinos te escriben directo en el sitio, sin salir de Tecate.' },
  { n: '3', title: 'Entrega en Tecate', text: 'Quedan en un lugar local, cierran el trato y listo.' },
]

export function FirstVisit() {
  return (
    <div className="space-y-8 py-2">
      <section className="rounded-2xl bg-gray-900 text-white px-6 py-8 sm:px-10 sm:py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center justify-center gap-1.5 mb-3">
          <MapPin className="h-3.5 w-3.5" /> Tecate, Baja California
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
          Tecate, esto empieza contigo.
        </h2>
        <p className="mt-3 text-sm sm:text-base text-gray-300 max-w-xl mx-auto">
          Compra y vende en tu comunidad, encuentra comida, casas, terrenos y eventos,
          y entérate de lo que pasa en Tecate — todo en un solo lugar, hecho por y para vecinos.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> Publica tu primer anuncio — gratis
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 hover:border-white text-white px-6 py-3 text-sm font-medium transition-colors"
          >
            <Search className="h-4 w-4" /> Explorar Tecate
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Sé de los primeros en publicar. Los primeros anuncios son los que la comunidad ve primero.
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Explora por categoría</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CATEGORIES.map(({ label, href, icon: Icon, bg }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-xl border bg-white px-3 py-3 hover:shadow-md transition-shadow"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-gray-900 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-white px-6 py-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Cómo funciona</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white text-sm font-bold">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                <p className="mt-0.5 text-sm text-gray-600 leading-snug">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm text-gray-600">
          <MessageCircle className="h-4 w-4 text-gray-400" />
          ¿Vendes algo? Publícalo hoy y deja que Tecate lo vea.
        </p>
      </section>
    </div>
  )
}
