// Town -> region map for businesses. Regions are travel areas, not admin
// boundaries: Tecate y alrededores is one daily area, Valle de Guadalupe
// and Tijuana and San Diego are the corridor. A town maps to exactly one
// region, in code, so nobody can invent a variant spelling of a region.
// New towns typed in by users have no region until added here.
export const TOWN_REGIONS: Record<string, { region: string; state: string; country: string }> = {
  'Tecate': { region: 'Tecate y alrededores', state: 'Baja California', country: 'MX' },
  'El Hongo': { region: 'Tecate y alrededores', state: 'Baja California', country: 'MX' },
  'Rumorosa': { region: 'Tecate y alrededores', state: 'Baja California', country: 'MX' },
  'Villas de Campo': { region: 'Tecate y alrededores', state: 'Baja California', country: 'MX' },
  'Testarazo': { region: 'Tecate y alrededores', state: 'Baja California', country: 'MX' },
  'Porvenir': { region: 'Tecate y alrededores', state: 'Baja California', country: 'MX' },
  'Valle de Guadalupe': { region: 'Valle de Guadalupe', state: 'Baja California', country: 'MX' },
  'Ensenada': { region: 'Valle de Guadalupe', state: 'Baja California', country: 'MX' },
  'Tijuana': { region: 'Tijuana', state: 'Baja California', country: 'MX' },
  'San Diego': { region: 'San Diego', state: 'California', country: 'US' },
}
export const KNOWN_TOWNS = Object.keys(TOWN_REGIONS)
export const REGIONS = [...new Set(Object.values(TOWN_REGIONS).map((v) => v.region))]
export function getRegionForTown(town: string | null | undefined): string | null {
  if (!town) return null
  return TOWN_REGIONS[town]?.region ?? null
}
export function townsForRegion(region: string): string[] {
  return Object.entries(TOWN_REGIONS).filter(([, v]) => v.region === region).map(([town]) => town)
}

// Site-wide location selector (2026-11-04, Tecate-first; 2026-11-05 the
// default Tecate view was widened to include the surrounding towns):
// the viewer picks one location in the header and every browsable feed
// follows it. Tecate is the default and now covers Tecate plus its
// surrounding towns; farther places are sister locations you explicitly
// select, never mixed in by default. "Alrededores" is the surrounding
// towns on their own; "Todas" is the explicit opt-in to the mixed view.
// Towns: null means no town filter.
export const LOCATION_OPTIONS: { label: string; towns: string[] | null }[] = [
  { label: 'Tecate', towns: ['Tecate', 'El Hongo', 'Rumorosa', 'Porvenir', 'Villas de Campo', 'Testarazo'] },
  { label: 'Valle de Guadalupe', towns: ['Valle de Guadalupe', 'Ensenada'] },
  { label: 'Tijuana', towns: ['Tijuana'] },
  { label: 'San Diego', towns: ['San Diego'] },
  { label: 'Alrededores', towns: ['El Hongo', 'Rumorosa', 'Porvenir', 'Villas de Campo', 'Testarazo'] },
  { label: 'Todas', towns: null },
]
export const LOCATION_COOKIE = 'vt_region'
export function townsForLocation(label: string | null | undefined): string[] | null {
  if (!label) return ['Tecate']
  const option = LOCATION_OPTIONS.find((o) => o.label === label)
  if (!option) return ['Tecate']
  return option.towns
}
export function isValidLocation(label: string | null | undefined): label is string {
  return !!label && LOCATION_OPTIONS.some((o) => o.label === label)
}

// Case-insensitive town match for PostgREST .or() filters (homepage feed,
// search). `ilike` without % wildcards is an exact match that ignores
// case, so a listing whose city was saved free-typed as "tecate" still
// matches the "Tecate" town. Existing rows are never re-saved — the
// match covers them as-is.
export function townFilterOr(towns: string[]): string {
  return towns.flatMap((t) => [`city.ilike.${t}`, `location.ilike.${t}`]).join(',')
}

// Normalize a free-typed city before it is saved: trim, then title-case,
// matching the canonical spelling of a known town when it matches one
// case-insensitively ("tecate" -> "Tecate", "valle de guadalupe" ->
// "Valle de Guadalupe"). Small connector words stay lowercase mid-name.
const SMALL_TOWN_WORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y'])
export function normalizeTownName(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null
  const known = KNOWN_TOWNS.find((t) => t.toLowerCase() === trimmed.toLowerCase())
  if (known) return known
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => (i > 0 && SMALL_TOWN_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}
