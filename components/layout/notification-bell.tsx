'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Bell, Heart, MessageCircle, UserPlus } from 'lucide-react'

type BellItem = {
  id: string
  type: 'like' | 'comment' | 'follow'
  actor: string
  actorUsername?: string
  title: string
  href: string
  created_at: string
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  if (mins > 0) return `hace ${mins} min`
  return 'ahora mismo'
}

// Bell built on the tables that already exist live (listing_likes,
// listing_comments, follows) so it works today, without a new migration.
// Read state is kept per device in localStorage until the
// 018_notifications migration is applied to the live database, at which
// point it can move to a server-side read column.
const SEEN_KEY = 'vt-notifications-seen-at'

export function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<BellItem[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const seenAt = localStorage.getItem(SEEN_KEY)

    Promise.all([
      supabase
        .from('listing_likes')
        .select('id, created_at, user_id, listings!inner(id, title, user_id)')
        .eq('listings.user_id', user.id)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('listing_comments')
        .select('id, created_at, user_id, listings!inner(id, title, user_id)')
        .eq('listings.user_id', user.id)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('follows')
        .select('id, created_at, follower_id')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]).then(async ([likes, comments, follows]) => {
      const actorIds = new Set<string>()
      ;(likes.data || []).forEach((r: { user_id: string }) => actorIds.add(r.user_id))
      ;(comments.data || []).forEach((r: { user_id: string }) => actorIds.add(r.user_id))
      ;(follows.data || []).forEach((r: { follower_id: string }) => actorIds.add(r.follower_id))
      const { data: profiles } = actorIds.size
        ? await supabase.from('profiles').select('id, display_name, username').in('id', [...actorIds])
        : { data: [] }
      const byId = new Map((profiles || []).map((p: { id: string; display_name?: string; username?: string }) => [p.id, p]))
      const all: BellItem[] = []
      const push = (r: { id: string; created_at: string; listings?: { id: string; title: string } | { id: string; title: string }[] | null }, type: BellItem['type'], actorId: string) => {
        const profile = byId.get(actorId) as { display_name?: string; username?: string } | undefined
        const actor = profile?.display_name || 'Alguien'
        if (type === 'follow') {
          all.push({ id: r.id, type, actor, actorUsername: profile?.username, title: 'te siguió', href: profile?.username ? `/users/${profile.username}` : '/', created_at: r.created_at })
        } else {
          const listing = Array.isArray(r.listings) ? r.listings[0] : r.listings
          if (!listing) return
          all.push({ id: r.id, type, actor, actorUsername: profile?.username, title: listing.title, href: `/listings/${listing.id}`, created_at: r.created_at })
        }
      }
      ;(likes.data || []).forEach((r: { id: string; created_at: string; user_id: string; listings?: { id: string; title: string } | { id: string; title: string }[] | null }) => push(r, 'like', r.user_id))
      ;(comments.data || []).forEach((r: { id: string; created_at: string; user_id: string; listings?: { id: string; title: string } | { id: string; title: string }[] | null }) => push(r, 'comment', r.user_id))
      ;(follows.data || []).forEach((r: { id: string; created_at: string; follower_id: string }) => push(r, 'follow', r.follower_id))
      all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      const sliced = all.slice(0, 30)
      setItems(sliced)
      setUnread(seenAt ? sliced.filter(i => new Date(i.created_at) > new Date(seenAt)).length : sliced.length)
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!user) return null

  const markRead = () => {
    setOpen(!open)
    if (!open) {
      localStorage.setItem(SEEN_KEY, new Date().toISOString())
      setUnread(0)
    }
  }

  const icon = (type: BellItem['type']) =>
    type === 'like' ? <Heart className="h-4 w-4 text-gray-900 shrink-0" />
    : type === 'comment' ? <MessageCircle className="h-4 w-4 text-gray-900 shrink-0" />
    : <UserPlus className="h-4 w-4 text-gray-900 shrink-0" />

  const verb = (type: BellItem['type']) =>
    type === 'like' ? 'le dio me gusta a' : type === 'comment' ? 'comentó en' : ''

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={markRead}
        aria-label="Notificaciones"
        className="relative h-8 w-8 inline-flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 rounded-full bg-gray-900 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-white shadow-lg z-50 overflow-hidden">
          <p className="px-4 py-3 text-sm font-semibold text-gray-900 border-b">Notificaciones</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">Aún no tienes notificaciones.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((item) => (
                <Link key={`${item.type}-${item.id}`} href={item.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  {icon(item.type)}
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-900 leading-snug">
                      <span className="font-semibold">{item.actor}</span>{' '}
                      {item.type === 'follow' ? 'te siguió' : `${verb(item.type)} “${item.title}”`}
                    </span>
                    <span className="block text-xs text-gray-400 mt-0.5">{formatTimeAgo(item.created_at)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
