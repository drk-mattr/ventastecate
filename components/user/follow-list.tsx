import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserAvatar } from '@/components/ui/user-avatar'
import { FollowButton } from '@/components/user/follow-button'

type FollowPerson = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

/**
 * Follower / following list. Follows are public by RLS ("Anyone can
 * view follows"), so these pages are public too.
 *
 * Plain queries + a JS join on purpose: the follows table references
 * profiles twice (follower_id / following_id), so an embedded
 * PostgREST join needs the exact generated FK name — the two-query
 * form is immune to that lineage gap.
 */
export async function FollowList({
  userId,
  mode,
  emptyMessage,
}: {
  userId: string
  mode: 'followers' | 'following'
  emptyMessage: string
}) {
  const supabase = await createClient()

  // followers: rows where this user is followed; the other side is follower_id.
  // following: rows where this user follows; the other side is following_id.
  const otherColumn = mode === 'followers' ? 'follower_id' : 'following_id'
  const ownColumn = mode === 'followers' ? 'following_id' : 'follower_id'

  const { data: rows } = await supabase
    .from('follows')
    .select(`id, ${otherColumn}, created_at`)
    .eq(ownColumn, userId)
    .order('created_at', { ascending: false })

  // Loose record: the selected other-side column is dynamic.
  const ids = [
    ...new Set(((rows || []) as Array<Record<string, unknown>>).map((r) => r[otherColumn] as string)),
  ]

  let people: FollowPerson[] = []
  if (ids.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ids)
    const byId = new Map((data || []).map((p) => [p.id, p as FollowPerson]))
    // Keep the follows order (most recent first), drop deleted profiles.
    people = ids.map((id) => byId.get(id)).filter((p): p is FollowPerson => !!p)
  }

  if (people.length === 0) {
    return (
      <div className="rounded-xl border bg-white px-6 py-10 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ul className="rounded-xl border bg-white overflow-hidden divide-y">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3 px-4 py-3">
          <Link
            href={`/users/${person.username}`}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            <UserAvatar src={person.avatar_url} name={person.display_name} size="lg" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900">
                {person.display_name}
              </span>
              <span className="block truncate text-xs text-gray-500">@{person.username}</span>
            </span>
          </Link>
          <FollowButton profileId={person.id} />
        </li>
      ))}
    </ul>
  )
}
