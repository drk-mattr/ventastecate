'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useAuthModal } from '@/lib/auth/auth-modal-context'
import { useReportModal } from '@/lib/report/report-modal-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import {
  Check, Flag, Home, LogOut, MessageCircle, PenLine, Search, Settings,
  Store, Tag, User, UserCircle, X,
} from 'lucide-react'

// Mobile sidebar, in the style of the Muse app's own sidebar: a black
// panel sliding in from the left, small-caps section labels, icon rows,
// the current page as a filled pill, and a bottom bar with settings,
// a Search pill and an orange compose button.
//
// It replaces the old white right-side drawer (MobileMenuDrawer +
// AccountMenuContent, deleted with this change). The push-and-scale
// effect the Muse app has — the main content shrinking aside with
// rounded corners — is intentionally NOT copied: our header and bottom
// bar are fixed, and transforming the app shell would break them. The
// panel dims the content behind it instead.
//
// One drawer for everything: the header hamburger, the avatar and the
// bottom-bar Cuenta tab all open this same sidebar.
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { user, profile, stores, activeStore, setActiveStore, signOut, recentStoreIds } = useAuth()
  const { openAuth } = useAuthModal()
  const { openReport } = useReportModal()
  const t = useTranslations()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  // Same store surfacing rule as the old account menu: active store
  // first, then most-recently-used, cap at 4 with the rest behind a link.
  const VISIBLE_STORES = 4
  const recentRank = (id: string) => {
    const i = recentStoreIds.indexOf(id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  const sortedStores = [...stores].sort((a, b) => {
    if (activeStore) {
      if (a.id === activeStore.id) return -1
      if (b.id === activeStore.id) return 1
    }
    return recentRank(a.id) - recentRank(b.id)
  })
  const visibleStores = sortedStores.slice(0, VISIBLE_STORES)
  const hiddenStoreCount = stores.length - visibleStores.length

  const rowClass = (href: string) =>
    `flex items-center gap-3 px-4 h-12 text-[15px] rounded-full transition-colors ${
      isActive(href) ? 'bg-white/10 text-white font-medium' : 'text-zinc-300 hover:bg-white/5'
    }`

  const actionRowClass =
    'flex w-full items-center gap-3 px-4 h-12 text-[15px] text-zinc-300 hover:bg-white/5 rounded-full transition-colors'

  return (
    <div className="md:hidden">
      {/* Backdrop — dims the content behind, like the Muse app does */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className={`fixed top-0 left-0 z-[70] flex h-full w-[85vw] max-w-[340px] flex-col bg-black text-white shadow-xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-1 shrink-0">
          <span className="font-forum font-bold lowercase text-2xl">ventastecate.com</span>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1 -mr-1 text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-3 px-5 py-3 shrink-0">
            <span className="relative h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium overflow-hidden shrink-0">
              {activeStore ? (
                activeStore.avatar_url ? (
                  <Image src={activeStore.avatar_url} alt={activeStore.name} fill className="object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-zinc-400" />
                )
              ) : profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
              ) : (
                profile?.display_name?.slice(0, 2).toUpperCase() ?? 'U'
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {activeStore ? activeStore.name : profile?.display_name}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {activeStore ? t.nav.storeMode : `@${profile?.username}`}
              </span>
            </span>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-4 pt-4 pb-1 text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Explorar</p>
          <Link href="/" onClick={onClose} className={rowClass('/')}>
            <Home className="h-5 w-5 text-zinc-400" />Inicio
          </Link>
          <Link href="/businesses" onClick={onClose} className={rowClass('/businesses')}>
            <Store className="h-5 w-5 text-zinc-400" />Negocios
          </Link>
          <Link href="/search" onClick={onClose} className={rowClass('/search')}>
            <Search className="h-5 w-5 text-zinc-400" />Buscar
          </Link>
          {user && (
            <Link href="/messages" onClick={onClose} className={rowClass('/messages')}>
              <MessageCircle className="h-5 w-5 text-zinc-400" />Mensajes
            </Link>
          )}

          {user ? (
            <>
              <div className="mx-4 my-3 border-t border-white/10" />
              <p className="px-4 pt-1 pb-1 text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Mi cuenta</p>
              <Link href={`/users/${profile?.username}`} onClick={onClose} className={rowClass(`/users/${profile?.username}`)}>
                <UserCircle className="h-5 w-5 text-zinc-400" />{t.nav.myProfile}
              </Link>
              <button
                type="button"
                onClick={() => { setActiveStore(null); onClose() }}
                className={`${actionRowClass} justify-between`}
              >
                <span className="flex items-center gap-3"><User className="h-5 w-5 text-zinc-400" />{t.nav.publishAs}</span>
                {!activeStore && <Check className="h-4 w-4 text-white" />}
              </button>
              <Link href="/my-listings" onClick={onClose} className={rowClass('/my-listings')}>
                <Tag className="h-5 w-5 text-zinc-400" />{t.nav.myListings}
              </Link>
              <Link href="/profile/edit" onClick={onClose} className={rowClass('/profile/edit')}>
                <Settings className="h-5 w-5 text-zinc-400" />{t.nav.settings}
              </Link>
              {(profile as unknown as { is_superadmin?: boolean })?.is_superadmin && (
                <Link href="/admin/reports" onClick={onClose} className={rowClass('/admin/reports')}>
                  <Flag className="h-5 w-5 text-zinc-400" />Reportes (admin)
                </Link>
              )}

              <div className="mx-4 my-3 border-t border-white/10" />
              <p className="px-4 pt-1 pb-1 text-[11px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-1.5">
                <Store className="h-3 w-3" />{t.nav.myStores}
              </p>
              {visibleStores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => { setActiveStore(store); onClose() }}
                  className={`${actionRowClass} justify-between`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                      {store.avatar_url ? (
                        <Image src={store.avatar_url} alt={store.name} width={24} height={24} className="h-6 w-6 object-cover" />
                      ) : (
                        <Store className="h-3.5 w-3.5 text-zinc-400" />
                      )}
                    </span>
                    <span className="truncate">{store.name}</span>
                  </span>
                  {activeStore?.id === store.id && <Check className="h-4 w-4 text-white shrink-0" />}
                </button>
              ))}
              {hiddenStoreCount > 0 && (
                <Link href="/my-stores" onClick={onClose} className={rowClass('/my-stores')}>
                  {t.nav.viewAllStores} ({stores.length})
                </Link>
              )}
              <Link href="/stores/new" onClick={onClose} className={rowClass('/stores/new')}>
                {t.nav.createStore}
              </Link>

              <div className="mx-4 my-3 border-t border-white/10" />
              <button type="button" onClick={() => { onClose(); openReport() }} className={actionRowClass}>
                <Flag className="h-5 w-5 text-zinc-400" />{t.nav.reportProblem}
              </button>
              <button type="button" onClick={() => { onClose(); signOut() }} className={actionRowClass}>
                <LogOut className="h-5 w-5 text-zinc-400" />{t.nav.logout}
              </button>
            </>
          ) : (
            <>
              <div className="mx-4 my-3 border-t border-white/10" />
              <button
                type="button"
                onClick={() => { onClose(); openAuth('login') }}
                className={actionRowClass}
              >
                <UserCircle className="h-5 w-5 text-zinc-400" />{t.nav.login}
              </button>
              <button
                type="button"
                onClick={() => { onClose(); openAuth('signup') }}
                className={actionRowClass}
              >
                <User className="h-5 w-5 text-zinc-400" />{t.nav.register}
              </button>
            </>
          )}

          <div className="mx-4 my-3 border-t border-white/10" />
          <Link href="/terms" onClick={onClose} className="block px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300">
            {t.footer.termsOfService}
          </Link>
          <Link href="/privacy" onClick={onClose} className="block px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300">
            {t.footer.privacyPolicy}
          </Link>
        </nav>

        {/* Bottom bar, like the Muse app: settings, Search pill, compose */}
        <div className="flex shrink-0 items-center gap-3 border-t border-white/10 bg-black p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {user && (
            <Link
              href="/profile/edit"
              onClick={onClose}
              aria-label={t.nav.settings}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-zinc-300 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Link>
          )}
          <Link
            href="/search"
            onClick={onClose}
            className="flex h-10 flex-1 items-center gap-2 rounded-full bg-white/10 px-4 text-sm text-zinc-400 hover:text-zinc-200"
          >
            <Search className="h-4 w-4" />Buscar
          </Link>
          <Link
            href="/listings/new"
            onClick={onClose}
            aria-label={t.nav.publish}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white shadow"
          >
            <PenLine className="h-5 w-5" />
          </Link>
        </div>
      </aside>
    </div>
  )
}
