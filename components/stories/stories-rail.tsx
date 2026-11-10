'use client'

import { useCallback, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { StoryWithAuthor } from '@/lib/types/database'
import { StoryViewer, type StoryAuthorGroup } from './story-viewer'
import { AddStoryButton } from './add-story-button'

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
  const [openGroup, setOpenGroup] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

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

  // The rail renders only when a real story exists — with zero
  // stories it costs 0px (the add-story entry moves to the feed
  // header row, next to Filtros, via AddStoryButton).
  if (groups.length === 0) return null

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-2">
        <div
          // pt-1: the unviewed ring overhangs the circle by 4px
          // (ring-2 + ring-offset-2); without top padding the scroll
          // container clips the ring's top edge.
          className="flex gap-3 overflow-x-auto pt-1 pb-1 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {signedIn && <AddStoryButton variant="rail" onUploadError={setUploadError} />}
          {groups.map((g, i) => (
            <button
              key={g.authorId}
              type="button"
              onClick={() => setOpenGroup(i)}
              aria-label={`Historia de ${g.displayName}`}
              className="flex-none flex flex-col items-center w-12"
            >
              <span className="h-12 w-12 rounded-full ring-2 ring-orange-600 ring-offset-2 ring-offset-white bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-700 overflow-hidden">
                {g.avatarUrl ? (
                  <Image src={g.avatarUrl} alt={g.displayName} width={64} height={64} className="h-full w-full object-cover" />
                ) : (
                  initials(g.displayName)
                )}
              </span>
            </button>
          ))}
        </div>
        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
      </div>
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
