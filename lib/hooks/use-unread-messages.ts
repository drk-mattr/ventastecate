'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import {
  getUnreadCount,
  refreshUnreadCount,
  subscribeUnread,
} from '@/lib/messages/unread-store'

/**
 * Messaging v2 Step 2 — the single shared unread-messages count.
 *
 * Used by the header (desktop messages icon) and the mobile
 * bottom-bar Mensajes tab. Refreshes when the user or route changes
 * — opening /messages clears it once the thread is marked read —
 * and when a new message arrives via Realtime. Realtime respects
 * RLS, so the subscription only delivers rows in the user's own
 * conversations.
 */
export function useUnreadMessages(): number {
  const { user } = useAuth()
  const pathname = usePathname()
  const [count, setCount] = useState(getUnreadCount)

  useEffect(() => subscribeUnread(setCount), [])

  useEffect(() => {
    if (!user) return
    void refreshUnreadCount(user.id)
  }, [user, pathname])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        void refreshUnreadCount(user.id)
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user])

  return count
}
