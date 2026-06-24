'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ReportForm } from './report-form'

export function ReportModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="sr-only">Reportar un problema</DialogTitle>
        <ReportForm />
      </DialogContent>
    </Dialog>
  )
}
