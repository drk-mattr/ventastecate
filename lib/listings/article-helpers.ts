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

export type ArticleSource = { label: string; url: string }

/** Parse one source line: `Label — <url>` (or a bare URL, whose label is its domain). */
function parseSourceLine(line: string): ArticleSource | null {
  const m = /(https?:\/\/\S+)/.exec(line)
  if (!m) return null
  const url = m[1].replace(/[),.;]+$/, '')
  const label =
    line
      .slice(0, m.index)
      .replace(/[\s\u2014\u2013\-:|]+$/, '')
      .trim() || sourceDomain(url).replace(/^www\./, '')
  return { label, url }
}

/**
 * Split trailing sources off a description. Two formats, both
 * trailing-only — a "Fuente(s)" mention mid-body is the author's
 * own text and stays.
 * - Multi-source (merged stories): a `Fuentes:` line followed by
 *   one `Label — <url>` line per source, nothing after it.
 * - Single-source (the community-post endpoint's
 *   "\n\nFuente: {source}"): a trailing `Fuente: <url>` line,
 *   or a bare trailing URL line.
 * Returns the body (trailing whitespace trimmed) and the sources
 * in order; no trailing sources → empty list, body as-is.
 * The card and the detail page both read this, so a merged story
 * keeps its first source's domain on the card.
 */
export function splitSources(description: string): { body: string; sources: ArticleSource[] } {
  const lines = description.split('\n')
  let lastIdx = lines.length - 1
  while (lastIdx >= 0 && lines[lastIdx].trim() === '') lastIdx--
  if (lastIdx < 0) return { body: description, sources: [] }

  // 1. Trailing `Fuentes:` block: contiguous run of URL lines
  // ending at a `Fuentes:` line.
  {
    let j = lastIdx
    const tail: string[] = []
    let found = false
    while (j >= 0) {
      const line = lines[j].trim()
      if (line === '') {
        j--
        continue
      }
      if (/^Fuentes:\s*$/.test(line)) {
        found = true
        break
      }
      if (!/https?:\/\/\S+/.test(line)) break
      tail.unshift(line)
      j--
    }
    if (found) {
      const sources = tail.map(parseSourceLine).filter((x): x is ArticleSource => x !== null)
      if (sources.length > 0 && sources.length === tail.length) {
        return { body: lines.slice(0, j).join('\n').replace(/\s+$/, ''), sources }
      }
    }
  }

  // 2. Single trailing `Fuente: <url>` line.
  const lastLine = lines[lastIdx].trim()
  const single = /^Fuente:\s+(https?:\/\/\S+)\s*$/.exec(lastLine)
  if (single) {
    const url = single[1]
    return {
      body: lines.slice(0, lastIdx).join('\n').replace(/\s+$/, ''),
      sources: [{ label: sourceDomain(url).replace(/^www\./, ''), url }],
    }
  }

  // 3. Bare trailing URL line.
  if (/^https?:\/\/\S+$/.test(lastLine)) {
    const url = lastLine
    return {
      body: lines.slice(0, lastIdx).join('\n').replace(/\s+$/, ''),
      sources: [{ label: sourceDomain(url).replace(/^www\./, ''), url }],
    }
  }

  return { body: description, sources: [] }
}

/**
 * Single-source view of splitSources, for the feed card: the body
 * with the trailing sources stripped, and the FIRST source's URL
 * (or null when there is none — user-posted news).
 */
export function splitSource(description: string): { body: string; sourceUrl: string | null } {
  const { body, sources } = splitSources(description)
  return { body, sourceUrl: sources.length > 0 ? sources[0].url : null }
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
