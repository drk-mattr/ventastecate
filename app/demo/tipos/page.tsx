// Demo preview — /demo/tipos.
//
// Renders the ranking UI ("En tendencia" / "Más mencionados") with
// HARDCODED SAMPLE DATA so the lists can be judged before any real
// mentions exist. This page reads NOTHING from the database, writes
// nothing, calls no RPC, and does not depend on migration 035 — it
// works identically whether or not 035 is applied.
//
// The business names are REAL businesses from the index (their rows
// link to the real business pages); the mention/contributor numbers
// and the rankings are SAMPLES — the banner says so, and nothing on
// this page is a real ranking. No "Lo mejor de Tecate" /
// "Más recomendados" labels: there is no recommendation data.
//
// Not linked from the header, nav, footer, sitemap or any live page.
// robots: noindex (metadata below).

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { OfferSection } from '@/components/items/offer-section'
import type { Offer } from '@/components/items/offer-row'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // No "| Ventas Tecate" suffix here — the layout's title template
  // adds it (PR #80 lesson: including it renders it twice).
  title: 'Vista previa: tipos',
  description: 'Vista previa de las listas de tipos con datos de ejemplo.',
  robots: {
    index: false,
    follow: false,
  },
}

const CANELA_PHOTO =
  'https://afhcrjuezhjsfzampbsz.supabase.co/storage/v1/object/public/listing-images/businesses/72943d12-ce3d-4f3a-b0a0-1d867e324dde/1793904694982-0-fachada.jpg'

// Sample offers. Business ids/names/categories are real (from the
// index); mentionCount / contributors are invented for the preview.
function sampleOffer(
  itemId: string,
  business: { id: string; name: string; category: string | null },
  kindId: string,
  kindName: string,
  mentionCount: number,
  contributors: number,
  photoUrl: string | null = null,
): Offer {
  return {
    itemId,
    business: {
      id: business.id,
      name: business.name,
      category: business.category,
      city: 'Tecate',
      location: 'Tecate',
      image_url: null,
    },
    kindId,
    kindName,
    origin: 'community',
    createdAt: '2026-11-01T12:00:00.000Z',
    mentionCount,
    contributors,
    photoUrl,
  }
}

// Tacos — the FULL gated state (Tecate gate: >= 3 scoring items,
// leader >= 3 distinct contributors). The two lists order the same
// five offers by different signals on purpose: activity first,
// mentions second.
const TACOS_BY_MENTIONS: Offer[] = [
  sampleOffer(
    'demo-tacos-1',
    { id: '6bb12633-76e0-4a88-993a-f84962248c88', name: 'Tacos El Güero', category: 'tacos' },
    'e5f6fc73-e6f8-41cb-b66a-4a95232ca141',
    'Tacos de asada',
    18,
    12,
  ),
  sampleOffer(
    'demo-tacos-2',
    { id: 'dd13d138-3c1b-4a59-a389-6a6f254676f2', name: 'Tacos Culiacan', category: 'restaurante' },
    'ebd67b40-dfd4-4852-a0a3-2357fffb5d6c',
    'Tacos de adobada',
    14,
    9,
  ),
  sampleOffer(
    'demo-tacos-3',
    { id: '334776e8-caf2-48ca-a8c1-096b69197557', name: 'Birriería y Taquería El Poblano', category: 'tacos' },
    '86f82e74-215a-4a44-b424-1f7343ce7a7b',
    'Tacos de birria',
    11,
    8,
  ),
  sampleOffer(
    'demo-tacos-4',
    { id: '39930c99-8fcf-4d55-9857-dd5f9b61fc18', name: "Tacos De Birria Chimino'S", category: 'tacos' },
    '86f82e74-215a-4a44-b424-1f7343ce7a7b',
    'Tacos de birria',
    9,
    6,
  ),
  sampleOffer(
    'demo-tacos-5',
    { id: 'b1cbd4c6-cecd-4de2-b303-bcf426fac4c7', name: 'Los Fabulosos Tacos', category: 'tacos' },
    '22ce651e-4993-4653-8231-7c9c28e645c1',
    'Tacos de pastor',
    6,
    4,
  ),
]

// Same five offers, activity-ordered (recent buzz first) — a
// different order than the mention-count list above. That is the
// point: the two lists measure different things.
const TACOS_TRENDING: Offer[] = [
  TACOS_BY_MENTIONS[3],
  TACOS_BY_MENTIONS[0],
  TACOS_BY_MENTIONS[1],
  TACOS_BY_MENTIONS[2],
  TACOS_BY_MENTIONS[4],
]

// Churros — the INSUFFICIENT-EVIDENCE state: offers exist and have
// a few mentions, but the gate does not pass, so the list shows
// unnumbered with the honest note and there is no trending section.
const CHURROS_OFFERS: Offer[] = [
  sampleOffer(
    'demo-churros-1',
    { id: '72943d12-ce3d-4f3a-b0a0-1d867e324dde', name: 'Canela en Polvo Churrería', category: 'café' },
    'dc590e28-43a0-4c24-84ed-0fe6f0c54870',
    'Churros',
    2,
    1,
    CANELA_PHOTO,
  ),
  sampleOffer(
    'demo-churros-2',
    { id: 'fb92be6e-93c2-4925-a387-db8be101d2da', name: 'Postres De Costco Y Botanas La Monky', category: 'dulcería' },
    'dc590e28-43a0-4c24-84ed-0fe6f0c54870',
    'Churros',
    1,
    1,
  ),
]

export default function DemoTiposPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Unmissable demo banner — sticky, so it stays visible while
          scrolling. Nothing on this page is a real ranking. */}
      <div className="sticky top-0 z-50 bg-gray-900 text-white px-4 py-3 text-center">
        <p className="text-sm font-semibold">Vista previa · Datos de ejemplo</p>
        <p className="text-xs text-gray-300 mt-0.5">
          Estas menciones y posiciones no son reales — solo muestran cómo se verán
          las listas cuando haya menciones de verdad.
        </p>
      </div>
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Tacos — full gated state. */}
        <h1 className="text-lg font-semibold leading-tight">Tacos</h1>
        <p className="text-xs text-gray-500 mt-1">
          5 negocios · 58 menciones · en Tecate
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Las dos listas ordenan lo mismo con señales distintas: actividad
          reciente arriba, menciones abajo.
        </p>
        <OfferSection
          title="En tendencia"
          offers={TACOS_TRENDING}
          ranked
          multiKind
        />
        <OfferSection
          title="Más mencionados"
          offers={TACOS_BY_MENTIONS}
          ranked
          multiKind
        />

        {/* Churros — insufficient evidence. */}
        <div className="mt-10 border-t pt-6">
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <Link href="/tipos/postres" className="hover:underline">
              Postres
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700">Churros</span>
          </p>
          <h1 className="text-lg font-semibold leading-tight">Churros</h1>
          <p className="text-xs text-gray-500 mt-1">
            2 negocios · 3 menciones · en Tecate
          </p>
          <OfferSection
            title="Más mencionados"
            offers={CHURROS_OFFERS}
            ranked={false}
            multiKind={false}
            note="Todavía no hay suficiente para ordenar."
          />
        </div>

        <p className="text-xs text-gray-400 mt-10 border-t pt-4">
          Vista previa con datos de ejemplo. Ninguna mención, posición ni
          negocio de esta página refleja datos reales del sitio.
        </p>
      </main>
    </div>
  )
}
