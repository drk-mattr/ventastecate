'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGeolocation, getNearestLocation } from '@/lib/hooks/use-geolocation'
import { useTranslations } from '@/lib/hooks/use-translations'
import { MapPin } from 'lucide-react'

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

interface SearchFiltersProps {
  initialQuery?: string
  initialCategory?: string
  initialLocation?: string
  initialCity?: string
  initialStateRegion?: string
  initialMinPrice?: string
  initialMaxPrice?: string
  initialCountry?: string
}

export function SearchFilters({
  initialQuery = '',
  initialCategory = '',
  initialLocation = '',
  initialCity = '',
  initialStateRegion = '',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialCountry,
}: SearchFiltersProps) {
  const t = useTranslations()
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory || 'all')
  const [location, setLocation] = useState(initialLocation || 'all')
  const [city, setCity] = useState(initialCity)
  const [stateRegion, setStateRegion] = useState(initialStateRegion)
  const [minPrice, setMinPrice] = useState(initialMinPrice)
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice)
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)
  const router = useRouter()
  const geoLocation = useGeolocation()

  useEffect(() => {
    if (geoLocation.latitude && geoLocation.longitude && !geoLocation.loading) {
      const nearest = getNearestLocation(geoLocation.latitude, geoLocation.longitude)
      if (nearest && nearest !== detectedLocation) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDetectedLocation(nearest)
      }
    }
  }, [geoLocation.latitude, geoLocation.longitude, geoLocation.loading, detectedLocation])

  const handleSearch = () => {
    const params = new URLSearchParams()

    if (query) params.set('q', query)
    if (category && category !== 'all') params.set('category', category)
    if (location && location !== 'all') params.set('location', location)
    if (city) params.set('city', city)
    if (stateRegion) params.set('stateRegion', stateRegion)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (initialCountry === 'all') params.set('country', 'all')

    router.push(`/search?${params.toString()}`)
  }

  const handleReset = () => {
    setQuery('')
    setCategory('all')
    setLocation('all')
    setCity('')
    setStateRegion('')
    setMinPrice('')
    setMaxPrice('')
    router.push('/search')
  }

  const handleUseMyLocation = () => {
    if (detectedLocation) {
      setLocation(detectedLocation)
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h2 className="text-base font-semibold mb-4">{t.search.filters}</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-query" className="text-sm">{t.hero.search}</Label>
          <Input
            id="search-query"
            placeholder={t.search.keywords}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm">{t.search.category}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 text-sm">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="location" className="text-sm">{t.search.location}</Label>
            {detectedLocation && (
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <MapPin className="h-3 w-3" />
                {t.search.nearMe}
              </button>
            )}
          </div>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="h-9 text-sm">
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
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-state" className="text-sm">{t.search.state}</Label>
          <Input
            id="filter-state"
            placeholder={t.search.stateRegionPlaceholder}
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-city" className="text-sm">{t.search.city}</Label>
          <Input
            id="filter-city"
            placeholder={t.search.cityPlaceholder}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{t.search.price}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder={t.search.minPrice}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              type="number"
              placeholder={t.search.maxPrice}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button onClick={handleSearch} className="w-full h-9 text-sm">
            {t.search.applyFilters}
          </Button>
          <Button onClick={handleReset} variant="outline" className="w-full h-9 text-sm">
            {t.search.clear}
          </Button>
        </div>
      </div>
    </div>
  )
}
