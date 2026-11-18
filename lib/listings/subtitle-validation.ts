// Server-safe subtitle (dek) validation for news articles.
//
// Implements the cheap pre-publish checks from the user's dek rules spec
// (hidden_files/ai-subtitle-dek-rules-2026-11-17.md):
//   word count 18-32, at most 2 content words shared with the title,
//   no "!" or "?", every number in the subtitle also appears in the body.
//
// What it cannot do: catch relation errors. The first backfilled subtitle
// ("...un rancho con más de 200 denuncias...") passes all four checks —
// the complaints really are "200" and really are in the body — but it
// misattributes them to the ranch. Only the generation prompt and a human
// eye catch that. A failed check means regenerate once; a second failure
// means publish without a stored subtitle.

export interface SubtitleValidation {
  ok: boolean
  reasons: string[]
}

// Small Spanish stopword list, kept short on purpose. Number words are
// stopwords here because the headline's figures ("cinco guardias", "dos
// muertos") must not count as shared content words.
const STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'con', 'por', 'para', 'que', 'se', 'su', 'sus', 'del', 'al', 'lo', 'le', 'les',
  'no', 'ni', 'son', 'es', 'fue', 'fueron', 'hay', 'más', 'mas',
  'dos', 'tres', 'cinco', 'cuatro', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'uno', 'como', 'cuando', 'donde', 'este', 'esta', 'estos', 'estas', 'ese', 'esa',
  'pero', 'si', 'también', 'ya', 'tras', 'sin', 'sobre', 'entre', 'hasta',
])

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

function contentWords(text: string): string[] {
  return words(text)
    .map((w) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((w) => w.length > 0 && !STOPWORDS.has(w))
}

function numberTokens(text: string): string[] {
  return (text.match(/\d[\d.,:]*/g) ?? []).map((t) => t.replace(/[.,:]+$/g, ''))
}

export function validateSubtitle(subtitle: string, title: string, body: string): SubtitleValidation {
  const trimmed = subtitle.trim()
  if (!trimmed) {
    return { ok: false, reasons: ['empty'] }
  }
  const reasons: string[] = []

  const count = words(trimmed).length
  if (count < 18 || count > 32) {
    reasons.push(`word count ${count} outside 18-32`)
  }

  const titleContent = new Set(contentWords(title))
  const shared = [...new Set(contentWords(trimmed))].filter((w) => titleContent.has(w))
  if (shared.length > 2) {
    reasons.push(`shares ${shared.length} content words with title: ${shared.join(', ')}`)
  }

  if (/[!?]/.test(trimmed)) {
    reasons.push('contains ! or ?')
  }

  const bodyNumbers = new Set(numberTokens(body))
  const missing = [...new Set(numberTokens(trimmed))].filter((n) => !bodyNumbers.has(n))
  if (missing.length > 0) {
    reasons.push(`numbers not in body: ${missing.join(', ')}`)
  }

  return { ok: reasons.length === 0, reasons }
}
