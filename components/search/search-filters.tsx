'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGeolocation, getNearestLocation } from '@/lib/hooks/use-geolocation'
import { MapPin } from 'lucide-react'

const CATEGORIES = [
  'Electrónica',
  'Muebles',
  'Vehículos',
  'Ropa',
  'Deportes',
  'Hogar',
  'Juguetes',
  'Libros',
  'Mascotas',
  'Otros',
]

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
  initialMinPrice?: string
  initialMaxPrice?: string
}

export function SearchFilters({
  initialQuery = '',
  initialCategory = '',
  initialLocation = '',
  initialMinPrice = '',
  initialMaxPrice = '',
}: SearchFiltersProps) {
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory)
  const [location, setLocation] = useState(initialLocation)
  const [minPrice, setMinPrice] = useState(initialMinPrice)
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice)
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)
  const router = useRouter()
  const geoLocation = useGeolocation()

  useEffect(() => {
    if (geoLocation.latitude && geoLocation.longitude) {
      const nearest = getNearestLocation(geoLocation.latitude, geoLocation.longitude)
      setDetectedLocation(nearest)
    }
  }, [geoLocation.latitude, geoLocation.longitude])

  const handleSearch = () => {
    const params = new URLSearchParams()
    
    if (query) params.set('q', query)
    if (category) params.set('category', category)
    if (location) params.set('location', location)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)

    router.push(`/search?${params.toString()}`)
  }

  const handleReset = () => {
    setQuery('')
    setCategory('')
    setLocation('')
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
      <h2 className="text-base font-semibold mb-4">Filtros</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-query" className="text-sm">Buscar</Label>
          <Input
            id="search-query"
            placeholder="Palabras clave..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm">Categoría</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las categorías</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="location" className="text-sm">Ubicación</Label>
            {detectedLocation && (
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <MapPin className="h-3 w-3" />
                Cerca de mí
              </button>
            )}
          </div>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas las ubicaciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las ubicaciones</SelectItem>
              {detectedLocation && (
                <SelectItem value={detectedLocation} className="font-semibold">
                  📍 {detectedLocation} (Cerca de mí)
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
          <Label className="text-sm">Precio (MXN)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Mínimo"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              type="number"
              placeholder="Máximo"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button onClick={handleSearch} className="w-full h-9 text-sm">
            Aplicar Filtros
          </Button>
          <Button onClick={handleReset} variant="outline" className="w-full h-9 text-sm">
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  )
}
