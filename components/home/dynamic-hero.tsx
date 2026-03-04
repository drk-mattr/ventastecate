'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGeolocation, getNearestLocation, reverseGeocode } from '@/lib/hooks/use-geolocation'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Search, X, MapPin, SlidersHorizontal } from 'lucide-react'


export function DynamicHero() {
  const t = useTranslations()
  const [locationText, setLocationText] = useState('Tecate')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [location, setLocation] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [activeType, setActiveType] = useState('all')
  const router = useRouter()
  const geoLocation = useGeolocation()

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

  const handleTypeFilter = (type: string) => {
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
    <div className="bg-gray-50 border-b">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-center mb-5">
          {t.hero.tagline} {locationText}
        </h1>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          {/* Search bar + location + filters button */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t.hero.searchPlaceholder}
                className="h-10 pl-10 text-sm bg-white"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Inline location text input */}
            <div className="relative shrink-0 w-36">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Ubicación"
                className="h-10 pl-7 text-xs bg-white"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Filters popover */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-10 px-3 gap-1.5 bg-white shrink-0">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="text-sm">{t.search.filters}</span>
                  {activeFilters.length > 0 && (
                    <Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t.search.filters}</h3>
                    {activeFilters.length > 0 && (
                      <button onClick={clearAll} className="text-xs text-blue-600 hover:text-blue-700">
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

            <Button type="submit" className="h-10 px-6">{t.hero.search}</Button>
          </div>
        </form>

        {/* Type quick-filter pills */}
        <div className="max-w-2xl mx-auto flex flex-wrap gap-1.5 mt-3">
          {[
            { value: 'all',     label: 'General' },
            { value: 'product', label: 'Productos' },
            { value: 'service', label: 'Servicios' },
            { value: 'event',   label: 'Eventos' },
            { value: 'news',    label: 'Noticias' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeFilter(value)}
              className={`h-7 px-3 rounded-md text-xs font-medium border transition-colors
                ${activeType === value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
                }`}
            >
              {label}
            </button>
          ))}
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
