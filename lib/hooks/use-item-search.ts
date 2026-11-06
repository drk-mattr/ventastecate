// Items engine — shared client-side type-ahead search (§5, §8).
//
// One hook for both the posting picker and the business-page add form:
// debounced search over a business's existing offerings + the kind
// taxonomy, plus hashtag resolution (hashtags typed in a post are
// OFFERED as tags, never applied silently).
//
// No useEffect + setState anywhere: searches run from event handlers
// (typing, focus) and the debounce lives in a ref.

'use client'

import { useState, useRef, useCallback } from 'react'
import type { ItemSearchResult } from '@/lib/items/types'

export type HashtagSuggestion = {
  tag: string
  kindId: string
  kindName: string
  kindSlug: string
}

export function extractHashtags(text: string): string[] {
  const tags = [...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((m) => m[1])
  return [...new Set(tags)].slice(0, 5)
}

export function useItemSearch(businessId: string | null) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ItemSearchResult>({ items: [], kinds: [] })
  const [searching, setSearching] = useState(false)
  const [hashtagSuggestions, setHashtagSuggestions] = useState<HashtagSuggestion[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQueryRef = useRef('')

  const runSearch = useCallback(
    async (q: string) => {
      if (!businessId) {
        setResults({ items: [], kinds: [] })
        return
      }
      lastQueryRef.current = q
      setSearching(true)
      try {
        const res = await fetch(
          `/api/items/search?business_id=${encodeURIComponent(businessId)}&q=${encodeURIComponent(q)}`,
        )
        if (!res.ok) throw new Error('search failed')
        const data = (await res.json()) as ItemSearchResult
        // Drop stale responses (a slower earlier query finishing later).
        if (lastQueryRef.current === q) setResults(data)
      } catch {
        if (lastQueryRef.current === q) setResults({ items: [], kinds: [] })
      } finally {
        if (lastQueryRef.current === q) setSearching(false)
      }
    },
    [businessId],
  )

  // Called on every keystroke; the fetch is debounced. An empty query
  // still searches: it returns the business's existing offerings.
  const handleQueryChange = useCallback(
    (val: string) => {
      setQuery(val)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => runSearch(val.trim()), 250)
    },
    [runSearch],
  )

  const searchNow = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      runSearch(q.trim())
    },
    [runSearch],
  )

  // Resolve each #hashtag in the post text to its canonical kind and
  // offer it as a suggestion. Called from an onFocus handler, never
  // from an effect.
  const loadHashtagSuggestions = useCallback(
    async (text: string, alreadySelectedSlugs: Set<string>) => {
      if (!businessId) return
      const tags = extractHashtags(text)
      if (tags.length === 0) {
        setHashtagSuggestions([])
        return
      }
      const found: HashtagSuggestion[] = []
      await Promise.all(
        tags.map(async (tag) => {
          try {
            const res = await fetch(
              `/api/items/search?business_id=${encodeURIComponent(businessId)}&q=${encodeURIComponent(tag)}`,
            )
            if (!res.ok) return
            const data = (await res.json()) as ItemSearchResult
            const kind = data.kinds[0] ?? null
            if (kind && !alreadySelectedSlugs.has(kind.slug)) {
              found.push({ tag, kindId: kind.id, kindName: kind.name, kindSlug: kind.slug })
            }
          } catch {
            // A hashtag that does not resolve is simply not suggested.
          }
        }),
      )
      setHashtagSuggestions(found.slice(0, 3))
    },
    [businessId],
  )

  const reset = useCallback(() => {
    setQuery('')
    setResults({ items: [], kinds: [] })
    setHashtagSuggestions([])
  }, [])

  return {
    query,
    results,
    searching,
    hashtagSuggestions,
    handleQueryChange,
    searchNow,
    loadHashtagSuggestions,
    reset,
    setHashtagSuggestions,
  }
}
