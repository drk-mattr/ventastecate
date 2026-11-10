'use client'

import { useEffect, useRef, useState } from 'react'

// La Garita traffic map — a lazy-loaded Google Map at the TOP
// of the page, showing live traffic colors around the Tecate port
// of entry. It answers the one question the numbers can't: what
// does the line look like right now? It never gives a wait time —
// the traffic layer carries no minutes, no border data, no number
// at all — so the caption says so in one line.
//
// The map is a functional color exception (like video embeds): the
// traffic colors ARE the information, so grayscaling it would
// destroy the feature. All chrome around it stays monochrome, and
// there is zero orange anywhere on /garita.
//
// Lazy by design: nothing loads — not even the key fetch — until
// the card scrolls into view (IntersectionObserver), so a visitor
// who never scrolls to it costs nothing and the page's first
// paint is untouched. Since the 2026-11-10 vertical redesign the
// map is first on the page, so the observer fires immediately on
// load — the Maps JS + key fetch now cost on every /garita visit,
// not only on scroll. That is the price of map-first; the script
// is cached after the first load.
//
// Key wiring: the browser key is NEVER baked into a build
// artifact. The client fetches it at runtime from
// /api/garita/maps-key, which reads the Worker env var
// server-side. The key is a
// public browser key by design (referrer-restricted to
// ventastecate.com in the Cloud Console); the route just keeps it
// out of the static chunks so it can be rotated without a
// rebuild. If the key is missing the card degrades to the caption
// + outbound link — never an error banner.

// Port of entry (public fact, used by the code, never shown as
// text on the page).
const PORT = { lat: 32.576852, lng: -116.627179 }
// Center: a touch south of the port so the MX queue and the
// crossing are both in frame, not the port alone.
const CENTER = { lat: 32.576, lng: -116.628 }
const ZOOM = 15
const MAPS_LINK =
  'https://www.google.com/maps/@?api=1&map_action=map&center=32.576,-116.628&zoom=15'

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
    }) => object
    TrafficLayer: new () => { setMap: (map: object | null) => void }
  }
}

declare global {
  interface Window {
    google?: GoogleMapsApi
    __vtGaritaMapsReady?: () => void
  }
}

const MAP_CALLBACK = '__vtGaritaMapsReady'

// One shared script load per page: the map mounts once, but the
// promise cache also makes the loader StrictMode-safe.
let mapsScriptPromise: Promise<GoogleMapsApi> | null = null

function loadMapsScript(key: string): Promise<GoogleMapsApi> {
  if (window.google?.maps) return Promise.resolve(window.google)
  if (mapsScriptPromise) return mapsScriptPromise
  mapsScriptPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    window.__vtGaritaMapsReady = () => {
      if (window.google?.maps) resolve(window.google)
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
  // A failed load stays retryable (e.g. transient network).
  mapsScriptPromise.catch(() => {
    mapsScriptPromise = null
  })
  return mapsScriptPromise
}

type MapState = 'idle' | 'ready' | 'unavailable'

export function GaritaTrafficMap() {
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
        const map = new google.maps.Map(el, {
          center: CENTER,
          zoom: ZOOM,
          // Cooperative gestures: a one-finger scroll still scrolls
          // the page on mobile; the map only zooms with two fingers.
          // Otherwise the map traps the page scroll.
          gestureHandling: 'cooperative',
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          zoomControl: true,
        })
        new google.maps.Marker({ position: PORT, map, title: 'Garita de Tecate' })
        const traffic = new google.maps.TrafficLayer()
        traffic.setMap(map)
        setState('ready')
      } catch {
        if (!cancelled) setState('unavailable')
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [visible])

  return (
    <section ref={sectionRef} aria-label="Mapa del tráfico" className="mt-0">
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="relative h-[360px] w-full bg-gray-100 sm:h-[400px]">
          <div ref={mapElRef} className="absolute inset-0" />
          {state !== 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <p className="text-center text-sm text-gray-500">
                {state === 'unavailable'
                  ? 'El mapa no está disponible por ahora.'
                  : 'Cargando el mapa…'}
              </p>
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">
            Tráfico en vivo de Google — colores, no minutos.
          </p>
          <a
            href={MAPS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-medium text-gray-900 underline"
          >
            Ver tráfico en Google Maps
          </a>
        </div>
      </div>
    </section>
  )
}
