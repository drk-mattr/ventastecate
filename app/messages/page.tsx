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
import type {
  Conversation,
  ConversationProfile,
  Message,
} from '@/lib/messages/types'

/**
 * Messaging v2 Step 2 — thin shell. The list, thread and composer
 * live in components/messages/; this page owns auth, the list
 * fetch, the Realtime subscriptions, URL-driven selection and the
 * Contactar (?listing&seller) flow.
 *
 * URL-driven thread: selection derives from ?conversation=<id>.
 * Tapping a row pushes the param (back returns to the list);
 * loading /messages?conversation=<id> directly opens that thread.
 * No selection state is kept — the param is the source of truth.
 *
 * Realtime (browser client, RLS-scoped to the user's own rows):
 * - messages INSERT on any thread -> list refetch (re-orders via
 *   the Step 1 updated_at trigger); conversations UPDATE -> same.
 * - messages INSERT filtered to the open thread -> append the
 *   message, deduplicated by id against the sender's own echo.
 * No polling fallback.
 */

// Rows from the Contactar embed query (FKs restored by migration
// 029) lack the route's unread_count/last_message — default them.
function normalizeConversation(row: {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  created_at: string
  updated_at: string
  listing: { id: string; title: string } | null
  buyer: ConversationProfile | null
  seller: ConversationProfile | null
}): Conversation {
  return {
    ...row,
    listing: row.listing ? { ...row.listing, image_url: null } : null,
    unread_count: 0,
    last_message: null,
  }
}

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

  const listingId = searchParams.get('listing')
  const sellerId = searchParams.get('seller')
  const conversationId = searchParams.get('conversation')

  const selectedConversation =
    conversations.find((c) => c.id === conversationId) ?? null
  const selectedId = selectedConversation?.id ?? null

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
      router.push('/login?redirect=/messages')
      return
    }
    void refreshList()
  }, [user, authLoading, refreshList, router])

  const createOrGetConversation = async (listingIdParam: string, sellerIdParam: string) => {
    if (!user || user.id === sellerIdParam) return

    // maybeSingle(): the "no existing conversation" case is normal, not an error.
    const { data: existing } = await supabase
      .from('conversations')
      .select(`
        *,
        listing:listings(id, title),
        buyer:buyer_id(id, username, display_name, avatar_url),
        seller:seller_id(id, username, display_name, avatar_url)
      `)
      .eq('listing_id', listingIdParam)
      .eq('buyer_id', user.id)
      .eq('seller_id', sellerIdParam)
      .maybeSingle()

    const openConversation = (conv: Conversation) => {
      // Make sure the thread is in the list so the URL-driven
      // selection below finds it even before the refetch lands.
      setConversations((prev) =>
        prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
      )
      router.push(`/messages?conversation=${conv.id}`)
    }

    if (existing) {
      openConversation(normalizeConversation(existing))
      return
    }

    const { data: newConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        listing_id: listingIdParam,
        buyer_id: user.id,
        seller_id: sellerIdParam,
      })
      .select(`
        *,
        listing:listings(id, title),
        buyer:buyer_id(id, username, display_name, avatar_url),
        seller:seller_id(id, username, display_name, avatar_url)
      `)
      .maybeSingle()

    if (insertError) {
      // A unique-constraint hit means a concurrent run already created it —
      // recover by re-fetching rather than dropping the user into a dead end.
      console.error('Failed to start conversation:', insertError.message)
      await refreshList()
      return
    }

    if (newConv) {
      openConversation(normalizeConversation(newConv))
      await refreshList()
    }
  }

  useEffect(() => {
    if (listingId && sellerId && user) {
      void createOrGetConversation(listingId, sellerId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, sellerId, user])

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
              selectedConversation ? 'hidden md:flex' : 'flex'
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
              selectedConversation ? 'flex' : 'hidden md:flex'
            } flex-col md:col-span-2 overflow-hidden`}
          >
            {selectedConversation ? (
              <MessageThread
                conversation={selectedConversation}
                currentUserId={user?.id ?? ''}
                messages={messages}
                onBack={backToList}
                onSent={handleSent}
              />
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
