'use client'

import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft } from 'lucide-react'
import { MessageComposer } from '@/components/messages/message-composer'
import type { Conversation, Message } from '@/lib/messages/types'

type MessageThreadProps = {
  conversation: Conversation
  currentUserId: string
  messages: Message[]
  onBack: () => void
  onSent: (message: Message) => void
}

/**
 * Messaging v2 Step 2 — the open thread: header (avatar, name,
 * listing), scrollable bubbles, composer. Auto-scrolls to the
 * bottom on first load, and on new messages only when the user is
 * already near the bottom, so reading older messages is never
 * yanked away by an incoming one.
 */
export function MessageThread({
  conversation,
  currentUserId,
  messages,
  onBack,
  onSent,
}: MessageThreadProps) {
  const otherUser =
    conversation.buyer_id === currentUserId ? conversation.seller : conversation.buyer
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstLoadRef = useRef(true)

  useEffect(() => {
    firstLoadRef.current = true
  }, [conversation.id])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || messages.length === 0) return
    if (firstLoadRef.current) {
      el.scrollTop = el.scrollHeight
      firstLoadRef.current = false
      return
    }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <>
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="md:hidden -ml-1 p-1 text-gray-500 hover:text-gray-900"
            aria-label="Volver a conversaciones"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Avatar>
            {otherUser?.avatar_url && (
              <AvatarImage src={otherUser.avatar_url} alt={otherUser.display_name} />
            )}
            <AvatarFallback>
              {otherUser?.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{otherUser?.display_name}</p>
            <p className="text-sm text-gray-600 truncate">{conversation.listing?.title}</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId
          return (
            <div
              key={message.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-xl px-4 py-2 ${
                  isMine ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-900'
                }`}
              >
                <p className="break-words">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${isMine ? 'text-gray-300' : 'text-gray-500'}`}
                >
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

      <MessageComposer conversationId={conversation.id} onSent={onSent} />
    </>
  )
}
