'use client'

import { useRegion } from '@/lib/region-context'
import { getTranslations, type Translations } from '@/lib/i18n'

export function useTranslations(): Translations {
  const countryCode = useRegion()
  return getTranslations(countryCode)
}
