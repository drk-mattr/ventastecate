'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, X, Check, LocateFixed } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/lib/hooks/use-translations'
import { getStructuredLocation } from '@/lib/hooks/use-geolocation'

interface Props {
  query?: string
  category?: string
  location?: string
  minPrice?: string
  maxPrice?: string
  currency?: string
  sort?: string
  country?: string
  bedrooms?: string
  bathrooms?: string
  m2?: string
}

const REAL_ESTATE_CATEGORIES = ['Casas en Renta', 'Casas en Venta']

/**
 * Inline filter bar: category/sort are lightweight (borderless) dropdowns, while
 * price and location are shown as live inline fields. Scrolls horizontally on
 * small screens. Inline fields apply on Enter; dropdowns apply on select.
 */
export function SearchFilterBar({ query, category, location, minPrice, maxPrice, currency, sort, country, bedrooms, bathrooms, m2 }: Props) {
  const router = useRouter()
  const t = useTranslations()

  const [loc, setLoc] = useState(location || '')
  const [min, setMin] = useState(minPrice || '')
  const [max, setMax] = useState(maxPrice || '')
  const [m2Val, setM2Val] = useState(m2 || '')
  const [geoLoading, setGeoLoading] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [bedOpen, setBedOpen] = useState(false)
  const [bathOpen, setBathOpen] = useState(false)

  const isRealEstate = !!category && REAL_ESTATE_CATEGORIES.includes(category)

  const go = (overrides: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      q: query,
      category,
      location,
      minPrice,
      maxPrice,
      currency,
      sort,
      bedrooms,
      bathrooms,
      m2,
      ...(country === 'all' ? { country: 'all' } : {}),
      ...overrides,
    }
    const params = new URLSearchParams()
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    router.push(`/search?${params.toString()}`)
  }

  // Auto-apply on blur / Enter — only navigate when the value actually changed.
  const applyPrice = () => {
    if ((min || '') === (minPrice || '') && (max || '') === (maxPrice || '')) return
    go({ minPrice: min || undefined, maxPrice: max || undefined })
  }
  const applyLoc = () => {
    if ((loc || '') === (location || '')) return
    go({ location: loc || undefined })
  }
  const applyM2 = () => {
    if ((m2Val || '') === (m2 || '')) return
    go({ m2: m2Val || undefined })
  }

  const detectLocation = () => {
    if (!navigator?.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await getStructuredLocation(pos.coords.latitude, pos.coords.longitude)
        const city = result.city || result.state || ''
        setLoc(city)
        setGeoLoading(false)
        go({ location: city || undefined })
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const catActive = !!(category && category !== 'all')
  const categoryLabel = catActive
    ? t.categories.find((c) => c.value === category)?.label ?? category
    : t.search.category
  const sortLabel =
    sort === 'price_asc' ? t.search.priceLowHigh : sort === 'price_desc' ? t.search.priceHighLow : t.search.newest
  const hasFilters = catActive || !!location || !!minPrice || !!maxPrice || !!currency || !!sort || !!bedrooms || !!bathrooms || !!m2

  const trigger = (active: boolean) =>
    `inline-flex items-center gap-1 h-9 text-sm whitespace-nowrap shrink-0 transition-colors ${
      active ? 'text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900'
    }`
  const optionRow = 'flex w-full items-center justify-between px-2.5 py-2 text-sm rounded-md hover:bg-gray-50'
  const divider = <span className="h-5 w-px bg-gray-200 shrink-0" />

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-1">
      {/* Categoría */}
      <Popover open={catOpen} onOpenChange={setCatOpen}>
        <PopoverTrigger className={trigger(catActive)}>
          {categoryLabel}
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1 max-h-72 overflow-y-auto">
          <button type="button" className={optionRow} onClick={() => { setCatOpen(false); go({ category: undefined, bedrooms: undefined, bathrooms: undefined, m2: undefined }) }}>
            {t.search.allCategories}
            {!catActive && <Check className="h-4 w-4" />}
          </button>
          {t.categories.map((cat) => (
            <button key={cat.value} type="button" className={optionRow} onClick={() => { setCatOpen(false); go({ category: cat.value, ...(REAL_ESTATE_CATEGORIES.includes(cat.value) ? {} : { bedrooms: undefined, bathrooms: undefined, m2: undefined }) }) }}>
              {cat.label}
              {category === cat.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {divider}

      {/* Precio — labeled inline fields, auto-apply when focus leaves the group */}
      <div
        className="flex items-center gap-2 shrink-0"
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) applyPrice() }}
      >
        <span className="text-xs font-medium text-gray-500">{t.search.price}</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
          <Input type="number" placeholder="mín" value={min} onChange={(e) => setMin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyPrice()} className="h-9 w-20 sm:w-24 pl-6 text-sm" />
        </div>
        <span className="text-gray-300">–</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
          <Input type="number" placeholder="máx" value={max} onChange={(e) => setMax(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyPrice()} className="h-9 w-20 sm:w-24 pl-6 text-sm" />
        </div>
      </div>

      {divider}

      {/* Moneda — no conversion: MXN / USD / Todas only narrows rows,
          so the price sort stays honest within the filtered set. */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0" role="group" aria-label="Moneda">
        {[
          { value: undefined, label: 'Todas' },
          { value: 'MXN', label: 'MXN' },
          { value: 'USD', label: 'USD' },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => go({ currency: opt.value })}
            aria-pressed={(currency || '') === (opt.value || '')}
            className={`px-2 py-1 rounded-md text-xs font-medium ${((currency || '') === (opt.value || '')) ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {divider}

      {/* Ubicación — labeled inline field + single GPS button */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-medium text-gray-500">{t.search.location}</span>
        <div className="relative">
          <Input
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            onBlur={applyLoc}
            onKeyDown={(e) => e.key === 'Enter' && applyLoc()}
            placeholder={t.search.locationPlaceholder}
            className="h-9 w-36 sm:w-48 pr-9 text-sm"
          />
          <button
            type="button"
            onClick={detectLocation}
            disabled={geoLoading}
            title={t.search.useMyLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Category-specific facets — real estate */}
      {isRealEstate && (
        <>
          {divider}
          <Popover open={bedOpen} onOpenChange={setBedOpen}>
            <PopoverTrigger className={trigger(!!bedrooms)}>
              {bedrooms ? `${bedrooms}+ rec.` : 'Recámaras'}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40 p-1">
              {['', '1', '2', '3', '4'].map((v) => (
                <button key={v || 'any'} type="button" className={optionRow} onClick={() => { setBedOpen(false); go({ bedrooms: v || undefined }) }}>
                  {v ? `${v}+` : 'Cualquiera'}
                  {(bedrooms || '') === v && <Check className="h-4 w-4" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover open={bathOpen} onOpenChange={setBathOpen}>
            <PopoverTrigger className={trigger(!!bathrooms)}>
              {bathrooms ? `${bathrooms}+ baños` : 'Baños'}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40 p-1">
              {['', '1', '2', '3'].map((v) => (
                <button key={v || 'any'} type="button" className={optionRow} onClick={() => { setBathOpen(false); go({ bathrooms: v || undefined }) }}>
                  {v ? `${v}+` : 'Cualquiera'}
                  {(bathrooms || '') === v && <Check className="h-4 w-4" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-gray-500">Tamaño</span>
            <div className="relative">
              <Input
                type="number"
                placeholder="mín"
                value={m2Val}
                onChange={(e) => setM2Val(e.target.value)}
                onBlur={applyM2}
                onKeyDown={(e) => e.key === 'Enter' && applyM2()}
                className="h-9 w-20 pr-8 text-sm"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">m²</span>
            </div>
          </div>
        </>
      )}

      {divider}

      {/* Ordenar */}
      <Popover open={sortOpen} onOpenChange={setSortOpen}>
        <PopoverTrigger className={trigger(!!sort)}>
          {sortLabel}
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-1">
          {[
            { value: '', label: t.search.newest },
            { value: 'price_asc', label: t.search.priceLowHigh },
            { value: 'price_desc', label: t.search.priceHighLow },
          ].map((opt) => (
            <button key={opt.value || 'new'} type="button" className={optionRow} onClick={() => { setSortOpen(false); go({ sort: opt.value || undefined }) }}>
              {opt.label}
              {(sort || '') === opt.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {hasFilters && (
        <button
          type="button"
          onClick={() => go({ category: undefined, location: undefined, minPrice: undefined, maxPrice: undefined, currency: undefined, sort: undefined, bedrooms: undefined, bathrooms: undefined, m2: undefined })}
          className="inline-flex items-center gap-1 h-9 px-1 text-sm text-gray-400 hover:text-gray-700 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
          {t.search.clearAll}
        </button>
      )}
    </div>
  )
}
