'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getStructuredLocation } from '@/lib/hooks/use-geolocation'
import { useTranslations } from '@/lib/hooks/use-translations'
import { MapPin, Loader2, X } from 'lucide-react'

// THE single filter panel (2026-11-06 search rebuild): every search
// control lives here and nowhere else — query, type, category, price,
// currency, location, sort, real-estate facets. Rendered two ways:
// inline in the desktop sidebar on /search, and inside the MobileFilters
// dialog (bottom sheet) on phones. It navigates by URL params, merging
// with whatever params the page already has, so applying filters never
// drops the query, the country scope, or anything else.
interface SearchFiltersProps {
  initialQuery?: string
  initialType?: string
  initialCategory?: string
  initialLocation?: string
  initialCity?: string
  initialStateRegion?: string
  initialMinPrice?: string
  initialMaxPrice?: string
  initialCurrency?: string
  initialSort?: string
  initialBedrooms?: string
  initialBathrooms?: string
  initialM2?: string
  // Label of the site-wide region from the vt_region cookie (e.g.
  // "Tecate"). An explicit location in this panel overrides it — the
  // note under the field says so, instead of silently switching scope.
  regionLabel?: string
  // Params the panel does not own (country, city, stateRegion) — carried
  // through untouched when filters are applied.
  preserveParams?: Record<string, string | undefined>
  onApply?: () => void
}

const REAL_ESTATE_CATEGORIES = ['Casas en Renta', 'Casas en Venta']

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'product', label: 'Productos' },
  { value: 'service', label: 'Servicios' },
  { value: 'event', label: 'Eventos' },
  { value: 'news', label: 'Noticias' },
]

const CURRENCY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'MXN', label: 'MXN' },
  { value: 'USD', label: 'USD' },
]

