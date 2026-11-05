'use client'

import Link from 'next/link'
import { useBrand } from '@/lib/brand-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { useReportModal } from '@/lib/report/report-modal-context'

export function Footer() {
  const brand = useBrand()
  const t = useTranslations()
  const { openReport } = useReportModal()

  return (
    <footer className="hidden md:block border-t bg-gray-50 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <p>© 2026 <span className="font-semibold">{brand}</span>. {t.footer.allRightsReserved}</p>
          <div className="flex gap-6">
            <button type="button" onClick={openReport} className="hover:text-gray-900 transition-colors">
              {t.nav.reportProblem}
            </button>
            <Link href="/businesses" className="hover:text-gray-900 transition-colors">
              Negocios
            </Link>
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
