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

export function draftKeyForUser(userId: string | null | undefined): string | null {
  return userId ? `${DRAFT_KEY_PREFIX}:${userId}` : null
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
  onRestoreRef.current = onRestore
  const valueRef = useRef(value)
  valueRef.current = value

  // Restore once, as soon as the key is known. didRestore flips true
  // after the attempt (draft or none) so callers can run follow-ups —
  // e.g. prefilling the city only when the draft left it empty.
  useEffect(() => {
    if (!storageKey || restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) {
        setDidRestore(true)
        return
      }
      const parsed = JSON.parse(raw) as { version?: number } & T
      if (parsed.version !== DRAFT_VERSION) {
        localStorage.removeItem(storageKey)
        setDidRestore(true)
        return
      }
      onRestoreRef.current(parsed)
    } catch {
      // Corrupt draft: drop it rather than breaking the form.
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Storage unavailable — drafts simply don't persist.
      }
    }
    setDidRestore(true)
  }, [storageKey])

  // Autosave on change, debounced so typing doesn't hammer storage.
  useEffect(() => {
    if (!storageKey) return
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ ...valueRef.current, version: DRAFT_VERSION }))
      } catch {
        // Storage full / unavailable — the form still works, it just
        // doesn't autosave. Never block posting on this.
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [storageKey, value])

  const clearDraft = useCallback(() => {
    if (!storageKey) return
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore — the draft is best-effort.
    }
  }, [storageKey])

  return { clearDraft, didRestore }
}
