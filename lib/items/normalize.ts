// Items engine — search-key normalization (§5 of the v1.1 brief).
//
// Mirrors the SQL function public.normalize_search_key from migration
// 034A: lowercase, accents stripped, whitespace collapsed. Connecting
// words (de, con) are NOT stripped: "café con leche" and "café de
// leche" must not auto-merge.

export function normalizeSearchKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Slug for a kind name: normalized, non-alphanumerics become hyphens,
// leading/trailing hyphens trimmed. Must satisfy the DB check
// ^[a-z0-9][a-z0-9-]*[a-z0-9]$ (so a usable slug is at least 2 chars).
export function slugifyKindName(input: string): string {
  return normalizeSearchKey(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidKindSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)
}
