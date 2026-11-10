import { NextResponse } from 'next/server'

// GET /api/garita/maps-key — the Google Maps browser key for the
// /garita traffic map, served at runtime, never baked into a
// build artifact.
//
// The key is a public browser key by design (referrer-restricted
// to ventastecate.com in the Cloud Console); this route exists
// only so the key stays out of the static chunks — it can be
// rotated (Worker secret NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) without
// a rebuild. The client fetches it only when the map card scrolls
// into view. force-dynamic matters: without it Next would
// prerender this route at build time (when the secret may not
// exist yet) and bake the 503 into the deploy.
export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) {
    return NextResponse.json(
      { error: 'maps_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  return NextResponse.json(
    { key },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
