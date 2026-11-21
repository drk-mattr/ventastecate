'use client'

import { useEffect, useRef, useState } from 'react'

// Terreno detail map — an embedded Google Map showing where the
// lot is, rendered only on terreno detail pages that carry
// coordinates (the detail page gates on property_type ===
// 'terreno' AND latitude/longitude present). No coordinates means
// no map — never a guessed location.
//
// Reuses the /garita pattern: the browser key is fetched at
// runtime from /api/garita/maps-key (never baked into a build
// artifact) and the Maps JS API loads once per page. The base
// map is NOT the /garita grayscale style — this map is the
// default full-color Google roadmap (no custom styles), because
// the grayscale wash made sparse areas read as nearly blank.
// The orange is carried by the marker pin only. No traffic
// layer: this map answers "where is it", not "how is the line".
//
// Lazy by design: nothing loads — not even the key fetch — until
// the section scrolls into view (IntersectionObserver). If the
// key or the script fails, the section renders nothing at all
// (a single console.warn, no error banner, no crash).

// Minimal local typings for the Maps JS pieces we use — no new
// dependency (@types/google.maps is not installed).
type LatLngLiteral = { lat: number; lng: number }
type MapOptions = {
  center: LatLngLiteral
  zoom: number
  gestureHandling: string
  streetViewControl: boolean
  fullscreenControl: boolean
  mapTypeControl: boolean
  zoomControl: boolean
}
type GoogleMapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: MapOptions) => object
    Marker: new (options: {
      position: LatLngLiteral
      map: object
      title: string
      icon?: { url: string; scaledSize: object; anchor: object }
    }) => object
    Size: new (width: number, height: number) => object
    Point: new (x: number, y: number) => object
  }
}

// No `declare global` augmentation here on purpose: the garita
// map file declares the global Window.google type for its own
// (narrower) API shape, and re-declaring it with this file's
// wider shape collides (TS2717/TS2719). This file reaches window
// through a local cast instead.
type WindowWithListingMaps = Window & {
  google?: GoogleMapsApi
  __vtListingMapsReady?: () => void
}
function listingWindow(): WindowWithListingMaps {
  return window as unknown as WindowWithListingMaps
}

const MAP_CALLBACK = '__vtListingMapsReady'
const ZOOM = 15

// Orange pin (site orange-600 #EA580C) with a white center dot,
// as a data-URI SVG so no asset file is needed.
const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="54" viewBox="0 0 36 54">' +
  '<path d="M18 0C8.1 0 0 8.1 0 18c0 13.5 18 36 18 36s18-22.5 18-36C36 8.1 27.9 0 18 0z" fill="#EA580C"/>' +
  '<circle cx="18" cy="18" r="7" fill="#ffffff"/></svg>'
const PIN_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PIN_SVG)}`

// One shared script load per page: the loader is StrictMode-safe
// via the promise cache, and a failed load stays retryable.
let mapsScriptPromise: Promise<GoogleMapsApi> | null = null

function loadMapsScript(key: string): Promise<GoogleMapsApi> {
  const w = listingWindow()
  if (w.google?.maps) return Promise.resolve(w.google)
  if (mapsScriptPromise) return mapsScriptPromise
  mapsScriptPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    w.__vtListingMapsReady = () => {
      if (w.google?.maps) resolve(w.google)
      else reject(new Error('maps_failed'))
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${MAP_CALLBACK}`
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('maps_failed'))
    document.head.appendChild(script)
    // Google not responding is an error, not a hang.
    setTimeout(() => reject(new Error('maps_timeout')), 15000)
  })
  mapsScriptPromise.catch(() => {
    mapsScriptPromise = null
  })
  return mapsScriptPromise
}

type MapState = 'idle' | 'ready' | 'unavailable'

export function ListingMap({
  latitude,
  longitude,
  title,
}: {
  latitude: number
  longitude: number
  title?: string
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<MapState>('idle')
  const startedRef = useRef(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || startedRef.current) return
    startedRef.current = true
    let cancelled = false
    const init = async () => {
      try {
        const res = await fetch('/api/garita/maps-key', { cache: 'no-store' })
        if (!res.ok) throw new Error('maps_unavailable')
        const data: unknown = await res.json()
        const key =
          data && typeof data === 'object' && 'key' in data
            ? (data as { key: unknown }).key
            : undefined
        if (typeof key !== 'string' || key.length === 0) {
          throw new Error('maps_unavailable')
        }
        const google = await loadMapsScript(key)
        if (cancelled) return
        const el = mapElRef.current
        if (!el) throw new Error('maps_unavailable')
        const position: LatLngLiteral = { lat: latitude, lng: longitude }
        const map = new google.maps.Map(el, {
          center: position,
          zoom: ZOOM,
          // Full-color default Google roadmap: no custom styles —
          // the /garita grayscale wash read as nearly blank here.
          // Cooperative gestures: a one-finger scroll still scrolls
          // the page on mobile; the map only zooms with two fingers.
          gestureHandling: 'cooperative',
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          zoomControl: true,
        })
        new google.maps.Marker({
          position,
          map,
          title: title ?? 'Terreno',
          icon: {
            url: PIN_URL,
            scaledSize: new google.maps.Size(30, 45),
            anchor: new google.maps.Point(15, 45),
          },
        })
        setState('ready')
      } catch {
        if (!cancelled) {
          console.warn('[listing-map] map unavailable')
          setState('unavailable')
        }
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [visible, latitude, longitude, title])

  // Unavailable (no key, script failed): render nothing — the
  // section simply isn't there, instead of an error banner.
  if (state === 'unavailable') return null

  return (
    <section ref={sectionRef} aria-label="Ubicación" className="pt-1">
      <h2 className="text-base font-semibold mb-3">Ubicación</h2>
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="relative h-[240px] w-full bg-gray-100 sm:h-[280px]">
          <div ref={mapElRef} className="absolute inset-0" />
          {state !== 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <p className="text-center text-sm text-gray-500">Cargando el mapa…</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