export function SearchFilters({
  initialQuery = '',
  initialType = '',
  initialCategory = '',
  initialLocation = '',
  initialCity = '',
  initialStateRegion = '',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialCurrency = '',
  initialSort = '',
  initialBedrooms = '',
  initialBathrooms = '',
  initialM2 = '',
  regionLabel = 'Tecate',
  preserveParams = {},
  onApply,
}: SearchFiltersProps) {
  const t = useTranslations()

  // Seed the location field from whatever URL param is present
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState(initialType || 'all')
  const [category, setCategory] = useState(initialCategory || 'all')
  const [location, setLocation] = useState(
    initialLocation || initialCity || initialStateRegion || ''
  )
  const [minPrice, setMinPrice] = useState(initialMinPrice)
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice)
  const [currency, setCurrency] = useState(initialCurrency || '')
  const [sort, setSort] = useState(initialSort || 'newest')
  const [bedrooms, setBedrooms] = useState(initialBedrooms)
  const [bathrooms, setBathrooms] = useState(initialBathrooms)
  const [m2, setM2] = useState(initialM2)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const router = useRouter()

  const isRealEstate = !!category && REAL_ESTATE_CATEGORIES.includes(category)
  const locationOverridesRegion = !!location && regionLabel !== 'Todas'

  const handleDetectLocation = () => {
    if (!navigator?.geolocation) {
      setGeoError(t.forms.geoNotSupported)
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await getStructuredLocation(pos.coords.latitude, pos.coords.longitude)
        setLocation(result.city || result.state || '')
        setGeoLoading(false)
      },
      () => {
        setGeoError(t.forms.locationPermissionDenied)
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Build the new URL from the params the page already has, then set or
  // clear exactly the fields this panel owns. Nothing else is dropped.
  const buildParams = () => {
    const params = new URLSearchParams()
    Object.entries(preserveParams).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    const set = (key: string, value: string | undefined) => {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    set('q', query.trim() || undefined)
    set('type', type !== 'all' ? type : undefined)
    set('category', category !== 'all' ? category : undefined)
    set('location', location.trim() || undefined)
    set('minPrice', minPrice || undefined)
    set('maxPrice', maxPrice || undefined)
    set('currency', currency || undefined)
    set('sort', sort !== 'newest' ? sort : undefined)
    set('bedrooms', isRealEstate ? bedrooms || undefined : undefined)
    set('bathrooms', isRealEstate ? bathrooms || undefined : undefined)
    set('m2', isRealEstate ? m2 || undefined : undefined)
    return params
  }

  const handleSearch = () => {
    const params = buildParams()
    const qs = params.toString()
    router.push(qs ? `/search?${qs}` : '/search')
    onApply?.()
  }

  const handleReset = () => {
    setQuery('')
    setType('all')
    setCategory('all')
    setLocation('')
    setMinPrice('')
    setMaxPrice('')
    setCurrency('')
    setSort('newest')
    setBedrooms('')
    setBathrooms('')
    setM2('')
    setGeoError(null)
    router.push('/search')
    onApply?.()
  }

  const hasActiveFilters =
    (type && type !== 'all') ||
    (category && category !== 'all') ||
    !!location ||
    !!minPrice ||
    !!maxPrice ||
    !!currency ||
    (sort && sort !== 'newest') ||
    !!bedrooms ||
    !!bathrooms ||
    !!m2 ||
    !!query

  const segmented = (active: boolean) =>
    `px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
      active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
    }`

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 lg:sticky lg:top-20">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-900">{t.search.filters}</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            {t.search.clear}
          </button>
        )}
      </div>

      <div className="space-y-5">
        {/* Keyword — editable on the results page (the old inline bar
            had no query field at all). */}
        <div className="space-y-1.5">
          <Label htmlFor="search-query" className="text-xs font-medium text-gray-500">{t.hero.search}</Label>
          <Input
            id="search-query"
            placeholder={t.search.keywords}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-10 text-sm"
          />
        </div>

        {/* Type — was homepage-only; now changeable from /search. */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">Tipo</Label>
          <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                aria-pressed={type === opt.value}
                className={segmented(type === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs font-medium text-gray-500">{t.search.category}</Label>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v)
              if (!REAL_ESTATE_CATEGORIES.includes(v)) {
                setBedrooms('')
                setBathrooms('')
                setM2('')
              }
            }}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder={t.search.allCategories} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.search.allCategories}</SelectItem>
              {t.categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Real-estate facets — only for Casas en Renta / Venta */}
        {isRealEstate && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Recámaras</Label>
                <Select value={bedrooms || 'any'} onValueChange={(v) => setBedrooms(v === 'any' ? '' : v)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['any', '1', '2', '3', '4'].map((v) => (
                      <SelectItem key={v} value={v}>{v === 'any' ? 'Cualquiera' : `${v}+`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Baños</Label>
                <Select value={bathrooms || 'any'} onValueChange={(v) => setBathrooms(v === 'any' ? '' : v)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['any', '1', '2', '3'].map((v) => (
                      <SelectItem key={v} value={v}>{v === 'any' ? 'Cualquiera' : `${v}+`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m2" className="text-xs font-medium text-gray-500">Tamaño mín. (m²)</Label>
              <Input
                id="m2"
                type="number"
                placeholder="m²"
                value={m2}
                onChange={(e) => setM2(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-10 text-sm"
              />
            </div>
          </>
        )}

        {/* Location — free text + GPS detect button. An explicit
            location overrides the site-wide region; say so, and offer
            a one-tap clear back to the region scope. */}
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-xs font-medium text-gray-500">{t.search.location}</Label>
          <div className="relative">
            <Input
              id="location"
              placeholder={t.search.locationPlaceholder}
              value={location}
              onChange={(e) => { setLocation(e.target.value); setGeoError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-10 text-sm pr-9"
            />
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={geoLoading}
              title={t.search.useMyLocation}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 disabled:opacity-50 transition"
            >
              {geoLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MapPin className="h-4 w-4" />
              }
            </button>
          </div>
          {geoError && (
            <p className="text-xs text-red-500">{geoError}</p>
          )}
          {locationOverridesRegion && (
            <p className="flex items-center gap-1 text-xs text-gray-500">
              Ubicación: {location} — anula {regionLabel}
              <button
                type="button"
                onClick={() => setLocation('')}
                aria-label="Quitar ubicación"
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </p>
          )}
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">{t.search.price}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder={t.search.minPrice}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-10 text-sm"
            />
            <Input
              type="number"
              placeholder={t.search.maxPrice}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>

        {/* Currency — no conversion: only narrows rows, so the price
            sort stays honest within the filtered set. */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">Moneda</Label>
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label="Moneda">
            {CURRENCY_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setCurrency(opt.value)}
                aria-pressed={currency === opt.value}
                className={segmented(currency === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort — including 'top' (ranking_score), which the header
            popover never offered. */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">{t.search.sortBy}</Label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t.search.newest}</SelectItem>
              <SelectItem value="price_asc">{t.search.priceLowHigh}</SelectItem>
              <SelectItem value="price_desc">{t.search.priceHighLow}</SelectItem>
              <SelectItem value="top">Más relevantes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleSearch}
        variant="outline"
        className="w-full h-10 mt-6 rounded-lg text-sm font-medium"
      >
        {t.search.applyFilters}
      </Button>
    </div>
  )
}
