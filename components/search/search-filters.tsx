'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  const router = useRouter()

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-query">Buscar</Label>
          <Input
            id="search-query"
            placeholder="Palabras clave..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Ubicación</Label>
          <Input
            id="location"
            placeholder="Ej: Centro"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Rango de Precio</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={handleSearch} className="w-full">
            Aplicar Filtros
          </Button>
          <Button onClick={handleReset} variant="outline" className="w-full">
            Limpiar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
