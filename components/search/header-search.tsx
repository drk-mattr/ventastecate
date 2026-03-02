'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search, SlidersHorizontal, X, MapPin } from 'lucide-react'
import { useGeolocation, getNearestLocation } from '@/lib/hooks/use-geolocation'
import { useTranslations } from '@/lib/hooks/use-translations'

const LOCATIONS = [
  'Centro',
  'Zona Centro',
  'La Rumorosa',
  'El Hongo',
  'Valle de las Palmas',
  'Colonia Libertad',
  'Colonia Residencial',
  'Otros',
]

export function HeaderSearch() {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [location, setLocation] = useState(searchParams.get('location') || 'all')
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)

  const geoLocation = useGeolocation()

  // Sync state with URL params when navigating
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(searchParams.get('q') || '')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategory(searchParams.get('category') || 'all')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocation(searchParams.get('location') || 'all')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinPrice(searchParams.get('minPrice') || '')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMaxPrice(searchParams.get('maxPrice') || '')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSort(searchParams.get('sort') || 'newest')
  }, [searchParams])

  useEffect(() => {
    if (geoLocation.latitude && geoLocation.longitude && !geoLocation.loading) {
      const nearest = getNearestLocation(geoLocation.latitude, geoLocation.longitude)
      if (nearest) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDetectedLocation(nearest)
      }
    }
  }, [geoLocation.latitude, geoLocation.longitude, geoLocation.loading])

  const sortOptions = [
    { value: 'newest', label: t.search.newest },
    { value: 'price_asc', label: t.search.priceLowHigh },
    { value: 'price_desc', label: t.search.priceHighLow },
  ]

  const activeFilterCount = [category !== 'all' ? category : '', location !== 'all' ? location : '', minPrice, maxPrice, sort !== 'newest' ? sort : ''].filter(Boolean).length

  const buildSearchUrl = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams()
    const values = {
      q: query,
      category: category !== 'all' ? category : '',
      location: location !== 'all' ? location : '',
      minPrice,
      maxPrice,
      sort,
      ...overrides,
    }

    Object.entries(values).forEach(([key, value]) => {
      if (value && value !== 'newest' && value !== 'all') params.set(key, value)
    })

    return `/search?${params.toString()}`
  }

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    router.push(buildSearchUrl())
  }

  const handleApplyFilters = () => {
    setFiltersOpen(false)
    router.push(buildSearchUrl())
  }

  const handleClearFilters = () => {
    setCategory('all')
    setLocation('all')
    setMinPrice('')
    setMaxPrice('')
    setSort('newest')
    setFiltersOpen(false)

    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    } else if (pathname === '/search') {
      router.push('/search')
    }
  }

  const removeFilter = (filter: string) => {
    const updates: Record<string, string> = {}
    if (filter === 'category') { setCategory('all'); updates.category = '' }
    if (filter === 'location') { setLocation('all'); updates.location = '' }
    if (filter === 'minPrice') { setMinPrice(''); updates.minPrice = '' }
    if (filter === 'maxPrice') { setMaxPrice(''); updates.maxPrice = '' }
    if (filter === 'sort') { setSort('newest'); updates.sort = '' }

    if (pathname === '/search') {
      router.push(buildSearchUrl(updates))
    }
  }

  return (
    <div className="flex-1 max-w-2xl mx-4">
      {/* Search + Filter Row */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            type="search"
            placeholder={t.search.placeholder}
            className="h-8 pl-8 pr-3 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5 text-xs shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.search.filters}</span>
              {activeFilterCount > 0 && (
                <Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t.search.filters}</h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {t.search.clearAll}
                  </button>
                )}
              </div>

              {/* Category */}
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

              {/* Location */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t.search.location}</Label>
                  {detectedLocation && (
                    <button
                      type="button"
                      onClick={() => setLocation(detectedLocation)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      {t.search.nearMe}
                    </button>
                  )}
                </div>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t.search.allLocations} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.search.allLocations}</SelectItem>
                    {detectedLocation && (
                      <SelectItem value={detectedLocation} className="font-semibold">
                        📍 {detectedLocation} ({t.search.nearMe})
                      </SelectItem>
                    )}
                    {LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t.search.price}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder={t.search.minPrice}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder={t.search.maxPrice}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t.search.sortBy}</Label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleApplyFilters} className="w-full h-8 text-xs">
                {t.search.applyFilters}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {category !== 'all' && category && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 pl-2 pr-1">
              {t.categories.find(c => c.value === category)?.label ?? category}
              <button onClick={() => removeFilter('category')}><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
          {location !== 'all' && location && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 pl-2 pr-1">
              📍 {location}
              <button onClick={() => removeFilter('location')}><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
          {(minPrice || maxPrice) && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 pl-2 pr-1">
              {minPrice && maxPrice ? `$${minPrice} - $${maxPrice}` : minPrice ? `Desde $${minPrice}` : `Hasta $${maxPrice}`}
              <button onClick={() => { removeFilter('minPrice'); removeFilter('maxPrice') }}><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
          {sort !== 'newest' && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 pl-2 pr-1">
              {sortOptions.find(o => o.value === sort)?.label}
              <button onClick={() => removeFilter('sort')}><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
