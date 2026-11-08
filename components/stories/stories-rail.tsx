'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { compressImage } from '@/lib/images/compress'
import type { StoryWithAuthor } from '@/lib/types/database'
import { StoryViewer, type StoryAuthorGroup } from './story-viewer'
import { StoryComposer } from './story-composer'

interface StoriesRailProps {
  stories: StoryWithAuthor[]
  signedIn: boolean
  /** Signed-in user id, so the viewer can offer delete on own stories. */
  currentUserId?: string | null
}

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

export function StoriesRail({ stories, signedIn, currentUserId }: StoriesRailProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [openGroup, setOpenGroup] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Composer: picking a photo opens the full-screen canvas editor
  // (text as placeable overlays) before anything is published.
  const [pending, setPending] = useState<{ dataUrl: string; filename: string } | null>(null)

  // One circle per author, newest story first inside each group.
  const groups = useMemo<StoryAuthorGroup[]>(() => {
    const byAuthor = new Map<string, StoryAuthorGroup>()
    for (const s of stories) {
      const author = s.author
      if (!author) continue
      const existing = byAuthor.get(author.id)
      if (existing) existing.stories.push(s)
      else {
        byAuthor.set(author.id, {
          authorId: author.id,
          displayName: author.display_name || author.username,
          username: author.username,
          avatarUrl: author.avatar_url,
          stories: [s],
        })
      }
    }
    return [...byAuthor.values()]
  }, [stories])

  const handleClose = useCallback(() => setOpenGroup(null), [])

  const handleDeleted = useCallback(() => {
    setOpenGroup(null)
    router.refresh()
  }, [router])

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading || pending) return
    setUploading(true)
    setUploadError(null)
    try {
      const compressed = await compressImage(file)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read'))
        reader.readAsDataURL(compressed)
      })
      // Open the composer — nothing is published until Publicar.
      setPending({ dataUrl, filename: compressed.name })
    } catch {
      setUploadError('No se pudo publicar la historia')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const cancelPending = useCallback(() => {
    setPending(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const handlePublished = useCallback(() => {
    setPending(null)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }, [router])

  // Nothing to show: no stories and no one signed in to add one.
  if (groups.length === 0 && !signedIn) return null

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-3">
        <div
          // pt-1: the unviewed ring overhangs the circle by 4px
          // (ring-2 + ring-offset-2); without top padding the scroll
          // container clips the ring's top edge.
          className="flex gap-4 overflow-x-auto pt-1 pb-1 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {signedIn && (
            <div className="flex-none flex flex-col items-center gap-1 w-16">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Agregar historia"
                className="h-16 w-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 hover:border-gray-900 hover:text-gray-900 disabled:opacity-50"
              >
                <Plus className="h-6 w-6" />
              </button>
              <span className="text-[11px] text-gray-500 text-center leading-tight truncate w-16">
                {uploading ? 'Subiendo…' : 'Tu historia'}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}
          {groups.map((g, i) => (
            <button
              key={g.authorId}
              type="button"
              onClick={() => setOpenGroup(i)}
              className="flex-none flex flex-col items-center gap-1 w-16"
            >
              <span className="h-16 w-16 rounded-full ring-2 ring-orange-600 ring-offset-2 ring-offset-white bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-700 overflow-hidden">
                {g.avatarUrl ? (
                  <Image src={g.avatarUrl} alt={g.displayName} width={64} height={64} className="h-full w-full object-cover" />
                ) : (
                  initials(g.displayName)
                )}
              </span>
              <span className="text-[11px] text-gray-700 text-center leading-tight truncate w-16">
                {g.displayName}
              </span>
            </button>
          ))}
        </div>
        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
      </div>
      {pending && (
        <StoryComposer
          dataUrl={pending.dataUrl}
          filename={pending.filename}
          onClose={cancelPending}
          onPublished={handlePublished}
        />
      )}
      {openGroup !== null && (
        <StoryViewer
          groups={groups}
          startGroup={openGroup}
          onClose={handleClose}
          currentUserId={currentUserId}
          onStoryDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
