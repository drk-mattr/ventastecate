// Device drafts for the posting form (P0-1).
// The form autosaves to localStorage on change (debounced) and restores
// on mount, so an accidental back swipe, a phone call, or a killed tab
// no longer wipes everything the seller typed. Photos are NOT stored
// (File objects can't serialize; previews are object URLs) — the text
// is what a draft saves. Keyed per user; versioned so a future shape
// change can ignore stale drafts instead of crashing on them.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export const DRAFT_KEY_PREFIX = 'vt_new_listing_draft_v1'
export const DRAFT_VERSION = 1
// Signed-out visitors compose under one shared guest key. When they
// sign in, the guest draft migrates onto their account key (see
// migrateGuestDraftToUser) instead of being dropped.
export const GUEST_DRAFT_KEY = `${DRAFT_KEY_PREFIX}:guest`

export function draftKeyForUser(userId: string | null | undefined): string | null {
  return userId ? `${DRAFT_KEY_PREFIX}:${userId}` : null
}

/** The storage key for this visitor: their account key, or the guest key while signed out. */
export function draftKeyFor(userId: string | null | undefined): string {
  return userId ? `${DRAFT_KEY_PREFIX}:${userId}` : GUEST_DRAFT_KEY
}

function readStoredDraft(key: string): { draft: Record<string, unknown>; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { version?: number; savedAt?: number } & Record<string, unknown>
    if (parsed.version !== DRAFT_VERSION) return null
    return { draft: parsed, savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0 }
  } catch {
    return null
  }
}

export type DraftMigrationResult = {
  /** Which draft won the migration ('none' when neither key held a draft). */
  winner: 'guest' | 'user' | 'none'
  /** The winning draft payload, or null when there was nothing to migrate. */
  draft: Record<string, unknown> | null
}

/**
 * Move a signed-out visitor's draft onto their account key after they
 * sign in. Newer wins (compared on savedAt); ties — and drafts saved
 * before savedAt existed — go to the guest draft, which was written
 * after sign-out and so is the fresher intent. The guest key is
 * removed afterwards, so a later sign-in never re-migrates stale
 * text over the account draft.
 */
export function migrateGuestDraftToUser(userId: string): DraftMigrationResult {
  const guest = readStoredDraft(GUEST_DRAFT_KEY)
  if (!guest) return { winner: 'none', draft: null }
  const userKey = draftKeyFor(userId)
  const user = readStoredDraft(userKey)
  const guestWins = !user || guest.savedAt >= user.savedAt
  const winner = guestWins ? guest : user
  try {
    localStorage.setItem(
      userKey,
      JSON.stringify({ ...winner.draft, version: DRAFT_VERSION, savedAt: winner.savedAt })
    )
  } catch {
    // Storage unavailable — the form still works, it just doesn't persist.
  }
  try {
    localStorage.removeItem(GUEST_DRAFT_KEY)
  } catch {
    // Ignore — the guest key is best-effort.
  }
  return { winner: guestWins ? 'guest' : 'user', draft: winner.draft }
}

export function useListingDraft<T extends Record<string, unknown>>(options: {
  /** Null until the user is known — nothing reads or writes before then. */
  storageKey: string | null
  /** The current form value, saved on change (debounced). */
  value: T
  /** Called once on mount with the stored draft, if one parses. */
  onRestore: (draft: T) => void
}) {
  const { storageKey, value, onRestore } = options
  const restoredRef = useRef(false)
  const [didRestore, setDidRestore] = useState(false)
  const onRestoreRef = useRef(onRestore)
  const valueRef = useRef(value)
  // Refs must not be written during render (react-hooks/refs) — keep
  // them fresh after every render instead.
  useEffect(() => {
    onRestoreRef.current = onRestore
    valueRef.current = value
  })

  // Restore once, as soon as the key is known. didRestore flips true
  // after the attempt (draft or none) so callers can run follow-ups —
  // e.g. prefilling the city only when the draft left it empty.
  // The flag is set from a microtask, not synchronously in the effect
  // body (react-hooks/set-state-in-effect): the restore reads an
  // external system (localStorage) and the flag only reports that the
  // read finished.
  useEffect(() => {
    if (!storageKey || restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { version?: number } & T
        if (parsed.version === DRAFT_VERSION) {
          onRestoreRef.current(parsed)
        } else {
          localStorage.removeItem(storageKey)
        }
      }
    } catch {
      // Corrupt draft: drop it rather than breaking the form.
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Storage unavailable — drafts simply don't persist.
      }
    }
    queueMicrotask(() => setDidRestore(true))
  }, [storageKey])

  // Autosave on change, debounced so typing doesn't hammer storage.
  // savedAt stamps each write so a later guest→user migration can
  // tell which draft is newer.
  useEffect(() => {
    if (!storageKey) return
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ ...valueRef.current, version: DRAFT_VERSION, savedAt: Date.now() }))
      } catch {
        // Storage full / unavailable — the form still works, it just
        // doesn't autosave. Never block posting on this.
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [storageKey, value])

  // Synchronous save of the current value — for the publish-time auth
  // gate, which must not lose the last keystrokes to the 400ms debounce.
  const saveDraftNow = useCallback(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...valueRef.current, version: DRAFT_VERSION, savedAt: Date.now() }))
    } catch {
      // Ignore — the draft is best-effort.
    }
  }, [storageKey])

  const clearDraft = useCallback(() => {
    if (!storageKey) return
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore — the draft is best-effort.
    }
  }, [storageKey])

  return { clearDraft, didRestore, saveDraftNow }
}
