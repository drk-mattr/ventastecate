'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useAuthModal } from '@/lib/auth/auth-modal-context'
import { useReportModal } from '@/lib/report/report-modal-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { HeaderSearch } from '@/components/search/header-search'
import { LocationSelector } from '@/components/layout/location-selector'
import { NotificationBell } from '@/components/layout/notification-bell'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check, Store, User, Menu, UserCircle, Tag, MessageCircle } from 'lucide-react'

export function Header() {
  const { user, profile, stores, activeStore, setActiveStore, signOut, loading, recentStoreIds } = useAuth()
  const { openAuth } = useAuthModal()
  const { openReport } = useReportModal()
  const pathname = usePathname()
  const t = useTranslations()
  const [menuOpen, setMenuOpen] = useState(false)

  // Keep the avatar dropdown clean: surface the active store + the most recent
  // few, and push the rest behind a link to the full "Mis Tiendas" page so the
  // menu never grows unbounded for power users with many stores.
  const VISIBLE_STORES = 4
  // Rank: active store first, then most-recently-used, then the rest (newest
  // creation order is already how `stores` arrives as a stable tiebreaker).
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      {/* Mobile is two rows: logo + actions on top, search full-width
          below. One row on mobile squeezed the search input to a few
          characters wide (the 2026-11-04 screenshot showed just "B").
          Desktop keeps the single row. */}
      <div className="container mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between">
        <div className="order-1 flex items-center gap-2 shrink-0">
          {/* Mobile: hamburger opens the black left sidebar (Muse-app
              style) — the same drawer the avatar and the bottom-bar
              Cuenta tab open. Desktop has no hamburger. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menú"
            className="md:hidden h-9 w-9 -ml-2 flex items-center justify-center text-gray-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="text-base sm:text-xl font-forum font-bold lowercase">
            ventastecate.com
          </Link>
          <Link href="/businesses" className="hidden sm:inline-flex text-sm font-medium text-gray-700 hover:text-gray-900">
            Negocios
          </Link>
        </div>

        {/* Search lives in the nav bar on every page, including the
            homepage — the old big hero search was removed 2026-11-04. */}
        <div className="order-3 sm:order-2 basis-full sm:basis-auto flex-1 min-w-0 mt-2 sm:mt-0">
          <Suspense fallback={<div className="flex-1 max-w-2xl mx-4" />}>
            <HeaderSearch />
          </Suspense>
        </div>

        <div className="order-2 sm:order-3 flex items-center gap-2 shrink-0">
          <LocationSelector />
          {loading ? null : user ? (
            <>
              {/* Publish CTA — same orange pill as the homepage, not an outline button,
                  so the primary action reads the same everywhere. */}
              <Button asChild size="sm" className="hidden md:inline-flex h-8 px-4 text-xs font-semibold rounded-full bg-orange-600 hover:bg-orange-700 text-white">
                <Link href="/listings/new">{t.nav.publish}</Link>
              </Button>
              {/* Quick-access icons (desktop; mobile uses the bottom action bar) */}
              <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8 text-gray-600 hover:text-gray-900" aria-label={t.nav.myListings} title={t.nav.myListings}>
                <Link href="/my-listings"><Tag className="h-[18px] w-[18px]" /></Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8 text-gray-600 hover:text-gray-900" aria-label={t.nav.messages} title={t.nav.messages}>
                <Link href="/messages"><MessageCircle className="h-[18px] w-[18px]" /></Link>
              </Button>
              <NotificationBell />
              {activeStore && (
                <span className="text-[10px] text-gray-500 hidden sm:flex items-center gap-0.5 max-w-[100px] truncate" title={activeStore.name}>
                  <Store className="h-3 w-3 shrink-0" />{activeStore.name}
                </span>
              )}
              {/* Mobile avatar removed 2026-11-05: the avatar now lives in
                  the bottom-bar Cuenta tab instead, so it isn't shown
                  three times (header, sidebar identity, tab). The
                  hamburger opens the sidebar; the desktop dropdown below
                  is unchanged. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden md:inline-flex h-8 w-8 rounded-full p-0">
                    <div className="relative h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium overflow-hidden">
                      {activeStore ? (
                        activeStore.avatar_url ? (
                          <Image
                            src={activeStore.avatar_url}
                            alt={activeStore.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Store className="h-4 w-4 text-gray-500" />
                        )
                      ) : profile?.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.display_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        profile ? getInitials(profile.display_name) : 'U'
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium">
                      {activeStore ? activeStore.name : profile?.display_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activeStore ? (
                        <span className="flex items-center gap-1"><Store className="h-3 w-3" />{t.nav.storeMode}</span>
                      ) : `@${profile?.username}`}
                    </p>
                  </div>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild className="text-xs">
                    <Link href={`/users/${profile?.username}`} className="flex items-center gap-2">
                      <UserCircle className="h-3.5 w-3.5 text-gray-400" />{t.nav.myProfile}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  {/* Personal identity — kept separate from the stores group. */}
                  <DropdownMenuItem
                    onClick={() => setActiveStore(null)}
                    className="text-xs flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-400" />{t.nav.publishAs}</span>
                    {!activeStore && <Check className="h-3.5 w-3.5" />}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase text-gray-400 font-medium flex items-center gap-1.5">
                    <Store className="h-3 w-3" />{t.nav.myStores}
                  </DropdownMenuLabel>
                  {visibleStores.map((store) => (
                    <DropdownMenuItem
                      key={store.id}
                      onClick={() => setActiveStore(store)}
                      className="text-xs flex items-center justify-between"
                    >
                      <Link href={`/stores/${store.slug}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 min-w-0 hover:underline">
                        <span className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {store.avatar_url ? (
                            <Image src={store.avatar_url} alt={store.name} width={20} height={20} className="h-5 w-5 object-cover" />
                          ) : (
                            <Store className="h-3 w-3 text-gray-400" />
                          )}
                        </span>
                        <span className="truncate">{store.name}</span>
                      </Link>
                      {activeStore?.id === store.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                  {hiddenStoreCount > 0 && (
                    <DropdownMenuItem asChild className="text-xs text-gray-500">
                      <Link href="/my-stores">{t.nav.viewAllStores} ({stores.length})</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="text-xs text-gray-500">
                    <Link href="/stores/new">{t.nav.createStore}</Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="text-xs">
                    <Link href="/businesses">Negocios</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-xs">
                    <Link href="/profile/edit">{t.nav.settings}</Link>
                  </DropdownMenuItem>
                  {(profile as unknown as { is_superadmin?: boolean })?.is_superadmin && (
                    <DropdownMenuItem asChild className="text-xs">
                      <Link href="/admin/reports">Reportes (admin)</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => openReport()} className="text-xs">
                    {t.nav.reportProblem}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()} className="text-xs">
                    {t.nav.logout}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="md:hidden" />
                  <DropdownMenuItem asChild className="text-[11px] text-gray-400 md:hidden">
                    <Link href="/terms">{t.footer.termsOfService}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-[11px] text-gray-400 md:hidden">
                    <Link href="/privacy">{t.footer.privacyPolicy}</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Desktop: inline auth buttons — open the popup over the current page */}
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openAuth('login')} className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900">
                  {t.nav.login}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openAuth('signup')} className="h-8 px-4 text-xs rounded-full">
                  {t.nav.register}
                </Button>
              </div>

              {/* Mobile menu lives in the header hamburger (left of the
                  logo) — one sidebar for logged-in and logged-out. */}
            </>
          )}
        </div>
      </div>
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
