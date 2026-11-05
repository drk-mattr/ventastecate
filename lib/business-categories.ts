// Category variants that came in from different seed batches (plural vs
// singular, accented vs unaccented) are the same category. Group them under
// one canonical label so chips and the categories page do not show
// "hospital" and "hospitales" as two different things. The DB values stay
// as seeded; filtering expands a canonical label to all its variants.
const VARIANTS: Record<string, string[]> = {
  'hospital': ['hospital', 'hospitales'],
  'mercado': ['mercado', 'mercados'],
  'spa': ['spa', 'spas'],
  'pizzería': ['pizzeria', 'pizzería'],
  'pastelería': ['pasteleria', 'pastelería'],
  'panadería': ['panaderia', 'panadería'],
  'óptica': ['optica', 'óptica'],
  'clínica': ['clinica', 'clínica'],
  'farmacia': ['farmacia', 'farmacias'],
  'cervecería': ['cerveceria', 'cervecería'],
  'tortillería': ['tortilleria', 'tortillería'],
  'carnicería': ['carniceria', 'carnicería'],
  'dulcería': ['dulceria', 'dulcería'],
  'licorería': ['licoreria', 'licorería'],
  'librería': ['libreria', 'librería'],
  'florería': ['floreria', 'florería'],
  'barbería': ['barberia', 'barbería'],
  'mueblería': ['muebleria', 'mueblería'],
  'papelería': ['papeleria', 'papelería'],
  'zapatería': ['zapateria', 'zapatería'],
  'vinícola': ['vinicola', 'vinícola'],
}

export function canonicalCategory(category: string): string {
  for (const [canonical, variants] of Object.entries(VARIANTS)) {
    if (variants.includes(category)) return canonical
  }
  return category
}

export function variantsForCategory(canonical: string): string[] {
  return VARIANTS[canonical] || [canonical]
}

// Group raw category values into canonical labels with summed counts,
// sorted most-used first. Used by the index chips and the categories page.
export function groupCategories(raw: (string | null)[]): { category: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const value of raw) {
    if (!value) continue
    const canonical = canonicalCategory(value)
    counts.set(canonical, (counts.get(canonical) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
}
