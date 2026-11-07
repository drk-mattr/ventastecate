'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Header } from '@/components/layout/header'
import { ConversationList } from '@/components/messages/conversation-list'
import {
  BlockedUsersList,
  type BlockedUser,
} from '@/components/messages/blocked-users-list'
import { MessageThread } from '@/components/messages/message-thread'
import { refreshUnreadCount } from '@/lib/messages/unread-store'
import {
  type ConversationEmbedRow,
} from '@/lib/messages/normalize-conversation'
import type {
  Conversation,
  ConversationProfile,
  Message,
  PendingThread,
} from '@/lib/messages/types'

/**
 * Messaging v2 Step 3 — thin shell. The list, thread and composer
 * live in components/messages/; this page owns auth, the list
 * fetch, the Realtime subscriptions, URL-driven selection and the
 * Contactar (?listing&seller) flow.
 *
 * URL-driven thread: selection derives from ?conversation=<id>.
 * Tapping a row pushes the param (back returns to the list);
 * loading /messages?conversation=<id> directly opens that thread.
 * No selection state is kept — the param is the source of truth.
 *
 * NO EMPTY THREADS (Step 3 rule): tapping Contactar creates
 * NOTHING. /messages?listing=<id>&seller=<id> resolves to a
 * *pending* thread — the listing context plus a composer — and the
 * conversation row is created together with the first message send
 * (see MessageComposer). If a thread for this listing + seller
 * already exists, the URL is replaced with ?conversation=<id>.
 *
 * Realtime (browser client, RLS-scoped to the user's own rows):
 * - messages INSERT on any thread -> list refetch (re-orders via
 *   the Step 1 updated_at trigger); conversations UPDATE -> same.
 * - messages INSERT filtered to the open thread -> append the
 *   message, deduplicated by id against the sender's own echo.
 * No polling fallback.
 *
 * Step 4 — safety: the rail has a Todas / Archivadas / Bloqueados
 * filter. Archiving is per-participant (server route, no UPDATE
 * policy exists on conversations); blocking hides the thread and
 * the database triggers refuse new threads and sends from the
 * blocked user; reporting stores a report for the superadmin
 * inbox. The thread component remounts per thread (key), so the
 * menu state resets without syncing state in an effect.
 */

// The embed columns for the pending-flow existing-thread lookup.
const CONVERSATION_EMBED = `
  *,
  listing:listings(id, title, price, status),
  buyer:buyer_id(id, username, display_name, avatar_url),
  seller:seller_id(id, username, display_name, avatar_url)
`

// Step 4 rail filter: the default list, archived threads, or the
// blocked-users view (where unblocking happens).
const LIST_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'archived', label: 'Archivadas' },
  { value: 'blocked', label: 'Bloqueados' },
] as const
type ListFilter = (typeof LIST_FILTERS)[number]['value']

function MessagesContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const f = t.forms

  // One stable browser client: removeChannel must run on the same
  // instance that subscribed.
  const [supabase] = useState(() => createClient())

  const [conversations, setConversations] = useState<Conversation[]>([])
  // A failed list fetch must never render as "no conversations"
  // (PR #61: the route 500'd while the page showed the empty state).
  const [loadError, setLoadError] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  // Step 4: rail filter + blocked users. The filter is component
  // state (not a URL param); a ref mirrors it so the Realtime
  // refetch always uses the current filter.
  const [listFilter, setListFilter] = useState<ListFilter>('all')
  const listFilterRef = useRef<ListFilter>('all')
  listFilterRef.current = listFilter
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [blockedError, setBlockedError] = useState(false)

  // Pending thread: Contactar was tapped, no row exists yet.
  const [pending, setPending] = useState<PendingThread | null>(null)
  // The listing is gone, or the seller does not own it.
  const [pendingError, setPendingError] = useState(false)

  const listingId = searchParams.get('listing')
  const sellerId = searchParams.get('seller')
  const conversationId = searchParams.get('conversation')

  const selectedConversation =
    conversations.find((c) => c.id === conversationId) ?? null
  const selectedId = selectedConversation?.id ?? null
  const showThreadPane =
    selectedConversation !== null || pending !== null || pendingError

  // In-flight guard so the list refetch never stacks: one incoming
  // message fires both the messages INSERT and the conversations
  // UPDATE handlers below, and sending refetches too.
  const listFetchRef = useRef<Promise<void> | null>(null)

  const fetchConversations = useCallback(
    async (filter: 'all' | 'archived' = 'all') => {
      if (!user) return

      const res = await fetch(
        `/api/messages/conversations?page=1&limit=20&filter=${filter}`
      )
      if (!res.ok) {
        console.error('Failed to load conversations:', res.status)
        setConversations([])
        setLoadError(true)
        setLoading(false)
        return
      }
      const json = await res.json()
      setConversations(json.conversations || [])
      setLoadError(false)
      setLoading(false)
    },
    [user]
  )

  const fetchBlockedUsers = useCallback(async () => {
    if (!user) return
    const res = await fetch('/api/messages/blocks')
    if (!res.ok) {
      console.error('Failed to load blocked users:', res.status)
      setBlockedUsers([])
      setBlockedError(true)
      return
    }
    const json = await res.json()
    setBlockedUsers(json.blocked || [])
    setBlockedError(false)
  }, [user])

  const refreshList = useCallback(() => {
    if (listFilterRef.current === 'blocked') return fetchBlockedUsers()
    if (listFetchRef.current) return listFetchRef.current
    const p = fetchConversations(listFilterRef.current)
    listFetchRef.current = p
    void p.finally(() => {
      listFetchRef.current = null
    })
    return p
  }, [fetchConversations, fetchBlockedUsers])

  const markMessagesAsRead = useCallback(
    async (convId: string) => {
      if (!user) return

      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .neq('sender_id', user.id)
        .eq('read', false)

      if (error) {
        console.error('Failed to mark messages read:', error.message)
        return
      }
      // Clear the row's count locally and the shared badge, so the
      // unread state clears the moment the thread opens.
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      )
      void refreshUnreadCount(user.id)
    },
    [supabase, user]
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      // Keep the listing context through login so the buyer lands
      // back on the pending composer, not a bare /messages.
      const back =
        listingId && sellerId
          ? `/messages?listing=${listingId}&seller=${sellerId}`
          : '/messages'
      router.push(`/login?redirect=${encodeURIComponent(back)}`)
      return
    }
    void refreshList()
  }, [user, authLoading, refreshList, router, listingId, sellerId])

  // Step 4: switching the rail filter reloads the matching view
  // (default list, archived threads, or blocked users).
  useEffect(() => {
    if (!user) return
    void refreshList()
  }, [listFilter, user, refreshList])

  // Contactar resolution (?listing&seller): look up an existing
  // thread WITHOUT inserting anything. Found -> replace the URL
  // with ?conversation=<id>. Not found -> pending composer with
  // the listing + seller loaded for the thread header. Guarded by
  // key so a re-render never re-resolves the same pair.
  const pendingKeyRef = useRef('')
  useEffect(() => {
    if (!listingId || !sellerId || !user) return
    if (conversationId) return
    if (sellerId === user.id) return
    const key = `${listingId}:${sellerId}`
    if (pendingKeyRef.current === key) return

    let cancelled = false
    const resolve = async () => {
      // maybeSingle(): the "no existing conversation" case is normal.
      const { data: existing } = await supabase
        .from('conversations')
        .select(CONVERSATION_EMBED)
        .eq('listing_id', listingId)
        .eq('buyer_id', user.id)
        .eq('seller_id', sellerId)
        .maybeSingle()

      if (cancelled) return
      if (existing) {
        pendingKeyRef.current = key
        router.replace(
          `/messages?conversation=${(existing as ConversationEmbedRow).id}`
        )
        return
      }

      // No thread yet: load the listing (and seller) for the pending
      // header. The seller must own the listing — the same check the
      // conversations INSERT policy enforces at send time.
      // Currency + Gratis (migration 038): try with the new columns,
      // retry without them pre-038 so the pending strip never breaks
      // over a missing column (42703).
      const fetchPendingListing = async () => {
        const first = await supabase
          .from('listings')
          .select('id, title, price, currency, is_free, status, user_id')
          .eq('id', listingId)
          .single()
        if (first.error && (first.error.code === '42703' || first.error.code === 'PGRST204')) {
          return supabase
            .from('listings')
            .select('id, title, price, status, user_id')
            .eq('id', listingId)
            .single()
        }
        return first
      }
      const [{ data: listing }, { data: seller }] = await Promise.all([
        fetchPendingListing(),
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', sellerId)
          .single(),
      ])
      if (cancelled) return
      pendingKeyRef.current = key

      const typedListing = listing as {
        id: string
        title: string
        price: number | null
        currency?: string | null
        is_free?: boolean | null
        status: string | null
        user_id: string
      } | null
      if (!typedListing || typedListing.user_id !== sellerId) {
        setPendingError(true)
        return
      }

      const { data: image } = await supabase
        .from('listing_images')
        .select('image_url')
        .eq('listing_id', listingId)
        .order('order_index', { ascending: true })
        .limit(1)
        .single()
      if (cancelled) return

      setPending({
        listingId,
        sellerId,
        listing: {
          id: typedListing.id,
          title: typedListing.title,
          price: typedListing.price ?? null,
          currency: typedListing.currency ?? null,
          is_free: typedListing.is_free ?? null,
          status: typedListing.status ?? null,
          image_url: (image as { image_url?: string | null } | null)?.image_url ?? null,
        },
        seller: (seller as ConversationProfile | null) ?? null,
      })
    }
    void resolve()
    return () => {
      cancelled = true
    }
  }, [listingId, sellerId, user, conversationId, supabase, router])

  // Messaging v2 Step 1: messages come from the paginated server route
  // (page 1 = the most recent 50). Load-more UI is a later step.
  const fetchMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/messages/conversations/${convId}/messages`)
    if (!res.ok) {
      console.error('Failed to load messages:', res.status)
      setMessages([])
      return
    }
    const json = await res.json()
    setMessages(json.messages || [])
  }, [])

  useEffect(() => {
    if (!selectedId) return
    void fetchMessages(selectedId)
    void markMessagesAsRead(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Realtime: new activity anywhere re-orders the list. A message
  // insert bumps conversations.updated_at via the Step 1 trigger
  // (028), so both events fire for one message — refreshList's
  // in-flight guard collapses them into a single refetch.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('messages-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        void refreshList()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        void refreshList()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user, supabase, refreshList])

  // Realtime: new messages in the open thread appear without a
  // refresh. The sender's own message arrives here too (RLS lets
  // them read their own rows) — dedupe by id, since the composer
  // also appends the inserted row when the insert returns.
  useEffect(() => {
    if (!selectedId || !user) return
    const channel = supabase
      .channel(`messages-thread-${selectedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const incoming = payload.new as Message
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          )
          if (incoming.sender_id !== user.id) {
            void markMessagesAsRead(selectedId)
          }
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, user])

  const selectConversation = (id: string) => {
    // push (not replace): the browser back button returns to the list.
    router.push(`/messages?conversation=${id}`)
  }

  const backToList = () => {
    router.push('/messages')
  }

  const handleConversationCreated = useCallback(
    (conv: Conversation) => {
      // Make sure the thread is in the list so the URL-driven
      // selection finds it even before the refetch lands.
      setConversations((prev) =>
        prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
      )
      router.push(`/messages?conversation=${conv.id}`)
    },
    [router]
  )

  const handleUnblocked = useCallback(
    (userId: string) => {
      setBlockedUsers((prev) => prev.filter((b) => b.id !== userId))
      void refreshList()
    },
    [refreshList]
  )

  // Step 4: the open thread left the list (archived, or its user
  // blocked). Back to the default view and refetch, so the change
  // is visible immediately — including the unread badge.
  const handleThreadLeft = useCallback(() => {
    setListFilter('all')
    void refreshList()
    if (user) void refreshUnreadCount(user.id)
    router.push('/messages')
  }, [refreshList, router, user])

  const handleSent = (message: Message) => {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    )

    // No client-side conversations.updated_at bump: there is no UPDATE
    // policy on conversations, so RLS denied it. The Step 1 trigger
    // (028) bumps updated_at server-side when a message is inserted.
    void refreshList()

    fetch('/api/send-message-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: message.conversation_id,
        messageId: message.id,
      }),
    }).catch((err) => console.error('Failed to send email notification:', err))
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-white md:h-dvh">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-500">{f.loadingMessages}</p>
        </div>
      </div>
    )
  }

  // Design overhaul: a messaging app, not two cards on gray. The
  // rail (360px, 400px on xl) holds the conversation list; the
  // thread fills the rest of a shell capped at 1600px, so the
  // conversation never sprawls across a huge desktop. The message
  // column itself is max-w-2xl, centered — header, listing strip
  // and composer share that column.
  // 4rem subtraction is the fixed mobile bottom bar, which the body
  // reserves with pb-16 (see app/layout.tsx); desktop has no bar.
  // On mobile only one pane shows at a time: list full-screen, then
  // thread full-screen with the back control.
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-white md:h-dvh">
      <Header />
      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1">
        {/* Conversation rail */}
        <section
          className={`${
            showThreadPane ? 'hidden md:flex' : 'flex'
          } w-full flex-col border-r border-gray-200 md:w-[360px] md:shrink-0 xl:w-[400px]`}
        >
          <div className="shrink-0 border-b px-4 py-3">
            <h2 className="font-semibold">{f.conversationsTitle}</h2>
            {/* Step 4 filter: Todas / Archivadas / Bloqueados. */}
            <div className="mt-2 flex gap-1 rounded-full bg-gray-100 p-1">
              {LIST_FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setListFilter(option.value)}
                  className={`flex-1 rounded-full px-2 py-1 text-xs font-medium ${
                    listFilter === option.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {listFilter === 'blocked' ? (
              <BlockedUsersList
                blocked={blockedUsers}
                loadError={blockedError}
                onUnblocked={handleUnblocked}
              />
            ) : (
              <ConversationList
                conversations={conversations}
                currentUserId={user?.id ?? ''}
                selectedId={selectedId}
                loadError={loadError}
                filter={listFilter}
                onSelect={selectConversation}
              />
            )}
          </div>
        </section>

        {/* Thread */}
        <section
          className={`${
            showThreadPane ? 'flex' : 'hidden md:flex'
          } min-w-0 flex-1 flex-col`}
        >
          {selectedConversation || pending ? (
            <MessageThread
              // Key-based remount per thread: the menu, block
              // confirm and report form reset when the thread
              // changes, without syncing state in an effect.
              key={selectedConversation?.id ?? `pending-${pending?.listingId ?? 'none'}`}
              conversation={selectedConversation}
              pending={selectedConversation ? null : pending}
              currentUserId={user?.id ?? ''}
              messages={messages}
              onBack={backToList}
              onSent={handleSent}
              onConversationCreated={handleConversationCreated}
              onArchived={handleThreadLeft}
              onBlocked={handleThreadLeft}
            />
          ) : pendingError ? (
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <MessageCircle className="h-7 w-7 text-gray-400" />
              </span>
              <p className="font-semibold text-gray-900">
                Este anuncio ya no está disponible o no se pudo iniciar la conversación.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <MessageCircle className="h-8 w-8 text-gray-400" />
              </span>
              <p className="font-semibold text-gray-900">{f.selectConversation}</p>
              <p className="text-sm text-gray-500">
                Explora anuncios y contacta con un vendedor para empezar.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default function MessagesPage() {
  const t = useTranslations()
  const f = t.forms
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-white md:h-dvh">
          <Header />
          <div className="flex flex-1 items-center justify-center">
            <p className="text-gray-500">{f.loadingMessages}</p>
          </div>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  )
}
