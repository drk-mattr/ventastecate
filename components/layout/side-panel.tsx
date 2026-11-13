'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useAuthModal } from '@/lib/auth/auth-modal-context'
import { useReportModal } from '@/lib/report/report-modal-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { useUnreadMessages } from '@/lib/hooks/use-unread-messages'
import {
  Check, CircleUserRound, Clock, Flag, Home, LogOut, Mail, MessageCircle, PenLine, Settings,
  Store, Tag, TrendingUp, User, UserCircle, X,
} from 'lucide-react'

// Shared side panel, in the style of the Muse app's own sidebar: an
// orange panel (orange-600, the site accent, same as Publish),
// small-caps section labels, icon rows, the current page as a
// filled pill, and a bottom bar with settings and a white compose
// button.
//
// Secondary text and icons are white/70 so they stay legible on the
// orange; the active row pill is the darker orange-700, and the
// compose button is white with orange-600 text so it reads against
// the panel.
//
// One panel, two sides: the mobile hamburger opens it from the LEFT
// (the old MobileSidebar), the desktop avatar opens the same panel
// from the RIGHT (the avatar dropdown is gone — 2026-11-10, user
// direction: the dropdown is replaced by the sidebar drawn from the
// right edge of the browser). The content is identical on both sides:
// the same rows, store switcher, admin rows and sign-out.
//
// It replaces the old white right-side drawer (MobileMenuDrawer +
// AccountMenuContent, deleted with this change). The push-and-scale
// effect the Muse app has — the main content shrinking aside with
// rounded corners — is intentionally NOT copied: our header and bottom
// bar are fixed, and transforming the app shell would break them.
//
// Desktop (right) behaves differently from mobile (left), per the
// user's 2026-11-10 direction: NO backdrop dim — the page behind
// stays fully visible and usable — and the panel stays open until
// the user closes it with the X or the avatar again. So on the
// right there is no backdrop to click, no Escape close, and no
// body scroll lock. Mobile keeps all three: the dim, Escape, and
// the scroll lock, like the Muse app does.
//
// One drawer for everything: the header hamburger opens it from
// the left on mobile, the desktop avatar from the right.
export function SidePanel({ open, onClose, onReport, side }: { open: boolean; onClose: () => void; onReport: () => void; side: 'left' | 'right' }) {
  const pathname = usePathname()
  const { user, profile, stores, activeStore, setActiveStore, signOut, recentStoreIds } = useAuth()
  const { openAuth } = useAuthModal()
  const { openReport } = useReportModal()
  const t = useTranslations()
  // Unread thread count for the Mensajes row — the same value the
  // bottom-bar Mensajes tab shows (the bell badge is activity
  // notifications only, so one message never counts twice).
  const unreadMessages = useUnreadMessages()

  // Mobile (left) only: Escape closes, and the body scroll locks
  // while the panel is open. Desktop (right) has no backdrop and
  // stays open until the X or the avatar closes it, so neither
  // applies there.
  useEffect(() => {
    if (!open || side !== 'left') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, side])

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
      isActive(href) ? 'bg-orange-700 text-white font-medium' : 'text-white hover:bg-white/10'
    }`

  const actionRowClass =
    'flex w-full items-center gap-3 px-4 h-12 text-[15px] text-white hover:bg-white/10 rounded-full transition-colors'

  return (
    // Left panel lives below md (mobile hamburger); the right panel
    // lives at md and up (desktop avatar). Each side's trigger is
    // hidden on the other range, so only one can ever open.
    <div className={side === 'left' ? 'md:hidden' : 'hidden md:block'}>
      {/* Backdrop — mobile (left) only. It dims the content behind,
          like the Muse app does, and a tap on it closes the panel.
          Desktop (right) has no backdrop: the page stays fully
          visible and usable while the panel is open. */}
      {side === 'left' && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}

      {/* Panel — slides from the left (mobile) or the right (desktop avatar) */}
      <aside
        role="dialog"
        aria-modal={side === 'left'}
        aria-label="Menú"
        className={`fixed top-0 z-[70] flex h-full w-[85vw] max-w-[340px] flex-col bg-orange-600 text-white shadow-xl transition-transform duration-300 ease-out ${
          side === 'left' ? 'left-0' : 'right-0'
        } ${
          open ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-1 shrink-0">
          <span className="font-forum font-bold lowercase text-2xl">ventastecate.com</span>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1 -mr-1 text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-3 px-5 py-3 shrink-0">
            <span className="relative h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium overflow-hidden shrink-0">
              {activeStore ? (
                activeStore.avatar_url ? (
                  <Image src={activeStore.avatar_url} alt={activeStore.name} fill className="object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-white/70" />
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
              <span className="block truncate text-xs text-white/70">
                {activeStore ? t.nav.storeMode : `@${profile?.username}`}
              </span>
            </span>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-4 pt-4 pb-1 text-[11px] uppercase tracking-wider text-white/70 font-medium">Explorar</p>
          <Link href="/" onClick={onClose} className={rowClass('/')}>
            <Home className="h-5 w-5 text-white/70" />Inicio
          </Link>
          <Link href="/businesses" onClick={onClose} className={rowClass('/businesses')}>
            <Store className="h-5 w-5 text-white/70" />Negocios
          </Link>
          <Link href="/garita" onClick={onClose} className={rowClass('/garita')}>
            <Clock className="h-5 w-5 text-white/70" />Garita
          </Link>
          {/* Reporting on mobile: the header chip is desktop-only,
              so the sidebar carries the entry — same row style,
              closes the sidebar, opens the report dialog (guests
              get the auth modal first, via the shared opener). */}
          <button
            type="button"
            onClick={() => { onClose(); onReport() }}
            className={actionRowClass}
          >
            <PenLine className="h-5 w-5 text-white/70" />Reportar la fila
          </button>
          {user && (
            <Link href="/messages" onClick={onClose} className={rowClass('/messages')}>
              <MessageCircle className="h-5 w-5 text-white/70" />Mensajes
              {unreadMessages > 0 && (
                <span className="ml-auto h-4 min-w-4 px-1 rounded-full bg-white text-orange-700 text-[10px] font-semibold inline-flex items-center justify-center">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <>
              <div className="mx-4 my-3 border-t border-white/20" />
              <p className="px-4 pt-1 pb-1 text-[11px] uppercase tracking-wider text-white/70 font-medium">Mi cuenta</p>
              <Link href="/cuenta" onClick={onClose} className={rowClass('/cuenta')}>
                <CircleUserRound className="h-5 w-5 text-white/70" />Mi cuenta
              </Link>
              <Link href={`/users/${profile?.username}`} onClick={onClose} className={rowClass(`/users/${profile?.username}`)}>
                <UserCircle className="h-5 w-5 text-white/70" />{t.nav.myProfile}
              </Link>
              <button
                type="button"
                onClick={() => { setActiveStore(null); onClose() }}
                className={`${actionRowClass} justify-between`}
              >
                <span className="flex items-center gap-3"><User className="h-5 w-5 text-white/70" />{t.nav.publishAs}</span>
                {!activeStore && <Check className="h-4 w-4 text-white" />}
              </button>
              <Link href="/my-listings" onClick={onClose} className={rowClass('/my-listings')}>
                <Tag className="h-5 w-5 text-white/70" />{t.nav.myListings}
              </Link>
              <Link href="/profile/edit" onClick={onClose} className={rowClass('/profile/edit')}>
                <Settings className="h-5 w-5 text-white/70" />{t.nav.settings}
              </Link>
              {(profile as unknown as { is_superadmin?: boolean })?.is_superadmin && (
                <Link href="/admin/reports" onClick={onClose} className={rowClass('/admin/reports')}>
                  <Flag className="h-5 w-5 text-white/70" />Reportes (admin)
                </Link>
              )}
              {(profile as unknown as { is_superadmin?: boolean })?.is_superadmin && (
                <Link href="/admin/alerts" onClick={onClose} className={rowClass('/admin/alerts')}>
                  <Mail className="h-5 w-5 text-white/70" />Alertas (admin)
                </Link>
              )}
              {(profile as unknown as { is_superadmin?: boolean })?.is_superadmin && (
                <Link href="/admin/liquidity" onClick={onClose} className={rowClass('/admin/liquidity')}>
                  <TrendingUp className="h-5 w-5 text-white/70" />Liquidez (admin)
                </Link>
              )}

              <div className="mx-4 my-3 border-t border-white/20" />
              <p className="px-4 pt-1 pb-1 text-[11px] uppercase tracking-wider text-white/70 font-medium flex items-center gap-1.5">
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
                    <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                      {store.avatar_url ? (
                        <Image src={store.avatar_url} alt={store.name} width={24} height={24} className="h-6 w-6 object-cover" />
                      ) : (
                        <Store className="h-3.5 w-3.5 text-white/70" />
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

              <div className="mx-4 my-3 border-t border-white/20" />
              <button type="button" onClick={() => { onClose(); openReport() }} className={actionRowClass}>
                <Flag className="h-5 w-5 text-white/70" />{t.nav.reportProblem}
              </button>
              <button type="button" onClick={() => { onClose(); signOut() }} className={actionRowClass}>
                <LogOut className="h-5 w-5 text-white/70" />{t.nav.logout}
              </button>
            </>
          ) : (
            <>
              <div className="mx-4 my-3 border-t border-white/20" />
              <button
                type="button"
                onClick={() => { onClose(); openAuth('login') }}
                className={actionRowClass}
              >
                <UserCircle className="h-5 w-5 text-white/70" />{t.nav.login}
              </button>
              <button
                type="button"
                onClick={() => { onClose(); openAuth('signup') }}
                className={actionRowClass}
              >
                <User className="h-5 w-5 text-white/70" />{t.nav.register}
              </button>
            </>
          )}

          <div className="mx-4 my-3 border-t border-white/20" />
          <Link href="/terms" onClick={onClose} className="block px-4 py-2 text-xs text-white/60 hover:text-white">
            {t.footer.termsOfService}
          </Link>
          <Link href="/privacy" onClick={onClose} className="block px-4 py-2 text-xs text-white/60 hover:text-white">
            {t.footer.privacyPolicy}
          </Link>
        </nav>

        {/* Bottom bar, like the Muse app: settings, compose. The Search
            pill used to live here — it went to the same bare /search as
            the bottom-nav tab and the sidebar row, so it was deleted
            with them (2026-11-06 search rebuild). */}
        <div className="flex shrink-0 items-center gap-3 border-t border-white/20 bg-orange-700 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {user && (
            <Link
              href="/profile/edit"
              onClick={onClose}
              aria-label={t.nav.settings}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/80 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Link>
          )}
          <div className="flex-1" />
          <Link
            href="/listings/new"
            onClick={onClose}
            aria-label={t.nav.publish}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-orange-600 shadow"
          >
            <PenLine className="h-5 w-5" />
          </Link>
        </div>
      </aside>
    </div>
  )
}
