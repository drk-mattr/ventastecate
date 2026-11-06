'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft } from 'lucide-react'
import { MessageComposer } from '@/components/messages/message-composer'
import { formatPrice } from '@/lib/messages/format-price'
import type {
  Conversation,
  ConversationListing,
  Message,
  PendingThread,
} from '@/lib/messages/types'

type MessageThreadProps = {
  /** The open thread. Null while a pending thread is shown. */
  conversation: Conversation | null
  /** Contactar was tapped: no thread row exists yet. */
  pending: PendingThread | null
  currentUserId: string
  messages: Message[]
  onBack: () => void
  onSent: (message: Message) => void
  onConversationCreated: (conversation: Conversation) => void
}

const LISTING_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  sold: 'Vendido',
  inactive: 'Inactivo',
}

/**
 * Messaging v2 Step 3 — the open thread: header (avatar, name,
 * listing strip), scrollable bubbles, composer. Auto-scrolls to the
 * bottom on first load, and on new messages only when the user is
 * already near the bottom, so reading older messages is never
 * yanked away by an incoming one.
 *
 * Listing strip (Step 3): thumbnail, title as a link, MXN price
 * and status — so the thread always shows what the conversation is
 * about. When the listing is gone (migration 030, ON DELETE SET
 * NULL), the strip shows the title snapshot plus "Este anuncio ya
 * no está disponible" and the thread stays readable.
 *
 * Pending mode: Contactar opened /messages?listing&seller without
 * creating a thread. The composer creates it with the first send.
 */
export function MessageThread({
  conversation,
  pending,
  currentUserId,
  messages,
  onBack,
  onSent,
  onConversationCreated,
}: MessageThreadProps) {
  const otherUser =
    conversation?.buyer_id === currentUserId ? conversation.seller : conversation?.buyer
  const pendingSeller = pending?.seller ?? null
  const headerUser = otherUser ?? pendingSeller

  // The listing, live or snapshotted. A pending thread always has
  // the live listing; a real thread has it unless it was deleted.
  const listing: ConversationListing | null =
    conversation?.listing ?? pending?.listing ?? null
  const listingTitle =
    listing?.title ?? conversation?.listing_title ?? pending?.listing.title ?? null

  const scrollRef = useRef<HTMLDivElement>(null)
  const firstLoadRef = useRef(true)

  useEffect(() => {
    firstLoadRef.current = true
  }, [conversation?.id, pending?.listingId])

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
            {headerUser?.avatar_url && (
              <AvatarImage src={headerUser.avatar_url} alt={headerUser.display_name} />
            )}
            <AvatarFallback>
              {headerUser?.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{headerUser?.display_name}</p>
            {pending && (
              <p className="text-sm text-gray-500 truncate">
                Escribe tu primer mensaje para iniciar la conversación
              </p>
            )}
          </div>
        </div>

        {/* Listing strip */}
        {listing ? (
          <Link
            href={`/listings/${listing.id}`}
            className="mt-3 flex items-center gap-3 rounded-xl bg-gray-50 p-2 hover:bg-gray-100"
          >
            {listing.image_url && (
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={listing.image_url}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">
                {listing.title}
              </span>
              <span className="block text-xs text-gray-500">
                {formatPrice(listing.price)}
                {listing.status
                  ? ` · ${LISTING_STATUS_LABELS[listing.status] ?? listing.status}`
                  : ''}
              </span>
            </span>
          </Link>
        ) : (
          <div className="mt-3 rounded-xl bg-gray-50 p-3">
            <p className="truncate text-sm font-medium text-gray-900">
              {listingTitle ?? 'Anuncio no disponible'}
            </p>
            <p className="text-xs text-gray-500">Este anuncio ya no está disponible</p>
          </div>
        )}
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

      <MessageComposer
        conversationId={conversation?.id}
        pending={
          pending
            ? {
                listingId: pending.listingId,
                sellerId: pending.sellerId,
                listingTitle: pending.listing.title,
              }
            : undefined
        }
        onSent={onSent}
        onConversationCreated={onConversationCreated}
      />
    </>
  )
}
