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
