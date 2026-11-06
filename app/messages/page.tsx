'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Header } from '@/components/layout/header'
import { Card } from '@/components/ui/card'
import { ConversationList } from '@/components/messages/conversation-list'
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
 */

// The embed columns for the pending-flow existing-thread lookup.
const CONVERSATION_EMBED = `
  *,
  listing:listings(id, title, price, status),
  buyer:buyer_id(id, username, display_name, avatar_url),
  seller:seller_id(id, username, display_name, avatar_url)
`

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

  const fetchConversations = useCallback(async () => {
    if (!user) return

    const res = await fetch('/api/messages/conversations?page=1&limit=20')
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
  }, [user])

  const refreshList = useCallback(() => {
    if (listFetchRef.current) return listFetchRef.current
    const p = fetchConversations()
    listFetchRef.current = p
    void p.finally(() => {
      listFetchRef.current = null
    })
    return p
  }, [fetchConversations])

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
      const [{ data: listing }, { data: seller }] = await Promise.all([
        supabase
          .from('listings')
          .select('id, title, price, status, user_id')
          .eq('id', listingId)
          .single(),
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <p>{f.loadingMessages}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-6">{f.messagesTitle}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh] md:h-[600px]">
          {/* Conversations List */}
          <Card
            className={`${
              showThreadPane ? 'hidden md:flex' : 'flex'
            } flex-col md:col-span-1 overflow-hidden`}
          >
            <div className="p-4 border-b">
              <h2 className="font-semibold">{f.conversationsTitle}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                currentUserId={user?.id ?? ''}
                selectedId={selectedId}
                loadError={loadError}
                onSelect={selectConversation}
              />
            </div>
          </Card>

          {/* Chat Area */}
          <Card
            className={`${
              showThreadPane ? 'flex' : 'hidden md:flex'
            } flex-col md:col-span-2 overflow-hidden`}
          >
            {selectedConversation || pending ? (
              <MessageThread
                conversation={selectedConversation}
                pending={selectedConversation ? null : pending}
                currentUserId={user?.id ?? ''}
                messages={messages}
                onBack={backToList}
                onSent={handleSent}
                onConversationCreated={handleConversationCreated}
              />
            ) : pendingError ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 px-6 text-center">
                Este anuncio ya no está disponible o no se pudo iniciar la conversación.
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                {f.selectConversation}
              </div>
            )}
          </Card>
        </div>
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
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto px-4 py-6">
            <p>{f.loadingMessages}</p>
          </div>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  )
}
