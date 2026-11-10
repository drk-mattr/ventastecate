'use client'

import { useState } from 'react'
import {
  BorderFeed,
  type DirectionFilter,
  type FeedBorderReport,
  type LaneFilter,
} from '@/components/border/border-feed'
import {
  BorderLaneSummary,
  type LaneSummaryCell,
} from '@/components/border/border-lane-summary'
import {
  dynamicsLineParts,
  type DynamicsAggregate,
} from '@/lib/border/estimate'

// La Garita restructure — the client shell for /garita. One
// filter state, two controls: the lane table (tap a cell) and
// the feed's own chips both set the same filter, so the numbers
// and the evidence are one control, not two.
//
// Server component (page.tsx) computes everything — the six
// estimates, the dynamics aggregate, the feed posts, the user's
// votes — and this shell only holds the filter state and renders
// the table + the feed section in its own place, second on the
// page.
export function GaritaPageClient({
  cells,
  dynamics,
  feedReports,
  userVotes,
}: {
  cells: LaneSummaryCell[]
  dynamics: DynamicsAggregate
  feedReports: FeedBorderReport[]
  userVotes: Record<string, 'confirma' | 'niega'>
}) {
  const [laneFilter, setLaneFilter] = useState<LaneFilter>('all')
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')

  const onFilterChange = (lane: LaneFilter, direction: DirectionFilter) => {
    setLaneFilter(lane)
    setDirectionFilter(direction)
  }

  const dynamicsLine = dynamicsLineParts(dynamics)

  return (
    <>
      <BorderLaneSummary
        cells={cells}
        laneFilter={laneFilter}
        directionFilter={directionFilter}
        onFilterChange={onFilterChange}
      />

      {/* Dynamic details (migration 052): one quiet line under
          the table — the page's live read, in the same breath as
          the numbers. Renders only when >= 2 recent reports
          agree; otherwise it simply doesn't exist. */}
      {dynamicsLine && (
        <p className="mt-3 text-sm">
          <span className="text-gray-900">{dynamicsLine.signal}</span>
          <span className="text-gray-500"> — {dynamicsLine.meta}</span>
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-base font-semibold text-gray-900">La fila, en vivo</h2>
        <div className="mt-3">
          <BorderFeed
            reports={feedReports}
            userVotes={userVotes}
            laneFilter={laneFilter}
            directionFilter={directionFilter}
            onFilterChange={onFilterChange}
          />
        </div>
      </section>
    </>
  )
}
