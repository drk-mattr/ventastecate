'use client'

import { useState } from 'react'
import {
  BorderActivityFeed,
  type ActivityEntry,
} from '@/components/border/border-activity-feed'
import {
  BorderLaneSummary,
  type LaneSummaryCell,
} from '@/components/border/border-lane-summary'
import {
  dynamicsLineParts,
  type DirectionFilter,
  type DynamicsAggregate,
  type LaneFilter,
} from '@/lib/border/estimate'
import { GaritaTrafficMap } from '@/components/border/garita-traffic-map'

// La Garita restructure — the client shell for /garita. One
// filter state, two controls: the lane table (tap a cell) and
// the feed's own chips both set the same filter, so the numbers
// and the evidence are one control, not two.
//
// Server component (page.tsx) computes everything — the three
// estimates, the dynamics aggregate, the activity entries, the
// user's votes — and this shell only holds the filter state and
// renders the page top to bottom: map first, then the compact
// table, the dynamics line, and the unified "Actividad" feed.
export function GaritaPageClient({
  cells,
  dynamics,
  activityEntries,
  userVotes,
}: {
  cells: LaneSummaryCell[]
  dynamics: DynamicsAggregate
  activityEntries: ActivityEntry[]
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
      {/* Google traffic map: live traffic colors around the port,
          first on the page. Lazy-loaded; the observer fires
          immediately because the map is in view on load, so the
          Maps JS + key fetch now cost on every /garita visit.
          Degrades to caption + link if the key is missing. */}
      <GaritaTrafficMap />

      <div className="mt-4">
        <BorderLaneSummary
          cells={cells}
          laneFilter={laneFilter}
          directionFilter={directionFilter}
          onFilterChange={onFilterChange}
        />
      </div>

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
        <h2 className="text-base font-semibold text-gray-900">Actividad</h2>
        <div className="mt-3">
          <BorderActivityFeed
            entries={activityEntries}
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
