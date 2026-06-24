'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { ReportModal } from '@/components/report/report-modal'

const ReportModalContext = createContext<{ openReport: () => void }>({ openReport: () => {} })

/** Lets any component open the report/feedback popup from anywhere. */
export function ReportModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openReport = useCallback(() => setOpen(true), [])

  return (
    <ReportModalContext.Provider value={{ openReport }}>
      {children}
      <ReportModal open={open} onOpenChange={setOpen} />
    </ReportModalContext.Provider>
  )
}

export const useReportModal = () => useContext(ReportModalContext)
