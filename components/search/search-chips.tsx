'use client'

import { useRouter } from 'next/navigation'
import { X, MapPin } from 'lucide-react'
import { useTranslations } from '@/lib/hooks/use-translations'

// Active-filter chips + the honest scope line, shown under the search
// toolbar on /search. Every chip removes its filter (one tap); the
// scope line says which location scope is actually in effect, so a
// 6-vs-7 result count is explainable in the UI instead of looking
// like a bug.
export interface SearchChipsValues {
  q?: string
  type?: string
  category?: string
  location?: string
  city?: string
  stateRegion?: string
  minPrice?: string
  maxPrice?: string
  currency?: string
  sort?: string
  country?: string
  bedrooms?: string
  bathrooms?: string
  m2?: string
}

interface Props {
  values: SearchChipsValues
  regionLabel: string
}

const TYPE_LABELS: Record<string, string> = {
  product: 'Productos',
  service: 'Servicios',
  event: 'Eventos',
  news: 'Noticias',
}

export function SearchChips({ values, regionLabel }: Props) {
  const router = useRouter()
  const t = useTranslations()

  const locationValue = values.location || values.city || values.stateRegion || ''
  const locationOverridesRegion = !!locationValue && regionLabel !== 'Todas'

  const sortLabel =
    values.sort === 'price_asc'
      ? t.search.priceLowHigh
      : values.sort === 'price_desc'
        ? t.search.priceHighLow
        : values.sort === 'top'
          ? 'Más relevantes'
          : values.sort
            ? t.search.newest
            : ''

  const chips: { key: string; label: string; removeKeys: string[] }[] = []
  if (values.type && values.type !== 'all') {
    chips.push({ key: 'type', label: TYPE_LABELS[values.type] ?? values.type, removeKeys: ['type'] })
  }
  if (values.category) {
    const label = t.categories.find((c) => c.value === values.category)?.label ?? values.category
    chips.push({ key: 'category', label, removeKeys: ['category', 'bedrooms', 'bathrooms', 'm2'] })
  }
  if (locationValue) {
    chips.push({ key: 'location', label: `Ubicación: ${locationValue}`, removeKeys: ['location', 'city', 'stateRegion'] })
  }
  if (values.minPrice || values.maxPrice) {
    const label =
      values.minPrice && values.maxPrice
        ? `$${values.minPrice} - $${values.maxPrice}`
        : values.minPrice
          ? `Desde $${values.minPrice}`
          : `Hasta $${values.maxPrice}`
    chips.push({ key: 'price', label, removeKeys: ['minPrice', 'maxPrice'] })
  }
  if (values.currency) {
    chips.push({ key: 'currency', label: values.currency, removeKeys: ['currency'] })
  }
  if (values.sort && values.sort !== 'newest' && sortLabel) {
    chips.push({ key: 'sort', label: sortLabel, removeKeys: ['sort'] })
  }
  if (values.bedrooms) {
    chips.push({ key: 'bedrooms', label: `${values.bedrooms}+ rec.`, removeKeys: ['bedrooms'] })
  }
  if (values.bathrooms) {
    chips.push({ key: 'bathrooms', label: `${values.bathrooms}+ baños`, removeKeys: ['bathrooms'] })
  }
  if (values.m2) {
    chips.push({ key: 'm2', label: `≥ ${values.m2} m²`, removeKeys: ['m2'] })
  }

  const removeChip = (removeKeys: string[]) => {
    const params = new URLSearchParams()
    const entries: Record<string, string | undefined> = { ...values }
    removeKeys.forEach((k) => {
      delete entries[k]
    })
    Object.entries(entries).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    const qs = params.toString()
    router.push(qs ? `/search?${qs}` : '/search')
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <MapPin className="h-3 w-3 shrink-0" />
        {locationOverridesRegion
          ? `Ubicación: ${locationValue} — anula ${regionLabel}`
          : regionLabel === 'Todas'
            ? 'Mostrando todas las ubicaciones'
            : `Mostrando ${regionLabel}`}
      </p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-gray-100 text-xs text-gray-700"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip.removeKeys)}
                aria-label={`Quitar ${chip.label}`}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
