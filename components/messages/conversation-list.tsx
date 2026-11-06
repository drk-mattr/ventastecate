'use client'

import Image from 'next/image'
import { MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTranslations } from '@/lib/hooks/use-translations'
import { formatRowTime } from '@/lib/messages/format-time'
import type { Conversation } from '@/lib/messages/types'

type ConversationListProps = {
  conversations: Conversation[]
  currentUserId: string
  selectedId: string | null
  loadError: boolean
  onSelect: (conversationId: string) => void
}

/**
 * Messaging v2 Step 2 — Messenger-style conversation rows: avatar,
 * bold name, one-line last-message preview, right-aligned time,
 * gray-900 unread count, listing title + thumbnail. Rows with
 * unread messages render name and preview darker and bolder.
 *
 * Monochrome only: the unread badge is gray-900, never orange —
 * orange-600 is Publish only.
 */
export function ConversationList({
  conversations,
  currentUserId,
  selectedId,
  loadError,
  onSelect,
}: ConversationListProps) {
  const t = useTranslations()
  const f = t.forms

  if (loadError) {
    return (
      <div className="p-4 text-center text-red-600">
        No se pudieron cargar tus conversaciones. Inténtalo de nuevo.
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <MessageCircle className="h-7 w-7 text-gray-400" />
        </span>
        <p className="font-semibold text-gray-900">{f.noConversations}</p>
        <p className="text-sm text-gray-500">
          Explora anuncios y contacta con un vendedor para empezar.
        </p>
      </div>
    )
  }

  return (
    <div>
      {conversations.map((conv) => {
        const otherUser = conv.buyer_id === currentUserId ? conv.seller : conv.buyer
        const unread = conv.unread_count ?? 0
        const preview = conv.last_message?.content ?? 'Inicia la conversación'
        // Live title, else the snapshot taken at creation (Step 3) —
        // a thread whose listing was deleted still names it.
        const listingTitle =
          conv.listing?.title ?? conv.listing_title ?? 'Anuncio no disponible'

        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv.id)}
            className={`w-full p-3 border-b hover:bg-gray-50 text-left transition flex gap-3 ${
              selectedId === conv.id ? 'bg-gray-100' : ''
            }`}
          >
            <Avatar className="h-12 w-12 shrink-0">
              {otherUser?.avatar_url && (
                <AvatarImage src={otherUser.avatar_url} alt={otherUser.display_name} />
              )}
              <AvatarFallback>
                {otherUser?.display_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className={`truncate ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                  {otherUser?.display_name}
                </p>
                {conv.last_message && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatRowTime(conv.last_message.created_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-sm truncate ${
                    unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}
                >
                  {preview}
                </p>
                {unread > 0 && (
                  <span className="shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{listingTitle}</p>
            </div>
            {conv.listing?.image_url && (
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={conv.listing.image_url}
                  alt={conv.listing.title}
                  fill
                  className="object-cover"
                />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
