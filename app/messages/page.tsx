'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

function MessagesContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // Get query params for creating new conversation
  const listingId = searchParams.get('listing')
  const sellerId = searchParams.get('seller')

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
      // Create or get existing conversation
      createOrGetConversation(listingId, sellerId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, sellerId, user])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      // Mark messages as read
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
        buyer:buyer_id(id, username, display_name),
        seller:seller_id(id, username, display_name),
        messages(id, content, created_at, read)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    setConversations(data || [])
    setLoading(false)
  }

  const createOrGetConversation = async (listingId: string, sellerId: string) => {
    if (!user || user.id === sellerId) return

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select(`
        *,
        listing:listings(id, title),
        buyer:buyer_id(id, username, display_name),
        seller:seller_id(id, username, display_name)
      `)
      .eq('listing_id', listingId)
      .eq('buyer_id', user.id)
      .eq('seller_id', sellerId)
      .single()

    if (existing) {
      setSelectedConversation(existing)
      return
    }

    // Create new conversation
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
        buyer:buyer_id(id, username, display_name),
        seller:seller_id(id, username, display_name)
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
      
      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id)
      
      // Send email notification (async, don't wait)
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
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Mensajes</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <Card className="md:col-span-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Conversaciones</h2>
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
                  No tienes conversaciones
                </div>
              )}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar>
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
                      placeholder="Escribe un mensaje..."
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!newMessage.trim()}>
                      Enviar
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Selecciona una conversación para comenzar
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p>Cargando mensajes...</p>
        </div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
