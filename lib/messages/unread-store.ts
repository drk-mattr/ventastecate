/**
 * Messaging v2 Step 2 — the single shared unread-messages count.
 *
 * The header (desktop messages icon) and the mobile bottom-bar
 * Mensajes tab both read this one value via useUnreadMessages, so
 * the two badges can never disagree. Previously the bottom bar ran
 * its own standalone query; that query now lives here, once.
 *
 * Definition (unchanged): messages in the user's conversations that
 * are unread and not sent by them. Concurrent refreshes share one
 * in-flight request, so a header + bottom-bar mount (or a Realtime
 * event landing at the same time as a route change) still costs a
 * single query.
 */

import { createClient } from '@/lib/supabase/client'

let count = 0
let inFlight: Promise<number> | null = null
const listeners = new Set<(n: number) => void>()

export function getUnreadCount(): number {
  return count
}

export function subscribeUnread(listener: (n: number) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setCount(next: number): void {
  if (next === count) return
  count = next
  for (const listener of listeners) listener(next)
}

export function refreshUnreadCount(userId: string): Promise<number> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      // Step 4: the server route applies the archive/block rules,
      // so archived threads and blocked users never count toward
      // the badges. If the route fails (or is not deployed yet),
      // fall back to the client-direct query below — the badge
      // keeps working, just without the Step 4 exclusions.
      const res = await fetch('/api/messages/unread')
      if (res.ok) {
        const json = await res.json()
        if (typeof json.unread === 'number') {
          setCount(json.unread)
          return json.unread
        }
      }
      const supabase = createClient()
      const { data, error } = await supabase
        .from('conversations')
        .select('messages(id, read, sender_id)')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      if (error || !data) return count
      let next = 0
      for (const c of data as { messages?: { read: boolean; sender_id: string }[] }[]) {
        for (const m of c.messages || []) {
          if (!m.read && m.sender_id !== userId) next += 1
        }
      }
      setCount(next)
      return next
    } catch {
      // Badge keeps its last value rather than breaking the nav.
      return count
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}
