// Items engine — the posting question adapts to the business (§8).
//
// "¿Qué probaste o compraste?" works for food and shops, not for a
// barbería. The gesture is the same (tag business + offering); the
// words change.

const SERVICE_WORDS = [
  'barber', 'peluquer', 'taller', 'plomer', 'electric', 'limpieza',
  'reparaci', 'belleza', 'uñas', 'unas', 'clases', 'tutor', 'flete',
  'mudanza', 'jardiner', 'pintura', 'albañil', 'servicio', 'spa',
  'masaje', 'veterinaria', 'mecanic', 'cerrajer', 'fumigaci',
]

export function isServiceBusinessCategory(category?: string | null): boolean {
  if (!category) return false
  const c = category.toLowerCase()
  return SERVICE_WORDS.some((w) => c.includes(w))
}

export function itemQuestion(
  businessCategory?: string | null,
  listingType?: string | null,
): string {
  if (listingType === 'service' || isServiceBusinessCategory(businessCategory)) {
    return '¿Qué servicio recibiste?'
  }
  return '¿Qué probaste o compraste?'
}
