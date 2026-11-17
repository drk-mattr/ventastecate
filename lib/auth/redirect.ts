// Post-auth return destinations.
//
// The rule is the one app/auth/callback already enforces: only a
// same-origin relative path, never an external URL (an attacker who
// can craft a /login?redirect= link must not be able to bounce a
// fresh login out to their own site). Reuse this everywhere a
// `redirect` / `next` value is accepted or built — login, signup,
// the email confirmation link, OAuth — instead of re-checking the
// shape inline in each place.
export function isInternalPath(value: string | null | undefined): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//')
}

export function safeRedirect(value: string | null | undefined, fallback = '/'): string {
  return isInternalPath(value) ? value : fallback
}
