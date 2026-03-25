'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Business } from '@/lib/types/database'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Store, X, Plus, Search, Loader2 } from 'lucide-react'

type BusinessTagPickerProps = {
  value: Business | null
  onChange: (business: Business | null) => void
  location?: string
  category?: string
}

export function BusinessTagPicker({ value, onChange, location, category }: BusinessTagPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Business[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(null)
  const { user } = useAuth()
  const supabase = createClient()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchBusinesses = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const normalized = q.toLowerCase().trim()
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .ilike('name_normalized', `%${normalized}%`)
        .order('mention_count', { ascending: false })
        .limit(8)
      setResults(data || [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [supabase])

  const handleInputChange = (val: string) => {
    setQuery(val)
    setIsOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchBusinesses(val), 300)
  }

  const selectBusiness = (biz: Business) => {
    onChange(biz)
    setQuery('')
    setIsOpen(false)
    setResults([])
  }

  const createAndSelect = async () => {
    if (!user || query.trim().length < 2) return
    setCreating(true)
    try {
      const name = query.trim()
      const nameNormalized = name.toLowerCase()

      // Check if it already exists (race condition guard)
      const { data: existing } = await supabase
        .from('businesses')
        .select('*')
        .eq('name_normalized', nameNormalized)
        .single()

      if (existing) {
        selectBusiness(existing as Business)
        setCreating(false)
        return
      }

      const { data: newBiz, error } = await supabase
        .from('businesses')
        .insert({
          name,
          name_normalized: nameNormalized,
          location: location || null,
          category: category || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      selectBusiness(newBiz as Business)
    } catch (err) {
      console.error('Error creating business:', err)
    } finally {
      setCreating(false)
    }
  }

  const clearSelection = () => {
    onChange(null)
    setQuery('')
  }

  // If a business is already selected, show the tag chip
  if (value) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5 text-gray-500" />
          Negocio / Restaurante
        </Label>
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
          <Store className="h-4 w-4 text-orange-600 shrink-0" />
          <span className="text-sm font-medium text-orange-900 flex-1 truncate">
            {value.name}
          </span>
          {value.mention_count > 0 && (
            <span className="text-[10px] text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded-full">
              {value.mention_count} {value.mention_count === 1 ? 'mención' : 'menciones'}
            </span>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="text-orange-400 hover:text-orange-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const trimmedQuery = query.trim()
  const exactMatch = results.some(
    (r) => r.name_normalized === trimmedQuery.toLowerCase()
  )
  const showCreateOption = trimmedQuery.length >= 2 && !exactMatch && !searching

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label className="flex items-center gap-1.5">
        <Store className="h-3.5 w-3.5 text-gray-500" />
        Negocio / Restaurante (opcional)
      </Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Buscar negocio o crear uno nuevo..."
          className="pl-8 pr-3"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />
        )}
      </div>

      {isOpen && (results.length > 0 || showCreateOption) && (
        <div className="absolute z-50 mt-1 w-full max-w-md bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          {results.map((biz) => (
            <button
              key={biz.id}
              type="button"
              onClick={() => selectBusiness(biz)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <Store className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{biz.name}</p>
                <div className="flex items-center gap-2">
                  {biz.category && (
                    <span className="text-[10px] text-gray-400">{biz.category}</span>
                  )}
                  {biz.location && (
                    <span className="text-[10px] text-gray-400">{biz.location}</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">
                {biz.mention_count} {biz.mention_count === 1 ? 'mención' : 'menciones'}
              </span>
            </button>
          ))}

          {showCreateOption && (
            <button
              type="button"
              onClick={createAndSelect}
              disabled={creating}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-orange-50 transition-colors bg-gray-50 border-t border-gray-100"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 text-orange-500 animate-spin shrink-0" />
              ) : (
                <Plus className="h-4 w-4 text-orange-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-600">
                  Crear &quot;{trimmedQuery}&quot;
                </p>
                <p className="text-[10px] text-gray-400">
                  Agregar como nuevo negocio
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        Etiqueta el negocio o restaurante relacionado. Si no existe, se crea automáticamente.
      </p>
    </div>
  )
}
