// Pure helpers for the Medium-style news article (v1, 2026-11-10).
// No imports from components, no Supabase, no side effects —
// unit-testable in isolation. Tags are derived only (spec §5):
// category from the 6-value NEWS_CATEGORIES list, place from the
// canonical town list. Nobody types a tag anywhere.

import { NEWS_CATEGORIES } from '@/lib/categories'
import { KNOWN_TOWNS } from '@/lib/business-regions'

export type ArticleTagLink = { label: string; href: string }

/** Reading time in whole minutes: words / 200 wpm, minimum 1. */
export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/**
 * Split a trailing `Fuente: <url>` line off a description. The
 * internal community-post endpoint appends "\n\nFuente: {source}"
 * to every community post, so the citation lives at the end of the
 * body as raw URL text. Only a TRAILING line is stripped — a
 * "Fuente:" mention mid-body is the author's own text and stays.
 * Returns the body (trailing whitespace trimmed) and the URL, or
 * null when no trailing Fuente line exists (user-posted news).
 */
export function splitSource(description: string): { body: string; sourceUrl: string | null } {
  const lines = description.split('\n')
  let lastIdx = lines.length - 1
  while (lastIdx >= 0 && lines[lastIdx].trim() === '') lastIdx--
  if (lastIdx < 0) return { body: description, sourceUrl: null }
  const match = /^Fuente:\s+(https?:\/\/\S+)\s*$/.exec(lines[lastIdx].trim())
  if (!match) return { body: description, sourceUrl: null }
  return {
    body: lines.slice(0, lastIdx).join('\n').replace(/\s+$/, ''),
    sourceUrl: match[1],
  }
}

/**
 * Split a body into real paragraphs on blank lines. Single
 * newlines inside a paragraph stay as line breaks (the renderer
 * uses whitespace-pre-wrap per paragraph).
 */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

/** Domain of a URL for the source footer; unparseable → the raw string. */
export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function resolvePlace(
  city: string | null | undefined,
  location: string | null | undefined,
): string | null {
  const c = (city ?? '').trim()
  if (c) {
    // Canonical spelling when it matches a known town ("tecate" →
    // "Tecate"); otherwise the stored value verbatim — the posting
    // flow prefills it from the region cookie.
    return KNOWN_TOWNS.find((t) => t.toLowerCase() === c.toLowerCase()) ?? c
  }
  // No city: match the free-text location against the canonical
  // town list ("Av. Revolución, Tijuana" → "Tijuana"). Nothing
  // matches → no pill, rather than a junk one.
  const loc = (location ?? '').trim().toLowerCase()
  if (!loc) return null
  return KNOWN_TOWNS.find((t) => loc.includes(t.toLowerCase())) ?? null
}

/**
 * v1 tag pills: exactly two, both derived, both tappable to a real
 * filtered list. Category first (Medium order is topic-first),
 * place second. A pill is omitted — never rendered junk — when its
 * source field is missing or unrecognized.
 */
export function tagLinks(listing: {
  category?: string | null
  city?: string | null
  location?: string | null
}): ArticleTagLink[] {
  const tags: ArticleTagLink[] = []
  const category = (listing.category ?? '').trim()
  if (category && NEWS_CATEGORIES.includes(category)) {
    tags.push({
      label: category,
      href: `/search?type=news&category=${encodeURIComponent(category)}`,
    })
  }
  const place = resolvePlace(listing.city, listing.location)
  if (place) {
    tags.push({
      label: place,
      href: `/search?type=news&location=${encodeURIComponent(place)}`,
    })
  }
  return tags
}
