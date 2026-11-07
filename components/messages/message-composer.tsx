'use client'

import { useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { messageContentSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  normalizeConversation,
  type ConversationEmbedRow,
} from '@/lib/messages/normalize-conversation'
import type { Conversation, Message } from '@/lib/messages/types'

/** A thread that does not exist yet — created with the first send. */
export type PendingConversation = {
  listingId: string
  sellerId: string
  listingTitle: string
}

type MessageComposerProps = {
  /** Existing thread. Exactly one of conversationId / pending is set. */
  conversationId?: string
  pending?: PendingConversation
  onSent: (message: Message) => void
  /** Fired (before onSent) when a pending send created the thread. */
  onConversationCreated?: (conversation: Conversation) => void
}

// The embed columns for the get-or-create lookup / insert return.
const CONVERSATION_EMBED = `
  *,
  listing:listings(id, title, price, status),
  buyer:buyer_id(id, username, display_name, avatar_url),
  seller:seller_id(id, username, display_name, avatar_url)
`

/**
 * Messaging v2 Step 3 — the message input, split out of
 * app/messages/page.tsx. Sending is still a client-direct insert
 * into messages (no send route exists yet).
 *
 * Pending mode (Step 3 rule — no empty threads): tapping Contactar
 * inserts NOTHING. The conversation row is created here, together
 * with the first message: look up an existing thread for this
 * listing + buyer + seller (a concurrent send may have made one),
 * otherwise insert it with the listing_title snapshot, then insert
 * the message. If the insert fails on a unique-constraint hit, a
 * concurrent run already created the thread — recover with a fresh
 * lookup instead of dropping the message.
 *
 * listing_title may not exist yet (migration 030 runs by hand after
 * deploy): if the insert errors on the unknown column, retry
 * without it. The thread still works — only the snapshot is lost.
 *
 * Step 4 — server-side enforcement lives in the database, not
 * here: BEFORE INSERT triggers (migration 031) refuse the send
 * when either participant blocked the other, or when the sender
 * is over the rate limit (10/min, 100/hour). The composer only
 * maps those coded errors to plain Spanish; the draft text stays
 * in the box so the user can retry.
 */
export function MessageComposer({
  conversationId,
  pending,
  onSent,
  onConversationCreated,
}: MessageComposerProps) {
  const { user } = useAuth()
  const t = useTranslations()
  const f = t.forms
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState('')

  const getOrCreateConversation = async (
    supabase: ReturnType<typeof createClient>
  ): Promise<Conversation | null> => {
    if (!pending || !user) return null

    // maybeSingle(): "no existing conversation" is normal, not an error.
    const { data: existing } = await supabase
      .from('conversations')
      .select(CONVERSATION_EMBED)
      .eq('listing_id', pending.listingId)
      .eq('buyer_id', user.id)
      .eq('seller_id', pending.sellerId)
      .maybeSingle()

    if (existing) return normalizeConversation(existing as ConversationEmbedRow)

    const insertBase = {
      listing_id: pending.listingId,
      buyer_id: user.id,
      seller_id: pending.sellerId,
    }

    let { data: created, error: insertError } = await supabase
      .from('conversations')
      .insert({ ...insertBase, listing_title: pending.listingTitle })
      .select(CONVERSATION_EMBED)
      .maybeSingle()

    if (insertError && /listing_title/.test(insertError.message)) {
      // Pre-migration-030 database: no listing_title column yet.
      // Retry without the snapshot rather than failing the send.
      const retry = await supabase
        .from('conversations')
        .insert(insertBase)
        .select(CONVERSATION_EMBED)
        .maybeSingle()
      created = retry.data
      insertError = retry.error
    }

    if (!insertError && created) {
      return normalizeConversation(created as ConversationEmbedRow)
    }

    if (insertError && /CONVERSATION_BLOCKED|MESSAGE_BLOCKED/.test(insertError.message)) {
      // Step 4: the other user blocked this user (or vice versa) —
      // the trigger refused the thread. Throw a coded error instead
      // of recovering, so the composer can say so plainly.
      throw new Error('CONVERSATION_BLOCKED')
    }

    // Unique-constraint hit: a concurrent send created it first.
    // Recover with a fresh lookup; anything else is a real failure.
    if (insertError) console.error('Failed to start conversation:', insertError.message)
    const { data: raced } = await supabase
      .from('conversations')
      .select(CONVERSATION_EMBED)
      .eq('listing_id', pending.listingId)
      .eq('buyer_id', user.id)
      .eq('seller_id', pending.sellerId)
      .maybeSingle()
    return raced ? normalizeConversation(raced as ConversationEmbedRow) : null
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSendError('')

    const parsed = messageContentSchema.safeParse(text)
    if (!parsed.success) {
      setSendError(parsed.error.issues[0]?.message ?? 'Mensaje inválido')
      return
    }

    const supabase = createClient()

    let targetId = conversationId
    if (pending) {
      let conversation: Conversation | null = null
      try {
        conversation = await getOrCreateConversation(supabase)
      } catch (err) {
        if (err instanceof Error && err.message === 'CONVERSATION_BLOCKED') {
          setSendError('No puedes enviar mensajes a este usuario.')
        } else {
          console.error('Failed to start conversation:', err)
          setSendError('No se pudo enviar el mensaje. Inténtalo de nuevo.')
        }
        return
      }
      if (!conversation) {
        setSendError('No se pudo enviar el mensaje. Inténtalo de nuevo.')
        return
      }
      targetId = conversation.id
      onConversationCreated?.(conversation)
    }

    if (!targetId) return

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: targetId,
        sender_id: user.id,
        content: parsed.data,
      })
      .select()
      .single()

    if (error || !data) {
      // Keep the text in the box so the user can retry. The Step 4
      // triggers refuse the insert with a coded message — map it to
      // plain Spanish instead of the generic failure.
      if (error && /MESSAGE_RATE_LIMITED/.test(error.message)) {
        setSendError(
          'Estás enviando mensajes demasiado rápido. Espera un poco e inténtalo de nuevo.'
        )
      } else if (error && /MESSAGE_BLOCKED/.test(error.message)) {
        setSendError('No puedes enviar mensajes a este usuario.')
      } else {
        setSendError('No se pudo enviar el mensaje. Inténtalo de nuevo.')
      }
      if (error) console.error('Failed to send message:', error.message)
      return
    }

    setText('')
    onSent(data as Message)
  }

  return (
    <form onSubmit={sendMessage} className="shrink-0 border-t px-4 py-3">
      <div className="mx-auto w-full max-w-2xl">
        {sendError && <p className="text-xs text-red-600 mb-2 px-1">{sendError}</p>}
        <div className="flex items-end gap-2">
          <Input
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (sendError) setSendError('')
            }}
            placeholder={f.messagePlaceholder}
            className="h-11 flex-1 rounded-full border-gray-200 bg-gray-100 px-4 text-[15px] focus-visible:ring-gray-900"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim()}
            aria-label={f.sendMessage}
            className="h-11 w-11 shrink-0 rounded-full bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </form>
  )
}
