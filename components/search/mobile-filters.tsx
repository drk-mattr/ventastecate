'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SearchFilters } from '@/components/search/search-filters'

type Props = React.ComponentProps<typeof SearchFilters>

/**
 * Mobile-only entry point for search filters: a full-width "Filtros" button that
 * opens the filters in a dialog, instead of taking up vertical space above the
 * results. Closes automatically when filters are applied or cleared.
 */
export function MobileFilters(props: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden mb-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-center gap-2 h-10">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          <SearchFilters {...props} onApply={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
