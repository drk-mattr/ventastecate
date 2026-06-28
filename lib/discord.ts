/**
 * Helpers for safely composing Discord webhook payloads from user-supplied
 * input. Even though embed field values don't ping by default, we still
 * neutralize mention syntax and cap lengths to prevent channel spam, fake
 * links, and markdown injection from untrusted callers.
 */

/** Discord hard-caps embed field values at 1024 chars; we stay well under. */
export function sanitizeDiscordText(input: unknown, maxLen = 256): string {
  if (input == null) return '—'
  let s = String(input)

  // Neutralize @everyone / @here / <@id> / <@&role> by inserting a zero-width
  // space after the @, so they render as text and never resolve to a mention.
  s = s.replace(/@/g, '@​')

  // Strip C0 control chars (incl. newlines) then collapse whitespace runs.
  s = s.replace(/[\x00-\x1F]/g, ' ').replace(/\s+/g, ' ').trim()

  if (s.length > maxLen) s = s.slice(0, maxLen - 1) + '…'

  // Discord rejects empty field values.
  return s.length ? s : '—'
}

/** Basic shape check for an email used only for display in a Discord embed. */
export function sanitizeEmailForDisplay(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim().slice(0, 120)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null
  return s
}
