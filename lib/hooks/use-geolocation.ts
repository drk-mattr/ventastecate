'use client'

import { useState, useEffect } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    let isMounted = true

    if (!navigator.geolocation) {
      if (isMounted) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocation({
          latitude: null,
          longitude: null,
          error: 'Geolocation is not supported by your browser',
          loading: false,
        })
      }
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (isMounted) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
          })
        }
      },
      (error) => {
        if (isMounted) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setLocation({
            latitude: null,
            longitude: null,
            error: error.message,
            loading: false,
          })
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )

    return () => {
      isMounted = false
    }
  }, [])

  return location
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Approximate coordinates for Tecate locations
export const LOCATION_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'Centro': { lat: 32.5752, lon: -116.6252 },
  'Zona Centro': { lat: 32.5752, lon: -116.6252 },
  'La Rumorosa': { lat: 32.5500, lon: -116.0833 },
  'El Hongo': { lat: 32.4167, lon: -116.3833 },
  'Valle de las Palmas': { lat: 32.4500, lon: -116.7167 },
  'Colonia Libertad': { lat: 32.5700, lon: -116.6300 },
  'Colonia Residencial': { lat: 32.5800, lon: -116.6200 },
}

export function getNearestLocation(
  userLat: number,
  userLon: number
): string | null {
  let nearestLocation = null
  let minDistance = Infinity

  for (const [location, coords] of Object.entries(LOCATION_COORDINATES)) {
    const distance = calculateDistance(userLat, userLon, coords.lat, coords.lon)
    if (distance < minDistance) {
      minDistance = distance
      nearestLocation = location
    }
  }

  // Only return if within 50km of Tecate area
  return minDistance < 50 ? nearestLocation : null
}
