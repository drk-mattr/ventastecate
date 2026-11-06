// Items engine — optional offering tag in the posting form (§8, 034B).
//
// Shown only after the listing tags a business (decision 4: no item
// tag without the business). The first selected offering is the
// primary tag; the rest are secondary. #hashtags typed in the post
// text are offered as suggestions, never applied silently.
//
// The question adapts to the business: "¿Qué probaste o compraste?"
// for food and shops, "¿Qué servicio recibiste?" for services.

'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { Business } from '@/lib/types/database'
import { ListingType } from '@/lib/types/database'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, X, Plus, Loader2, Tag, Hash } from 'lucide-react'
import { useItemSearch } from '@/lib/hooks/use-item-search'
import { itemQuestion } from '@/lib/items/question'
import { slugifyKindName } from '@/lib/items/normalize'
import type { SelectedItemTag } from '@/lib/items/types'

const MAX_TAGS = 5

type ItemTagPickerProps = {
  business: Business
  listingType: ListingType
  textForHashtags: string
  value: SelectedItemTag[]
  onChange: (value: SelectedItemTag[]) => void
}

export function ItemTagPicker({
  business,
  listingType,
  textForHashtags,
  value,
  onChange,
}: ItemTagPickerProps) {
  const { user } = useAuth()
  const search = useItemSearch(business.id)
  const [isOpen, setIsOpen] = useState(false)
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const question = itemQuestion(business.category, listingType)
  const selectedSlugs = new Set(value.map((v) => v.kindSlug))

  const addTag = (tag: SelectedItemTag) => {
    if (value.length >= MAX_TAGS) return
    if (selectedSlugs.has(tag.kindSlug)) return
    onChange([...value, tag])
    search.reset()
    setIsOpen(false)
  }

  const removeTag = (kindSlug: string) => {
    onChange(value.filter((v) => v.kindSlug !== kindSlug))
  }

  const makePrimary = (kindSlug: string) => {
    const tag = value.find((v) => v.kindSlug === kindSlug)
    if (!tag) return
    onChange([tag, ...value.filter((v) => v.kindSlug !== kindSlug)])
  }

  const handleFocus = () => {
    setIsOpen(true)
    search.searchNow(search.query)
    if (!suggestionsLoaded) {
      setSuggestionsLoaded(true)
      search.loadHashtagSuggestions(textForHashtags, selectedSlugs)
    }
  }

  const handleInputChange = (val: string) => {
    setIsOpen(true)
    search.handleQueryChange(val)
  }

  const trimmedQuery = search.query.trim()
  const querySlug = trimmedQuery ? slugifyKindName(trimmedQuery) : ''
  const exactMatch =
    trimmedQuery.length > 0 &&
    (search.results.items.some((i) => i.kind_slug === querySlug) ||
      search.results.kinds.some((k) => k.slug === querySlug))
  const showCreateOption = trimmedQuery.length >= 2 && querySlug.length >= 2 && !exactMatch && !search.searching

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label className="flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5 text-gray-500" />
        {question} <span className="text-gray-400 font-normal">(opcional)</span>
      </Label>

      {/* Selected tags: first is primary, the rest secondary. */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, index) => (
            <span
              key={tag.kindSlug}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                index === 0
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              {tag.kindName}
              {index === 0 ? (
                <span className="text-[10px] text-gray-300">Principal</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makePrimary(tag.kindSlug)}
                  className="text-[10px] underline hover:text-gray-900"
                >
                  Principal
                </button>
              )}
              <button
                type="button"
                onClick={() => removeTag(tag.kindSlug)}
                className="hover:opacity-70"
                aria-label={`Quitar ${tag.kindName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {value.length < MAX_TAGS && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            type="text"
            value={search.query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            placeholder={`Ej: tacos de adobada, churros, corte de pelo…`}
            className="pl-8 pr-3"
          />
          {search.searching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />
          )}

          {isOpen && (
            <div className="absolute z-50 mt-1 w-full max-w-md bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
              {search.results.items.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Lo que ya ofrecen aquí
                  </p>
                  {search.results.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addTag({
                          itemId: item.id,
                          kindId: item.kind_id,
                          kindName: item.kind_name,
                          kindSlug: item.kind_slug,
                        })
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <Tag className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">
                          {item.kind_name}
                        </span>
                        <span className="block text-[10px] text-gray-400">
                          {item.mention_count > 0
                            ? `Mencionado por ${item.contributors} ${item.contributors === 1 ? 'persona' : 'personas'}`
                            : 'Sin menciones todavía'}
                        </span>
                      </span>
                    </button>
                  ))}
                </>
              )}

              {search.results.kinds.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Tipos
                  </p>
                  {search.results.kinds.map((kind) => (
                    <button
                      key={kind.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addTag({
                          kindId: kind.id,
                          kindName: kind.name,
                          kindSlug: kind.slug,
                        })
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <Plus className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">
                          {kind.name}
                        </span>
                        <span className="block text-[10px] text-gray-400">
                          Nuevo en este negocio
                        </span>
                      </span>
                    </button>
                  ))}
                </>
              )}

              {showCreateOption && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addTag({
                      kindName: trimmedQuery,
                      kindSlug: querySlug,
                      isNewKind: true,
                    })
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors bg-gray-50 border-t border-gray-100"
                >
                  <Plus className="h-4 w-4 text-gray-500 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900">
                      Crear &quot;{trimmedQuery}&quot;
                    </span>
                    <span className="block text-[10px] text-gray-400">
                      Se agrega como tipo nuevo, pendiente de revisión
                    </span>
                  </span>
                </button>
              )}

              {search.results.items.length === 0 &&
                search.results.kinds.length === 0 &&
                !showCreateOption &&
                !search.searching && (
                  <p className="px-3 py-2.5 text-xs text-gray-400">
                    {trimmedQuery.length < 2
                      ? 'Escribe para buscar lo que ofrecen aquí'
                      : 'Sin resultados — puedes crearlo abajo'}
                  </p>
                )}
            </div>
          )}
        </div>
      )}

      {/* Hashtag suggestions: offered, never applied silently. */}
      {search.hashtagSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Hash className="h-3 w-3" /> En tu texto:
          </span>
          {search.hashtagSuggestions.map((s) => (
            <button
              key={s.kindSlug}
              type="button"
              onClick={() => {
                addTag({ kindId: s.kindId, kindName: s.kindName, kindSlug: s.kindSlug })
                search.setHashtagSuggestions((prev) =>
                  prev.filter((p) => p.kindSlug !== s.kindSlug),
                )
              }}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              #{s.tag} → {s.kindName}
              <Plus className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        Etiqueta lo que probaste en {business.name}. La primera oferta es la principal; las demás son secundarias.
      </p>

      {!user && (
        <p className="text-[11px] text-gray-400">
          Inicia sesión para etiquetar ofertas.
        </p>
      )}
    </div>
  )
}
