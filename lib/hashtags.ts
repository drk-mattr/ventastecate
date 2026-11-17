// Hashtag helpers — server-safe (no client directive).
//
// extractHashtags used to live in lib/hooks/use-item-search.ts, a
// client module. The listing detail page (a server component)
// imported it from there and called it during render, which
// crashed every detail page with a 500 ("Attempted to call
// extractHashtags() from the server but extractHashtags is on
// the client", PR #181 regression, 2026-11-16). The pure function
// lives here now; the hook re-exports it so its own callers keep
// working.

export function extractHashtags(text: string): string[] {
  const tags = [...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((m) => m[1])
  return [...new Set(tags)].slice(0, 5)
}
