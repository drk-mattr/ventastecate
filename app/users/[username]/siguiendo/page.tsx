import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { UserAvatar } from '@/components/ui/user-avatar'
import { FollowList } from '@/components/user/follow-list'

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, followers_count, following_count')
    .eq('username', username)
    .single()

  if (!profile) {
    notFound()
  }

  const followers = profile.followers_count || 0
  const following = profile.following_count || 0

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-5">
          <UserAvatar src={profile.avatar_url} name={profile.display_name} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold truncate">{profile.display_name}</p>
            <p className="text-sm text-gray-500 truncate">@{profile.username}</p>
          </div>
        </div>

        <div className="flex gap-6 border-b mb-5 text-sm">
          <Link
            href={`/users/${profile.username}/seguidores`}
            className="pb-2 text-gray-500 hover:text-gray-900"
          >
            Seguidores ({followers})
          </Link>
          <span className="pb-2 border-b-2 border-gray-900 font-medium -mb-px">
            Siguiendo ({following})
          </span>
        </div>

        <FollowList
          userId={profile.id}
          mode="following"
          emptyMessage="Aún no sigue a nadie"
        />
      </main>
    </div>
  )
}
