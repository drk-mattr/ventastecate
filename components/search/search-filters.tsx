'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getStructuredLocation } from '@/lib/hooks/use-geolocation'
import { useTranslations } from '@/lib/hooks/use-translations'
import { MapPin, Loader2 } from 'lucide-react'

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

  // Seed the location field from whatever URL param is present
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory || 'all')
  const [location, setLocation] = useState(
    initialLocation || initialCity || initialStateRegion || ''
  )
  const [minPrice, setMinPrice] = useState(initialMinPrice)
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const router = useRouter()

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

  const handleSearch = () => {
    const params = new URLSearchParams()

    if (query) params.set('q', query)
    if (category && category !== 'all') params.set('category', category)
    if (location) params.set('location', location)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (initialCountry === 'all') params.set('country', 'all')

    router.push(`/search?${params.toString()}`)
  }

  const handleReset = () => {
    setQuery('')
    setCategory('all')
    setLocation('')
    setMinPrice('')
    setMaxPrice('')
    setGeoError(null)
    router.push('/search')
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h2 className="text-base font-semibold mb-4">{t.search.filters}</h2>
      <div className="space-y-4">

        {/* Keyword */}
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

        {/* Category */}
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

        {/* Location — free text + GPS detect button */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm">{t.search.location}</Label>
          <div className="relative">
            <Input
              id="location"
              placeholder={t.search.locationPlaceholder}
              value={location}
              onChange={(e) => { setLocation(e.target.value); setGeoError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-9 text-sm pr-9"
            />
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={geoLoading}
              title={t.search.useMyLocation}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 disabled:opacity-50 transition"
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
        </div>

        {/* Price */}
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

        {/* Actions */}
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
