import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { UserAvatar } from '@/components/ui/user-avatar'
import { HubRow, HUB_ROW_ICON_CLASS } from '@/components/cuenta/hub-row'
import { FacebookTrustItem } from '@/components/cuenta/facebook-trust-item'
import { ReportProblemRow, SignOutRow } from '@/components/cuenta/cuenta-actions'
import {
  Bookmark,
  Check,
  FileText,
  MapPin,
  Settings,
  Shield,
  Store,
  Tag,
  UserCircle,
  Users,
} from 'lucide-react'

/**
 * /cuenta — the private Account hub (OfferUp's split: Account vs
 * public profile). The bottom-nav Cuenta tab lands here; the public
 * profile stays at /users/:username.
 *
 * Identity on top, then rows with real counts: Mis anuncios,
 * Guardados, Siguiendo, Mis tiendas, Ver perfil público,
 * Configuración, Ayuda. The trust row is built ONLY from data we
 * already have — Facebook, WhatsApp, photo, sold count, active
 * count — as plain true facts. No stars, no reviews (no table
 * exists), no progress-bar theater. City is derived from the
 * user's most recent active listing; there is no profiles.location
 * column and this pass adds no migration.
 */
export default async function CuentaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/cuenta')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/profile/edit')
  }

  // Counts + derived city, in parallel. Head-only counts keep the
  // payload small; the city comes from the most recent active
  // listing (its `city` column, not the free-text location).
  const [
    { count: activeCount },
    { count: soldCount },
    { count: savedCount },
    { count: storeCount },
    { data: latestListing },
  ] = await Promise.all([
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'sold'),
    supabase
      .from('listing_saves')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id),
    supabase
      .from('listings')
      .select('city')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const active = activeCount ?? 0
  const sold = soldCount ?? 0
  const saved = savedCount ?? 0
  const stores = storeCount ?? 0
  const city = latestListing?.city || null

  const memberSince = new Date(profile.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
  })

  // Trust row — only true items. A zero is not a trust signal, so
  // sold/active lines appear only when the count is above zero.
  const trustItems: string[] = []
  if (profile.avatar_url) trustItems.push('Foto de perfil')
  if (profile.whatsapp_number) trustItems.push('WhatsApp')
  if (sold > 0) trustItems.push(`${sold} ${sold === 1 ? 'venta concretada' : 'ventas concretadas'}`)
  if (active > 0) trustItems.push(`${active} ${active === 1 ? 'anuncio activo' : 'anuncios activos'}`)

  const followers = profile.followers_count || 0
  const following = profile.following_count || 0

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6">Mi cuenta</h1>

        {/* Identity block */}
        <div className="rounded-xl border bg-white px-4 py-5 mb-4">
          <div className="flex items-center gap-4">
            <UserAvatar src={profile.avatar_url} name={profile.display_name} size="xl" />
            <div className="min-w-0">
              <p className="text-xl font-semibold truncate">{profile.display_name}</p>
              <p className="text-sm text-gray-600">@{profile.username}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                {city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {city}
                  </span>
                )}
                <span>Desde {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Trust row — plain true facts, no stars, no progress bar. */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2">
              Confianza
            </p>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              {trustItems.map((item) => (
                <li key={item} className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-gray-900" />
                  {item}
                </li>
              ))}
              <FacebookTrustItem />
              {trustItems.length === 0 && (
                <li className="text-gray-400">
                  Completa tu perfil para generar confianza.{' '}
                  <Link href="/profile/edit" className="text-gray-900 underline">
                    Editar perfil
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Account rows */}
        <div className="rounded-xl border bg-white overflow-hidden divide-y mb-4">
          <HubRow
            href="/my-listings"
            icon={<Tag className={HUB_ROW_ICON_CLASS} />}
            label="Mis anuncios"
            detail={`${active} activos · ${sold} vendidos`}
          />
          <HubRow
            href="/my-listings?tab=saved"
            icon={<Bookmark className={HUB_ROW_ICON_CLASS} />}
            label="Guardados"
            detail={saved > 0 ? `${saved}` : undefined}
          />
          <HubRow
            href={`/users/${profile.username}/siguiendo`}
            icon={<Users className={HUB_ROW_ICON_CLASS} />}
            label="Siguiendo"
            detail={`${followers} seguidores · ${following} siguiendo`}
          />
          <HubRow
            href="/my-stores"
            icon={<Store className={HUB_ROW_ICON_CLASS} />}
            label="Mis tiendas"
            detail={stores > 0 ? `${stores}` : undefined}
          />
        </div>

        <div className="rounded-xl border bg-white overflow-hidden divide-y mb-4">
          <HubRow
            href={`/users/${profile.username}`}
            icon={<UserCircle className={HUB_ROW_ICON_CLASS} />}
            label="Ver perfil público"
          />
          <HubRow
            href="/profile/edit"
            icon={<Settings className={HUB_ROW_ICON_CLASS} />}
            label="Configuración"
          />
        </div>

        {/* Help */}
        <div className="rounded-xl border bg-white overflow-hidden divide-y mb-4">
          <HubRow
            href="/terms"
            icon={<FileText className={HUB_ROW_ICON_CLASS} />}
            label="Términos"
          />
          <HubRow
            href="/privacy"
            icon={<Shield className={HUB_ROW_ICON_CLASS} />}
            label="Privacidad"
          />
          <ReportProblemRow />
        </div>

        <div className="rounded-xl border bg-white overflow-hidden divide-y">
          <SignOutRow />
        </div>
      </main>
    </div>
  )
}
