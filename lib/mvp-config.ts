import type { Lang } from '@/lib/i18n'

/**
 * MVP launch configuration.
 *
 * The app was built to run as a multi-region, multi-language, multi-brand
 * platform (Mexico + Philippines + Indonesia, brands "Ventas Tecate" /
 * "Papryka"). For the initial MVP we deliberately LOCK the whole experience to
 * a single market — Tecate, Mexico — to solve marketplace cold-start by
 * concentrating density in one town.
 *
 * Everything that powers the other regions still lives in the codebase; it is
 * simply bypassed while LOCK_TO_TECATE is true. To re-enable multi-region
 * (e.g. the Philippines expansion), set LOCK_TO_TECATE to false. That single
 * change restores IP-based language/region detection and the worldwide view.
 */
export const LOCK_TO_TECATE = true

/** Country the MVP is locked to (ISO-3166 alpha-2). Used for listing filtering. */
export const MVP_COUNTRY = 'MX'

/** Language the MVP is locked to. */
export const MVP_LANG: Lang = 'es'

/** HTML lang attribute for the locked market. */
export const MVP_HTML_LANG = 'es-MX'

/**
 * Resolve the effective country code. While locked, always returns the MVP
 * country regardless of the visitor's detected IP — this fixes the border-town
 * problem where Tecate locals on US IPs (cf-ipcountry = "US") would otherwise
 * see the site in English with zero listings.
 */
export function resolveCountry(detected: string | null): string | null {
  return LOCK_TO_TECATE ? MVP_COUNTRY : detected
}
