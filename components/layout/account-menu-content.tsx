'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth/auth-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { useReportModal } from '@/lib/report/report-modal-context'
import { Check, Store, User, UserCircle } from 'lucide-react'

// The account menu body, shared by the header avatar drawer and the
// bottom-bar Cuenta tab: one menu, one source of truth. Previously the
// drawer body lived only in header.tsx, so the bottom tab couldn't open
// it and went to /my-listings instead — a user tapping "Cuenta" expects
// their account, not their listings.
export function AccountMenuContent({ onNavigate }: { onNavigate: () => void }) {
  const { profile, stores, activeStore, setActiveStore, signOut, recentStoreIds } = useAuth()
  const { openReport } = useReportModal()
  const t = useTranslations()

  // Same surfacing rule as the header dropdown: active store first,
  // then most-recently-used, cap at 4 with the rest behind a link.
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

  return (
    <>
      <div className="px-3 py-2">
        <p className="text-sm font-medium">{activeStore ? activeStore.name : profile?.display_name}</p>
        <p className="text-xs text-gray-500">{activeStore ? t.nav.storeMode : `@${profile?.username}`}</p>
      </div>
      <div className="my-1 border-t border-gray-100" />
      <Link href={`/users/${profile?.username}`} onClick={onNavigate} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-md hover:bg-gray-50">
        <UserCircle className="h-4 w-4 text-gray-400" />{t.nav.myProfile}
      </Link>
      <button
        type="button"
        onClick={() => { setActiveStore(null); onNavigate() }}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm rounded-md hover:bg-gray-50"
      >
        <span className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" />{t.nav.publishAs}</span>
        {!activeStore && <Check className="h-4 w-4" />}
      </button>
      <div className="my-1 border-t border-gray-100" />
      <p className="px-3 pt-1 pb-1 text-[10px] uppercase text-gray-400 font-medium flex items-center gap-1.5">
        <Store className="h-3 w-3" />{t.nav.myStores}
      </p>
      {visibleStores.map((store) => (
        <button
          key={store.id}
          type="button"
          onClick={() => { setActiveStore(store); onNavigate() }}
          className="flex w-full items-center justify-between px-3 py-2.5 text-sm rounded-md hover:bg-gray-50"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
              {store.avatar_url ? (
                <Image src={store.avatar_url} alt={store.name} width={20} height={20} className="h-5 w-5 object-cover" />
              ) : (
                <Store className="h-3 w-3 text-gray-400" />
              )}
            </span>
            <span className="truncate">{store.name}</span>
          </span>
          {activeStore?.id === store.id && <Check className="h-4 w-4 shrink-0" />}
        </button>
      ))}
      {hiddenStoreCount > 0 && (
        <Link href="/my-stores" onClick={onNavigate} className="block px-3 py-2.5 text-sm text-gray-500 rounded-md hover:bg-gray-50">
          {t.nav.viewAllStores} ({stores.length})
        </Link>
      )}
      <Link href="/stores/new" onClick={onNavigate} className="block px-3 py-2.5 text-sm text-gray-500 rounded-md hover:bg-gray-50">
        {t.nav.createStore}
      </Link>
      <div className="my-1 border-t border-gray-100" />
      <Link href="/businesses" onClick={onNavigate} className="block px-3 py-2.5 text-sm rounded-md hover:bg-gray-50">Negocios</Link>
      <Link href="/my-listings" onClick={onNavigate} className="block px-3 py-2.5 text-sm rounded-md hover:bg-gray-50">{t.nav.myListings}</Link>
      <Link href="/profile/edit" onClick={onNavigate} className="block px-3 py-2.5 text-sm rounded-md hover:bg-gray-50">{t.nav.settings}</Link>
      {(profile as unknown as { is_superadmin?: boolean })?.is_superadmin && (
        <Link href="/admin/reports" onClick={onNavigate} className="block px-3 py-2.5 text-sm rounded-md hover:bg-gray-50">Reportes (admin)</Link>
      )}
      <button type="button" onClick={() => { onNavigate(); openReport() }} className="block w-full text-left px-3 py-2.5 text-sm rounded-md hover:bg-gray-50">
        {t.nav.reportProblem}
      </button>
      <button type="button" onClick={() => { onNavigate(); signOut() }} className="block w-full text-left px-3 py-2.5 text-sm rounded-md hover:bg-gray-50">
        {t.nav.logout}
      </button>
      <div className="my-1 border-t border-gray-100" />
      <Link href="/terms" onClick={onNavigate} className="block px-3 py-2 text-xs text-gray-500 rounded-md hover:bg-gray-50">{t.footer.termsOfService}</Link>
      <Link href="/privacy" onClick={onNavigate} className="block px-3 py-2 text-xs text-gray-500 rounded-md hover:bg-gray-50">{t.footer.privacyPolicy}</Link>
    </>
  )
}
