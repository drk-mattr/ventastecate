/**
 * Messaging v2 Step 2 — short Spanish timestamps for conversation rows.
 *
 * Kept in a helper outside any component: the repo's build lint
 * (react-hooks/purity) flags Date.now() called during render, and
 * the same rule applies to `new Date()` relative math done inline.
 * Callers pass the already-stored created_at string.
 */

export function formatRowTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysAgo = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86400000
  )

  if (daysAgo <= 0) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }
  if (daysAgo === 1) return 'ayer'
  if (daysAgo < 7) {
    return date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
  }
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
}
