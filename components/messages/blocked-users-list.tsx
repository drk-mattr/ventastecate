'use client'

import { useState } from 'react'
import { Ban } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ConversationProfile } from '@/lib/messages/types'

export type BlockedUser = ConversationProfile & { blocked_at: string | null }

type BlockedUsersListProps = {
  blocked: BlockedUser[]
  loadError: boolean
  onUnblocked: (userId: string) => void
}

/**
 * Messaging v2 Step 4 — the "Bloqueados" view of the rail. Blocked
 * threads are hidden from the default and archived lists, so this
 * is where unblocking happens: one row per blocked user with a
 * Desbloquear button. Unblocking restores normal behavior — the
 * thread reappears in the default list on the next refetch.
 */
export function BlockedUsersList({ blocked, loadError, onUnblocked }: BlockedUsersListProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const unblock = async (userId: string) => {
    setBusyId(userId)
    setError('')
    try {
      const res = await fetch('/api/messages/blocks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(
          json?.error === 'migration_pending'
            ? 'Esta función aún no está disponible.'
            : 'No se pudo desbloquear. Inténtalo de nuevo.'
        )
        return
      }
      onUnblocked(userId)
    } catch {
      setError('No se pudo desbloquear. Inténtalo de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  if (loadError) {
    return (
      <div className="p-4 text-center text-red-600">
        No se pudieron cargar los usuarios bloqueados. Inténtalo de nuevo.
      </div>
    )
  }

  if (blocked.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Ban className="h-7 w-7 text-gray-400" />
        </span>
        <p className="font-semibold text-gray-900">No has bloqueado a nadie</p>
        <p className="text-sm text-gray-500">
          Cuando bloquees a alguien, aparecerá aquí y podrás desbloquearlo.
        </p>
      </div>
    )
  }

  return (
    <div>
      {error && <p className="px-4 pt-3 text-xs text-red-600">{error}</p>}
      {blocked.map((blockedUser) => (
        <div key={blockedUser.id} className="flex items-center gap-3 border-b p-3">
          <Avatar className="h-12 w-12 shrink-0">
            {blockedUser.avatar_url && (
              <AvatarImage src={blockedUser.avatar_url} alt={blockedUser.display_name} />
            )}
            <AvatarFallback>
              {blockedUser.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{blockedUser.display_name}</p>
            <p className="truncate text-sm text-gray-500">@{blockedUser.username}</p>
          </div>
          <button
            type="button"
            onClick={() => void unblock(blockedUser.id)}
            disabled={busyId === blockedUser.id}
            className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busyId === blockedUser.id ? '…' : 'Desbloquear'}
          </button>
        </div>
      ))}
    </div>
  )
}
