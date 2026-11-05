import Link from 'next/link'

// Slim type shortcut row that replaces the old hero's category links.
// Search itself moved into the header nav bar, so this row is only the
// quick type/category filters, no title and no big search pill.
const SHORTCUTS = [
  { label: 'Todo', href: '/search' },
  { label: 'Productos', href: '/search?type=product' },
  { label: 'Servicios', href: '/search?type=service' },
  { label: 'Eventos', href: '/search?type=event' },
  { label: 'Noticias', href: '/search?type=news' },
  { label: 'Comida', href: '/search?category=Comida' },
  { label: 'Casas: Renta', href: '/search?category=Casas%20en%20Renta' },
  { label: 'Casas: Venta', href: '/search?category=Casas%20en%20Venta' },
  { label: 'Terrenos', href: '/search?category=Terrenos' },
]

export function TypeShortcuts() {
  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-2 flex gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {SHORTCUTS.map((s) => (
          <Link key={s.label} href={s.href} className="text-xs text-gray-500 hover:text-gray-900 whitespace-nowrap py-1">
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
