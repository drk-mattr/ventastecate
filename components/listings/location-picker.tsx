'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2 } from 'lucide-react'
import { getStructuredLocation } from '@/lib/hooks/use-geolocation'
import { useTranslations } from '@/lib/hooks/use-translations'

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
  const t = useTranslations()
  const f = t.forms
  const [detecting, setDetecting] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [detected, setDetected] = useState(false)

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError(f.geoNotSupported)
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
          setGeoError(f.locationDetectFail)
        } else {
          setDetected(true)
        }
        setDetecting(false)
      },
      () => {
        setGeoError(f.locationPermissionDenied)
        setDetecting(false)
      },
      { timeout: 8000 }
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{f.cityAndState}</Label>
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
              {f.detecting}
            </>
          ) : detected ? (
            <>
              <MapPin className="h-3 w-3 mr-1" />
              {f.locationDetected}
            </>
          ) : (
            <>
              <MapPin className="h-3 w-3 mr-1" />
              {f.getMyLocation}
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
            {f.cityLabel}
          </Label>
          <Input
            id="listing-city"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder={f.cityFormPlaceholder}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="listing-state" className="text-xs text-gray-500">
            {f.stateLabel}
          </Label>
          <Input
            id="listing-state"
            value={stateRegion}
            onChange={(e) => onStateRegionChange(e.target.value)}
            placeholder={f.statePlaceholder}
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
