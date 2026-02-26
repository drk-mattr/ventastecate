'use client'

import { useState, useEffect } from 'react'
import { SearchBar } from '@/components/search/search-bar'
import { useGeolocation, getNearestLocation } from '@/lib/hooks/use-geolocation'

export function DynamicHero() {
  const [locationText, setLocationText] = useState('Tecate')
  const geoLocation = useGeolocation()

  useEffect(() => {
    if (geoLocation.latitude && geoLocation.longitude) {
      const nearest = getNearestLocation(geoLocation.latitude, geoLocation.longitude)
      if (nearest) {
        setLocationText(nearest)
      }
    }
  }, [geoLocation.latitude, geoLocation.longitude])

  return (
    <div className="bg-gray-50 border-b">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Compra y Vende en {locationText}
        </h1>
        <SearchBar />
      </div>
    </div>
  )
}
