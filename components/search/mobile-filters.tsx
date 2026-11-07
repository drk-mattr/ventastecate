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

type Props = React.ComponentProps<typeof SearchFilters> & {
  activeCount?: number
}

/**
 * The single filters entry point on phones: a full-width "Filtros"
 * button that opens the filters in a dialog (bottom sheet), instead of
 * taking up vertical space above the results. Closes automatically
 * when filters are applied or cleared. The count badge shows how many
 * filters are active without opening it. Desktop shows the same panel
 * inline in the search-page sidebar instead of this button.
 */
export function MobileFilters({ activeCount = 0, ...props }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden mb-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-center gap-2 h-10">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeCount > 0 && (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center">
                {activeCount}
              </span>
            )}
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
