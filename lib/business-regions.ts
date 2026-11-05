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

// Site-wide location selector (2026-11-04, Tecate-first): the viewer picks
// one location in the header and every browsable feed follows it. Tecate
// is the default; other places are sister locations you explicitly select,
// never mixed in by default. "Alrededores" is the small towns around
// Tecate; "Todas" is the explicit opt-in to the mixed view. Towns: null
// means no town filter.
export const LOCATION_OPTIONS: { label: string; towns: string[] | null }[] = [
  { label: 'Tecate', towns: ['Tecate'] },
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
