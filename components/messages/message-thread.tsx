'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Archive, ArchiveRestore, Ban, ChevronLeft, Flag, MoreVertical } from 'lucide-react'
import { MessageComposer } from '@/components/messages/message-composer'
import { formatPrice } from '@/lib/messages/format-price'
import {
  dayKey,
  formatDayLabel,
  formatMessageTime,
} from '@/lib/messages/format-time'
import {
  isArchivedFor,
  type Conversation,
  type ConversationListing,
  type Message,
  type PendingThread,
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
  /** The thread was archived (or unarchived): refetch + leave it. */
  onArchived: () => void
  /** The other user was blocked: refetch + leave the thread. */
  onBlocked: () => void
}

const LISTING_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  sold: 'Vendido',
  inactive: 'Inactivo',
}

// Step 4 report reasons — the value is the suffix of the stored
// report type (`message_<value>`, see the report route).
const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Acoso' },
  { value: 'scam', label: 'Fraude o estafa' },
  { value: 'offensive', label: 'Contenido ofensivo' },
  { value: 'other', label: 'Otro motivo' },
] as const

type MessageGroup = {
  day: string
  senderId: string
  messages: Message[]
}

/**
 * Consecutive messages from the same sender on the same day render
 * as one group: tight gaps inside, avatar once (received side,
 * on the last bubble), a day separator when the day changes.
 * Pure function of the message list — computed during render.
 */
function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  for (const message of messages) {
    const day = dayKey(message.created_at)
    const last = groups[groups.length - 1]
    if (last && last.day === day && last.senderId === message.sender_id) {
      last.messages.push(message)
    } else {
      groups.push({ day, senderId: message.sender_id, messages: [message] })
    }
  }
  return groups
}

/**
 * Messaging v2 design overhaul — the open thread: header (avatar,
 * name, listing strip), grouped bubbles, composer. Auto-scrolls to
 * the bottom on first load, and on new messages only when the user
 * is already near the bottom, so reading older messages is never
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
 *
 * Step 4 — the header menu: Archivar/Desarchivar (per-participant,
 * hides the thread from the caller's list), Bloquear (hides the
 * thread and the database triggers refuse new threads and sends
 * from the blocked user), Reportar (stores a report for the
 * superadmin inbox; the thread stays readable). Menu state is
 * local; the page remounts this component per thread (key), so
 * switching threads resets the menu, the confirm panel and the
 * report form without syncing state in an effect.
 */
