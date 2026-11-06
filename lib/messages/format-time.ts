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

/** Short time for a chat bubble, e.g. "14:32". */
export function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Calendar-day key for grouping consecutive messages. */
export function dayKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Day separator label for the thread: "Hoy", "Ayer", or "lunes, 3 de noviembre". */
export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysAgo = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86400000
  )

  if (daysAgo <= 0) return 'Hoy'
  if (daysAgo === 1) return 'Ayer'
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
