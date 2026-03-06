'use client'

import Link from 'next/link'
import { useBrand } from '@/lib/brand-context'
import { useTranslations } from '@/lib/hooks/use-translations'

export function Footer() {
  const brand = useBrand()
  const t = useTranslations()

  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <p>© 2026 <span className="font-semibold">{brand}</span>. {t.footer.allRightsReserved}</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              {t.footer.termsOfService}
            </Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              {t.footer.privacyPolicy}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
