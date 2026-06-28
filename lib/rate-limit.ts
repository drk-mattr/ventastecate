/**
 * Minimal in-memory fixed-window rate limiter for API routes.
 *
 * NOTE: state lives in the module scope of a single server/worker isolate, so
 * on a multi-isolate platform (Cloudflare Workers / serverless) it bounds
 * casual abuse per isolate rather than enforcing a global limit. It's a cheap
 * first line of defense for unauthenticated webhook-forwarding endpoints; for
 * hard guarantees, back this with Durable Objects / KV / Upstash.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

/**
 * @param key        identity to limit on (e.g. `discord-notify:<ip>`)
 * @param limit      max requests allowed per window
 * @param windowMs   window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return { allowed: true, remaining: limit - existing.count, retryAfterSec: 0 }
}

/** Best-effort client IP from Cloudflare / proxy headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}
