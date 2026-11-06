// Items engine — add an offering from the business page, without a
// full publication (§8: "¿Falta algo que venden aquí?").
//
// Type-ahead over the business's existing offerings + the kind
// taxonomy (same search as the posting picker). Picking a kind adds
// the offering instantly, attributed to the creator; picking a kind
// the business already offers just says so. A brand-new kind is
// created pending until a moderator places it (§4).

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Input } from '@/components/ui/input'
import { Search, Plus, Loader2, Tag } from 'lucide-react'
import { useItemSearch } from '@/lib/hooks/use-item-search'
import { itemQuestion } from '@/lib/items/question'
import { slugifyKindName } from '@/lib/items/normalize'

type AddOfferingFormProps = {
  businessId: string
  businessCategory?: string | null
}

export function AddOfferingForm({ businessId, businessCategory }: AddOfferingFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const search = useItemSearch(businessId)
  const [open, setOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const submitKind = async (kindId: string | null, kindName: string | null) => {
    if (!user) {
      router.push(`/login?redirect=/businesses/${businessId}`)
      return
    }
    setSaving(true)
    setError('')
    setDone('')
    const res = await fetch(`/api/businesses/${businessId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kindId ? { kind_id: kindId } : { kind_name: kindName }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error || 'No se pudo agregar la oferta')
      return
    }
    const data = (await res.json()) as { item?: { kind_name?: string; created?: boolean } }
    setDone(
      data.item?.created === false
        ? `“${data.item?.kind_name ?? kindName}” ya estaba en la lista.`
        : `“${data.item?.kind_name ?? kindName}” agregada. Gracias por completar el índice.`,
    )
    search.reset()
    setIsOpen(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            if (!user) {
              router.push(`/login?redirect=/businesses/${businessId}`)
              return
            }
            setOpen(true)
          }}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          ¿Falta algo que venden aquí? Ayuda a completar la información de este negocio.
        </button>
        {done && <p className="text-xs text-gray-400 mt-1">{done}</p>}
      </div>
    )
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
      <p className="text-sm font-medium text-gray-900">{itemQuestion(businessCategory)}</p>
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          type="text"
          value={search.query}
          onChange={(e) => {
            setIsOpen(true)
            search.handleQueryChange(e.target.value)
          }}
          onFocus={() => {
            setIsOpen(true)
            search.searchNow(search.query)
          }}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Ej: tacos de adobada, churros, corte de pelo…"
          className="pl-8 pr-3"
          disabled={saving}
          autoFocus
        />
        {search.searching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />
        )}

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
            {search.results.items.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Lo que ya ofrecen aquí
                </p>
                {search.results.items.map((item) => (
                  <div
                    key={item.id}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <Tag className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">
                        {item.kind_name}
                      </span>
                      <span className="block text-[10px] text-gray-400">Ya está en la lista</span>
                    </span>
                  </div>
                ))}
              </>
            )}

            {search.results.kinds.map((kind) => (
              <button
                key={kind.id}
                type="button"
                disabled={saving}
                onMouseDown={(e) => {
                  e.preventDefault()
                  submitKind(kind.id, null)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 disabled:opacity-50"
              >
                <Plus className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">
                    {kind.name}
                  </span>
                  <span className="block text-[10px] text-gray-400">Agregar a este negocio</span>
                </span>
              </button>
            ))}

            {showCreateOption && (
              <button
                type="button"
                disabled={saving}
                onMouseDown={(e) => {
                  e.preventDefault()
                  submitKind(null, trimmedQuery)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors bg-gray-50 border-t border-gray-100 disabled:opacity-50"
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
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => {
          setOpen(false)
          search.reset()
          setError('')
        }}
        className="text-xs text-gray-400 underline hover:text-gray-600"
      >
        Cancelar
      </button>
    </div>
  )
}
