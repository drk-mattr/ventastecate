'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGeolocation, getNearestLocation, reverseGeocode } from '@/lib/hooks/use-geolocation'
import { useTranslations } from '@/lib/hooks/use-translations'
import { LOCK_TO_TECATE } from '@/lib/mvp-config'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Search, X, MapPin, SlidersHorizontal } from 'lucide-react'


export function DynamicHero() {
  const t = useTranslations()
  const [locationText, setLocationText] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [location, setLocation] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [_detectedLocation, setDetectedLocation] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [activeType, setActiveType] = useState('all')
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const geoLocation = useGeolocation()

  // On phones we hide the big headline and surface the tagline as the search
  // placeholder instead, so the hero stays compact.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!geoLocation.latitude || !geoLocation.longitude || geoLocation.loading) return

    const lat = geoLocation.latitude
    const lon = geoLocation.longitude

    // First try known Tecate locations (fast, no network)
    const nearest = getNearestLocation(lat, lon)
    if (nearest) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocationText(nearest)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetectedLocation(nearest)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(nearest)
      return
    }

    // MVP: while locked to Tecate, do NOT override the headline/search with a
    // far-away city (e.g. a border visitor in San Diego). Keep "Tecate" so the
    // homepage stays local. Known Tecate-area locations above still apply.
    if (LOCK_TO_TECATE) return

    // Fallback: reverse geocode for accurate city name
    reverseGeocode(lat, lon).then((city) => {
      if (city) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocationText(city)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDetectedLocation(city)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocation(city)
      }
    })
  }, [geoLocation.latitude, geoLocation.longitude, geoLocation.loading])

  const activeFilters = [
    ...(category !== 'all' ? [{ key: 'category', label: t.categories.find(c => c.value === category)?.label ?? category }] : []),
    ...(location ? [{ key: 'location', label: location }] : []),
    ...(minPrice || maxPrice ? [{
      key: 'price',
      label: minPrice && maxPrice ? `$${minPrice} – $${maxPrice}` : minPrice ? `Desde $${minPrice}` : `Hasta $${maxPrice}`,
    }] : []),
  ]

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category !== 'all') params.set('category', category)
    if (location) params.set('location', location)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (activeType !== 'all') params.set('type', activeType)
    router.push(`/search?${params.toString()}`)
  }

  // Pills that filter by category (not by listing type). Key → DB category value.
  const CATEGORY_SHORTCUTS: Record<string, string> = {
    comida: 'Comida',
    renta: 'Casas en Renta',
    venta: 'Casas en Venta',
    terrenos: 'Terrenos',
  }

  const handleTypeFilter = (type: string) => {
    // Category shortcuts navigate straight to a filtered search.
    if (CATEGORY_SHORTCUTS[type]) {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (location) params.set('location', location)
      params.set('category', CATEGORY_SHORTCUTS[type])
      router.push(`/search?${params.toString()}`)
      return
    }
    const next = activeType === type ? 'all' : type
    setActiveType(next)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category !== 'all') params.set('category', category)
    if (location) params.set('location', location)
    if (next !== 'all') params.set('type', next)
    router.push(`/search?${params.toString()}`)
  }

  const removeFilter = (key: string) => {
    if (key === 'category') setCategory('all')
    if (key === 'location') setLocation('')
    if (key === 'price') { setMinPrice(''); setMaxPrice('') }
  }

  const clearAll = () => {
    setQuery('')
    setCategory('all')
    setLocation('')
    setMinPrice('')
    setMaxPrice('')
  }

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <h1 className="hidden md:block text-2xl font-semibold text-center mb-5">
          {!LOCK_TO_TECATE && locationText ? `${t.hero.tagline} ${locationText}` : t.hero.taglineBase}
        </h1>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          {/* Unified search pill */}
          <div className="flex items-center bg-white border rounded-lg h-10 overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-gray-900">
            <Search className="ml-3 h-4 w-4 text-gray-400 shrink-0 pointer-events-none" />
            <input
              type="search"
              placeholder={isMobile ? t.hero.taglineBase : t.hero.searchPlaceholder}
              className="flex-1 h-full pl-2.5 pr-2 text-sm outline-none bg-transparent"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="hidden sm:flex items-center shrink-0">
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <MapPin className="h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Ubicación"
                className="w-28 h-full pl-1.5 pr-0 text-xs outline-none bg-transparent"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Filters inside pill */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`h-full px-3 flex items-center gap-1 shrink-0 transition-colors ${
                    activeFilters.length > 0 ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div className="w-px h-5 bg-gray-200 mr-1" />
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {activeFilters.length > 0 && (
                    <span className="text-[10px] font-semibold">{activeFilters.length}</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t.search.filters}</h3>
                    {activeFilters.length > 0 && (
                      <button onClick={clearAll} className="text-xs text-gray-900 hover:text-gray-600">
                        {t.search.clear}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.search.category}</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t.search.allCategories} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.search.allCategories}</SelectItem>
                        {t.categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.search.price}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder={t.search.minPrice} value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)} className="h-8 text-xs" />
                      <Input type="number" placeholder={t.search.maxPrice} value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>

                  <Button type="submit" onClick={() => { setFiltersOpen(false); handleSearch() }}
                    className="w-full h-8 text-xs">
                    {t.search.applyFilters}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <button
              type="submit"
              className="h-full px-4 border-l border-gray-200 text-gray-900 text-xs font-semibold shrink-0 hover:text-gray-600 transition-colors"
            >
              {t.hero.search}
            </button>
          </div>
        </form>

        {/* Type quick-filter text links */}
        <div className="max-w-2xl mx-auto flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
          {[
            { value: 'all',     label: 'Todo' },
            { value: 'product', label: 'Productos' },
            { value: 'service', label: 'Servicios' },
            { value: 'event',   label: 'Eventos' },
            { value: 'news',    label: 'Noticias' },
            { value: 'comida',  label: 'Comida' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeFilter(value)}
              className={`text-xs py-1.5 px-1 transition-colors
                ${activeType === value
                  ? 'text-gray-900 font-semibold underline underline-offset-2'
                  : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              {label}
            </button>
          ))}

          {/* Casas — flat, non-nested links (no dropdown) */}
          <span className="inline-flex items-center gap-1.5 text-xs py-1.5">
            <span className="text-gray-400">Casas:</span>
            <button
              type="button"
              onClick={() => handleTypeFilter('renta')}
              className={`transition-colors ${activeType === 'renta' ? 'text-gray-900 font-semibold underline underline-offset-2' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Renta
            </button>
            <span className="text-gray-300">/</span>
            <button
              type="button"
              onClick={() => handleTypeFilter('venta')}
              className={`transition-colors ${activeType === 'venta' ? 'text-gray-900 font-semibold underline underline-offset-2' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Venta
            </button>
          </span>

          {/* Terrenos */}
          <button
            type="button"
            onClick={() => handleTypeFilter('terrenos')}
            className="text-xs py-1.5 px-1 text-gray-500 hover:text-gray-800 transition-colors"
          >
            Terrenos
          </button>
        </div>

        {/* Active filter chips — location + category always visible when set */}
        {activeFilters.length > 0 && (
          <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-1.5 mt-2">
            {activeFilters.map((f) => (
              <Badge key={f.key} variant="secondary" className="text-[11px] h-6 gap-1 pl-2.5 pr-1">
                {f.key === 'location' && <MapPin className="h-2.5 w-2.5" />}
                {f.label}
                <button onClick={() => removeFilter(f.key)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
