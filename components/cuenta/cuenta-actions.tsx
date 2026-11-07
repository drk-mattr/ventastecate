'use client'

import { ChevronRight, Flag, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { useReportModal } from '@/lib/report/report-modal-context'
import { HUB_ROW_CLASS, HUB_ROW_ICON_CLASS } from '@/components/cuenta/hub-row'

/**
 * The two hub rows that need client hooks: reporting a problem
 * (opens the report modal) and signing out. They share the hub row
 * classes so they are indistinguishable from the Link rows.
 */
export function ReportProblemRow() {
  const { openReport } = useReportModal()

  return (
    <button type="button" onClick={() => openReport()} className={HUB_ROW_CLASS}>
      <Flag className={HUB_ROW_ICON_CLASS} />
      <span className="flex-1 text-[15px] text-gray-900">Reportar un problema</span>
      <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
    </button>
  )
}

export function SignOutRow() {
  const { signOut } = useAuth()

  return (
    <button type="button" onClick={() => void signOut()} className={HUB_ROW_CLASS}>
      <LogOut className={HUB_ROW_ICON_CLASS} />
      <span className="flex-1 text-[15px] text-gray-900">Cerrar sesión</span>
    </button>
  )
}
