'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { useTranslations } from '@/lib/hooks/use-translations'

interface SuggestListing {
  id: string
  title: string
  priceLabel: string
}

interface SuggestKind {
  slug: string
  name: string
  parent_name: string | null
}

interface SuggestBusiness {
  id: string
  name: string
  category: string | null
  city: string | null
}

interface Suggestions {
  listings: SuggestListing[]
  kinds: SuggestKind[]
  businesses: SuggestBusiness[]
}

type SuggestRow =
  | { key: string; href: string; label: string; sub?: string; section: 'Anuncios' | 'Tipos' | 'Negocios' }

// The header search bar is the ONE search entry point: a real text
// input, typing only. Tapping it focuses it and opens the keyboard —
// it never opens filters (filters live on /search, behind the Filtros
// button). Typing shows live suggestions from /api/search/suggest;
// Enter (or the visible Buscar button) submits to /search?q=.
export function HeaderSearch() {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestions>({ listings: [], kinds: [], businesses: [] })
  const [highlight, setHighlight] = useState(-1)

  // Keep the input in sync with the URL (type pills / filter sheet
  // navigate with a q param) and close the dropdown on navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(searchParams.get('q') || '')
    setOpen(false)
    setHighlight(-1)
  }, [searchParams, pathname])

  // Live suggestions, debounced — only the fetch callbacks set state.
  // A query under 2 chars simply shows no panel (showPanel gates on
  // length), so nothing needs clearing here.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { listings: [], kinds: [], businesses: [] }))
        .then((data: Suggestions) => {
          setSuggestions(data)
          setOpen(true)
          setHighlight(-1)
          setLoading(false)
        })
        .catch((e) => {
          if ((e as Error)?.name !== 'AbortError') setLoading(false)
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const rows: SuggestRow[] = [
    ...suggestions.listings.map((l) => ({
      key: `l-${l.id}`,
      href: `/listings/${l.id}`,
      label: l.title,
      sub: l.priceLabel,
      section: 'Anuncios' as const,
    })),
    ...suggestions.kinds.map((k) => ({
      key: `k-${k.slug}`,
      href: `/tipos/${k.slug}`,
      label: k.parent_name ? `${k.parent_name} › ${k.name}` : k.name,
      section: 'Tipos' as const,
    })),
    ...suggestions.businesses.map((b) => ({
      key: `b-${b.id}`,
      href: `/businesses/${b.id}`,
      label: b.name,
      sub: [b.category, b.city].filter(Boolean).join(' · '),
      section: 'Negocios' as const,
    })),
  ]

  const submitSearch = (value?: string) => {
    const q = (value ?? query).trim()
    setOpen(false)
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && rows.length > 0) {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (h + 1) % rows.length)
    } else if (e.key === 'ArrowUp' && rows.length > 0) {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (h <= 0 ? rows.length - 1 : h - 1))
    } else if (e.key === 'Enter') {
      if (open && highlight >= 0 && rows[highlight]) {
        e.preventDefault()
        setOpen(false)
        router.push(rows[highlight].href)
      }
      // Otherwise the form submit handles it.
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlight(-1)
    }
  }

  const hasRows = rows.length > 0
  const showPanel = open && query.trim().length >= 2 && (loading || hasRows)

  return (
    <div className="relative flex-1 min-w-0 max-w-2xl mx-0 sm:mx-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submitSearch()
        }}
        className="flex items-center bg-white border rounded-lg h-11 sm:h-9 overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-gray-900"
      >
        <Search className="ml-2.5 h-3.5 w-3.5 text-gray-400 shrink-0 pointer-events-none" />
        {/* Never drop below text-base (16px): iOS Safari auto-zooms any
            smaller text field on focus. */}
        <input
          type="search"
          placeholder={t.search.placeholder}
          className="flex-1 min-w-0 h-full pl-2 pr-2 text-base outline-none bg-transparent"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hasRows) setOpen(true)
          }}
          aria-label={t.search.placeholder}
          autoComplete="off"
        />
        {/* Visible submit — typing is not the only way in; the keyboard's
            search key is no longer the only submit path on mobile. */}
        <button
          type="submit"
          aria-label="Buscar"
          className="shrink-0 bg-gray-900 text-white h-9 sm:h-7 my-1 mr-1 px-3 rounded-md text-sm font-medium flex items-center gap-1.5"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </form>

      {showPanel && (
        <>
          {/* Click-outside closes the panel */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {loading && !hasRows ? (
              <p className="px-4 py-3 text-sm text-gray-400">Buscando…</p>
            ) : (
              (['Anuncios', 'Tipos', 'Negocios'] as const).map((section) => {
                const sectionRows = rows.filter((r) => r.section === section)
                if (sectionRows.length === 0) return null
                return (
                  <div key={section} className="py-1">
                    <p className="px-4 pt-1.5 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {section}
                    </p>
                    {sectionRows.map((row) => {
                      const idx = rows.indexOf(row)
                      return (
                        <button
                          key={row.key}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setOpen(false)
                            router.push(row.href)
                          }}
                          onMouseEnter={() => setHighlight(idx)}
                          className={`w-full text-left px-4 py-2 flex items-baseline justify-between gap-3 ${
                            idx === highlight ? 'bg-gray-100' : ''
                          }`}
                        >
                          <span className="text-sm text-gray-900 truncate">{row.label}</span>
                          {row.sub && (
                            <span className="text-xs text-gray-500 shrink-0">{row.sub}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
