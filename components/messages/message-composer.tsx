'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { messageContentSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Message } from '@/lib/messages/types'

type MessageComposerProps = {
  conversationId: string
  onSent: (message: Message) => void
}

/**
 * Messaging v2 Step 2 — the message input, split out of
 * app/messages/page.tsx. Sending is still a client-direct insert
 * into messages (no send route exists yet — Step 3 scope); the
 * inserted row is handed back to the page, which appends it
 * (deduplicated against the Realtime echo), re-orders the list and
 * fires the email notification.
 */
export function MessageComposer({ conversationId, onSent }: MessageComposerProps) {
  const { user } = useAuth()
  const t = useTranslations()
  const f = t.forms
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState('')

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
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: parsed.data,
      })
      .select()
      .single()

    if (error || !data) {
      // Keep the text in the box so the user can retry.
      setSendError('No se pudo enviar el mensaje. Inténtalo de nuevo.')
      if (error) console.error('Failed to send message:', error.message)
      return
    }

    setText('')
    onSent(data as Message)
  }

  return (
    <form onSubmit={sendMessage} className="p-4 border-t">
      {sendError && <p className="text-xs text-red-600 mb-2">{sendError}</p>}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (sendError) setSendError('')
          }}
          placeholder={f.messagePlaceholder}
          className="flex-1"
        />
        <Button type="submit" disabled={!text.trim()}>
          {f.sendMessage}
        </Button>
      </div>
    </form>
  )
}
