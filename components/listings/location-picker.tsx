'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2 } from 'lucide-react'
import { getStructuredLocation } from '@/lib/hooks/use-geolocation'

interface LocationPickerProps {
  city: string
  stateRegion: string
  onCityChange: (v: string) => void
  onStateRegionChange: (v: string) => void
  onCountryCodeChange?: (code: string) => void
}

export function LocationPicker({
  city,
  stateRegion,
  onCityChange,
  onStateRegionChange,
  onCountryCodeChange,
}: LocationPickerProps) {
  const [detecting, setDetecting] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [detected, setDetected] = useState(false)

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización')
      return
    }
    setDetecting(true)
    setGeoError('')
    setDetected(false)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const result = await getStructuredLocation(
          position.coords.latitude,
          position.coords.longitude
        )
        if (result.city) onCityChange(result.city)
        if (result.state) onStateRegionChange(result.state)
        if (result.countryCode && onCountryCodeChange) onCountryCodeChange(result.countryCode)
        if (!result.city && !result.state) {
          setGeoError('No se pudo detectar tu ubicación')
        } else {
          setDetected(true)
        }
        setDetecting(false)
      },
      () => {
        setGeoError('Activa el permiso de ubicación en tu navegador')
        setDetecting(false)
      },
      { timeout: 8000 }
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Ciudad y Estado</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGetLocation}
          disabled={detecting}
          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          {detecting ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Detectando...
            </>
          ) : detected ? (
            <>
              <MapPin className="h-3 w-3 mr-1" />
              Ubicación detectada ✓
            </>
          ) : (
            <>
              <MapPin className="h-3 w-3 mr-1" />
              Obtener mi ubicación
            </>
          )}
        </Button>
      </div>

      {geoError && (
        <p className="text-xs text-red-500">{geoError}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="listing-city" className="text-xs text-gray-500">
            Ciudad
          </Label>
          <Input
            id="listing-city"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="Ej: Tecate"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="listing-state" className="text-xs text-gray-500">
            Estado / Provincia / Región
          </Label>
          <Input
            id="listing-state"
            value={stateRegion}
            onChange={(e) => onStateRegionChange(e.target.value)}
            placeholder="Ej: Baja California"
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
