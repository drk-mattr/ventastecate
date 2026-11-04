'use client'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ReportForm } from './report-form'
import { useTranslations } from '@/lib/hooks/use-translations'

export function ReportModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-xl font-semibold">{t.forms.reportTitle}</DialogTitle>
        <DialogDescription className="text-sm text-gray-500">{t.forms.reportDesc}</DialogDescription>
        <ReportForm hideTitle />
      </DialogContent>
    </Dialog>
  )
}
