'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGeolocation, getNearestLocation, reverseGeocode } from '@/lib/hooks/use-geolocation'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X, MapPin } from 'lucide-react'

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

export function DynamicHero() {
  const t = useTranslations()
  const [locationText, setLocationText] = useState('Tecate')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [location, setLocation] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)
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
      return
    }

    // Fallback: reverse geocode for accurate city name
    reverseGeocode(lat, lon).then((city) => {
      if (city) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocationText(city)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDetectedLocation(city)
      }
    })
  }, [geoLocation.latitude, geoLocation.longitude, geoLocation.loading])

  const activeFilters = [
    ...(category !== 'all' ? [{ key: 'category', label: t.categories.find(c => c.value === category)?.label ?? category }] : []),
    ...(location !== 'all' ? [{ key: 'location', label: `📍 ${location}` }] : []),
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
    if (location !== 'all') params.set('location', location)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    router.push(`/search?${params.toString()}`)
  }

  const removeFilter = (key: string) => {
    if (key === 'category') setCategory('all')
    if (key === 'location') setLocation('all')
    if (key === 'price') { setMinPrice(''); setMaxPrice('') }
  }

  const clearAll = () => {
    setQuery('')
    setCategory('all')
    setLocation('all')
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
          {/* Row 1: Search bar */}
          <div className="flex gap-2 mb-3">
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
            <Button type="submit" className="h-10 px-6">{t.hero.search}</Button>
          </div>

          {/* Row 2: Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder={t.search.category} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.search.allCategories}</SelectItem>
                {t.categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder={t.search.location} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.search.allLocations}</SelectItem>
                {detectedLocation && (
                  <SelectItem value={detectedLocation} className="font-semibold">
                    📍 {detectedLocation}
                  </SelectItem>
                )}
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder={`$ ${t.search.minPrice}`}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-9 text-xs bg-white"
            />
            <Input
              type="number"
              placeholder={`$ ${t.search.maxPrice}`}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 text-xs bg-white"
            />
          </div>
        </form>

        {/* Active filters + geolocation */}
        <div className="max-w-2xl mx-auto">
          {detectedLocation && location === 'all' && (
            <button
              type="button"
              onClick={() => setLocation(detectedLocation)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
            >
              <MapPin className="h-3 w-3" />
              {t.search.useMyLocation}: {detectedLocation}
            </button>
          )}

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {activeFilters.map((f) => (
                <Badge key={f.key} variant="secondary" className="text-[11px] h-6 gap-1 pl-2.5 pr-1">
                  {f.label}
                  <button onClick={() => removeFilter(f.key)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-700 ml-1">
                {t.search.clear}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
