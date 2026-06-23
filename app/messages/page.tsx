'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft } from 'lucide-react'

function MessagesContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const t = useTranslations()
  const f = t.forms

  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const listingId = searchParams.get('listing')
  const sellerId = searchParams.get('seller')
  const conversationId = searchParams.get('conversation')

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/messages')
      return
    }
    fetchConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (listingId && sellerId && user) {
      createOrGetConversation(listingId, sellerId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, sellerId, user])

  // Deep link from email/notification: ?conversation=<id> opens that thread.
  useEffect(() => {
    if (conversationId && conversations.length > 0 && !selectedConversation) {
      const match = conversations.find((c: any) => c.id === conversationId)
      if (match) setSelectedConversation(match)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, conversations])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      markMessagesAsRead(selectedConversation.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation])

  const fetchConversations = async () => {
    if (!user) return

    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        listing:listings(id, title),
        buyer:buyer_id(id, username, display_name, avatar_url),
        seller:seller_id(id, username, display_name, avatar_url),
        messages(id, content, created_at, read)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    setConversations(data || [])
    setLoading(false)
  }

  const createOrGetConversation = async (listingId: string, sellerId: string) => {
    if (!user || user.id === sellerId) return

    const { data: existing } = await supabase
      .from('conversations')
      .select(`
        *,
        listing:listings(id, title),
        buyer:buyer_id(id, username, display_name, avatar_url),
        seller:seller_id(id, username, display_name, avatar_url)
      `)
      .eq('listing_id', listingId)
      .eq('buyer_id', user.id)
      .eq('seller_id', sellerId)
      .single()

    if (existing) {
      setSelectedConversation(existing)
      return
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
      })
      .select(`
        *,
        listing:listings(id, title),
        buyer:buyer_id(id, username, display_name, avatar_url),
        seller:seller_id(id, username, display_name, avatar_url)
      `)
      .single()

    if (newConv) {
      setSelectedConversation(newConv)
      await fetchConversations()
    }
  }

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    setMessages(data || [])
  }

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('read', false)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !user) return

    const { data } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: newMessage,
      })
      .select()
      .single()

    if (data) {
      setMessages([...messages, data])
      setNewMessage('')

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id)

      fetch('/api/send-message-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          messageId: data.id,
        }),
      }).catch(err => console.error('Failed to send email notification:', err))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p>{f.loadingMessages}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{f.messagesTitle}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh] md:h-[600px]">
          {/* Conversations List */}
          <Card className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col md:col-span-1 overflow-hidden`}>
            <div className="p-4 border-b">
              <h2 className="font-semibold">{f.conversationsTitle}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.map((conv) => {
                  const otherUser = conv.buyer_id === user?.id ? conv.seller : conv.buyer
                  const unreadCount = conv.messages?.filter(
                    (m: any) => !m.read && m.sender_id !== user?.id
                  ).length

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-4 border-b hover:bg-gray-50 text-left transition ${
                        selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <Avatar className="h-10 w-10">
                          {otherUser?.avatar_url && (
                            <AvatarImage src={otherUser.avatar_url} alt={otherUser.display_name} />
                          )}
                          <AvatarFallback>
                            {otherUser?.display_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold truncate">
                              {otherUser?.display_name}
                            </p>
                            {unreadCount > 0 && (
                              <Badge variant="default" className="ml-2">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {conv.listing?.title}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {f.noConversations}
                </div>
              )}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-col md:col-span-2 overflow-hidden`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden -ml-1 p-1 text-gray-500 hover:text-gray-900"
                      aria-label="Volver a conversaciones"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <Avatar>
                      {(selectedConversation.buyer_id === user?.id
                        ? selectedConversation.seller?.avatar_url
                        : selectedConversation.buyer?.avatar_url
                      ) && (
                        <AvatarImage
                          src={selectedConversation.buyer_id === user?.id
                            ? selectedConversation.seller?.avatar_url
                            : selectedConversation.buyer?.avatar_url}
                          alt="Avatar"
                        />
                      )}
                      <AvatarFallback>
                        {selectedConversation.buyer_id === user?.id
                          ? selectedConversation.seller?.display_name?.[0]?.toUpperCase()
                          : selectedConversation.buyer?.display_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {selectedConversation.buyer_id === user?.id
                          ? selectedConversation.seller?.display_name
                          : selectedConversation.buyer?.display_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedConversation.listing?.title}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => {
                    const isMine = message.sender_id === user?.id
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isMine
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(message.created_at).toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={f.messagePlaceholder}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!newMessage.trim()}>
                      {f.sendMessage}
                    </Button>
                  </div>
                </form>
              </>
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
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p>{f.loadingMessages}</p>
        </div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