export function MessageThread({
  conversation,
  pending,
  currentUserId,
  messages,
  onBack,
  onSent,
  onConversationCreated,
  onArchived,
  onBlocked,
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

  // Step 4 menu state.
  const [menuOpen, setMenuOpen] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportReason, setReportReason] = useState('spam')
  const [reportDescription, setReportDescription] = useState('')
  const [reportDone, setReportDone] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  // The user on the other side — for a real thread from the row,
  // for a pending thread the seller from the Contactar lookup.
  const otherUserId = conversation
    ? conversation.buyer_id === currentUserId
      ? conversation.seller_id
      : conversation.buyer_id
    : (pending?.sellerId ?? null)

  const handleArchive = async () => {
    if (!conversation) return
    setMenuOpen(false)
    setActionError('')
    setActionBusy(true)
    try {
      const res = await fetch(
        `/api/messages/conversations/${conversation.id}/archive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            archived: !isArchivedFor(conversation, currentUserId),
          }),
        }
      )
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setActionError(
          json?.error === 'migration_pending'
            ? 'Esta función aún no está disponible.'
            : 'No se pudo archivar. Inténtalo de nuevo.'
        )
        return
      }
      onArchived()
    } catch {
      setActionError('No se pudo archivar. Inténtalo de nuevo.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleBlock = async () => {
    if (!otherUserId) return
    setActionError('')
    setActionBusy(true)
    try {
      const res = await fetch('/api/messages/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: otherUserId }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setActionError(
          json?.error === 'migration_pending'
            ? 'Esta función aún no está disponible.'
            : 'No se pudo bloquear. Inténtalo de nuevo.'
        )
        return
      }
      setShowBlockConfirm(false)
      onBlocked()
    } catch {
      setActionError('No se pudo bloquear. Inténtalo de nuevo.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleReport = async () => {
    if (!conversation) return
    setActionError('')
    setActionBusy(true)
    try {
      const res = await fetch(
        `/api/messages/conversations/${conversation.id}/report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: reportReason,
            description: reportDescription.trim() || null,
          }),
        }
      )
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setActionError(
          json?.error === 'migration_pending'
            ? 'Esta función aún no está disponible.'
            : 'No se pudo enviar el reporte. Inténtalo de nuevo.'
        )
        return
      }
      setReportDone(true)
    } catch {
      setActionError('No se pudo enviar el reporte. Inténtalo de nuevo.')
    } finally {
      setActionBusy(false)
    }
  }

  const groups = groupMessages(messages)

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
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="md:hidden -ml-1 p-1 text-gray-500 hover:text-gray-900"
            aria-label="Volver a conversaciones"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Avatar className="h-10 w-10">
            {headerUser?.avatar_url && (
              <AvatarImage src={headerUser.avatar_url} alt={headerUser.display_name} />
            )}
            <AvatarFallback>
              {headerUser?.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{headerUser?.display_name}</p>
            {pending && (
              <p className="text-sm text-gray-500 truncate">
                Escribe tu primer mensaje para iniciar la conversación
              </p>
            )}
          </div>

          {/* Step 4 menu: archivar, bloquear, reportar. A pending
              thread has no row to archive or report, so it only
              offers blocking the seller. */}
          {headerUser && (
            <div className="relative ml-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((v) => !v)
                  setActionError('')
                }}
                aria-label="Más opciones"
                className="p-2 text-gray-500 hover:text-gray-900"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Cerrar menú"
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                    {conversation && (
                      <button
                        type="button"
                        onClick={() => void handleArchive()}
                        disabled={actionBusy}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {isArchivedFor(conversation, currentUserId) ? (
                          <>
                            <ArchiveRestore className="h-4 w-4 shrink-0" />
                            Desarchivar conversación
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4 shrink-0" />
                            Archivar conversación
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowReportForm(false)
                        setShowBlockConfirm(true)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Ban className="h-4 w-4 shrink-0" />
                      Bloquear a {headerUser.display_name}
                    </button>
                    {conversation && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          setShowBlockConfirm(false)
                          setShowReportForm(true)
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Flag className="h-4 w-4 shrink-0" />
                        Reportar conversación
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
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

      {/* Step 4 inline panels: block confirm and report form. They
          sit under the header so the thread stays visible behind
          them; reporting never hides the thread. */}
      {showBlockConfirm && headerUser && (
        <div className="shrink-0 border-b bg-gray-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-900">
            ¿Bloquear a {headerUser.display_name}?
          </p>
          <p className="mt-1 text-sm text-gray-500">
            No podrán enviarte mensajes y la conversación se ocultará.
            Puedes desbloquearlo cuando quieras desde la lista de bloqueados.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void handleBlock()}
              disabled={actionBusy}
              className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Bloquear
            </button>
            <button
              type="button"
              onClick={() => setShowBlockConfirm(false)}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showReportForm && conversation && (
        <div className="shrink-0 border-b bg-gray-50 px-4 py-3">
          {reportDone ? (
            <>
              <p className="text-sm font-medium text-gray-900">Reporte enviado.</p>
              <p className="mt-1 text-sm text-gray-500">
                Gracias — lo revisaremos pronto. La conversación sigue disponible.
              </p>
              <button
                type="button"
                onClick={() => setShowReportForm(false)}
                className="mt-3 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900">Reportar conversación</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.value}
                    type="button"
                    onClick={() => setReportReason(reason.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      reportReason === reason.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Cuéntanos qué pasó (opcional)"
                rows={3}
                maxLength={1000}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleReport()}
                  disabled={actionBusy}
                  className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Enviar reporte
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {actionError && (
        <div className="shrink-0 border-b bg-red-50 px-4 py-2">
          <p className="text-xs text-red-600">{actionError}</p>
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {groups.map((group, groupIndex) => {
            const isMine = group.senderId === currentUserId
            const showDaySeparator =
              groupIndex === 0 || groups[groupIndex - 1].day !== group.day
            return (
              <div key={`${group.day}-${group.senderId}-${group.messages[0].id}`}>
                {showDaySeparator && (
                  <div className="mb-4 flex justify-center">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                      {formatDayLabel(group.messages[0].created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex flex-col gap-1 ${
                    isMine ? 'items-end' : 'items-start'
                  }`}
                >
                  {group.messages.map((message, messageIndex) => {
                    const isLast = messageIndex === group.messages.length - 1
                    return (
                      <div
                        key={message.id}
                        className={`flex w-full ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isMine && (
                          <span
                            className={`mr-2 shrink-0 self-end ${
                              isLast ? '' : 'invisible'
                            }`}
                          >
                            <Avatar className="h-8 w-8">
                              {headerUser?.avatar_url && (
                                <AvatarImage
                                  src={headerUser.avatar_url}
                                  alt={headerUser.display_name}
                                />
                              )}
                              <AvatarFallback>
                                {headerUser?.display_name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </span>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                            isMine
                              ? 'rounded-br-md bg-gray-900 text-white'
                              : 'rounded-bl-md bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="break-words text-[15px] leading-snug">
                            {message.content}
                          </p>
                          <p
                            className={`mt-0.5 text-right text-[11px] ${
                              isMine ? 'text-white/60' : 'text-gray-400'
                            }`}
                          >
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
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
