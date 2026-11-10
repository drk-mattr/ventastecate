'use client'

import { useState } from 'react'
import {
  BorderActivityFeed,
  type ActivityEntry,
} from '@/components/border/border-activity-feed'
import {
  BorderLaneCards,
  type LaneSummaryCell,
} from '@/components/border/border-lane-cards'
import {
  dynamicsLineParts,
  type DirectionFilter,
  type DynamicsAggregate,
  type LaneFilter,
} from '@/lib/border/estimate'
import { GaritaTrafficMap } from '@/components/border/garita-traffic-map'

// La Garita restructure — the client shell for /garita. One
// filter state, two controls: the lane cards (tap a card) and
// the feed's direction dropdown both set the same filter, so
// the numbers and the evidence are one control, not two.
//
// Server component (page.tsx) computes everything — the three
// estimates, the dynamics aggregate, the activity entries, the
// user's votes, and whether the port is open — and this shell
// only holds the filter state and renders the page top to
// bottom: the three lane cards, then the map, the dynamics
// line, and the unified "Actividad" feed.
export function GaritaPageClient({
  cells,
  dynamics,
  activityEntries,
  userVotes,
  portOpen,
}: {
  cells: LaneSummaryCell[]
  dynamics: DynamicsAggregate
  activityEntries: ActivityEntry[]
  userVotes: Record<string, 'confirma' | 'niega'>
  /** Whether the port is open right now (server time,
   *  America/Tijuana, 6:00–22:00) — the cards show Cerrado
   *  outside those hours. */
  portOpen: boolean
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
      {/* The answer as 3 split cards (one per lane, A EUA
          only), above the map: the headline numbers first, each
          with its open/closed indicator. Tapping a card filters
          the feed by that lane; tapping the active card again
          clears the lane filter. */}
      <BorderLaneCards
        cells={cells}
        laneFilter={laneFilter}
        directionFilter={directionFilter}
        portOpen={portOpen}
        onFilterChange={onFilterChange}
      />

      {/* Google traffic map: live traffic colors around the port.
          Lazy-loaded; the observer fires immediately because the
          map is in view on load, so the Maps JS + key fetch now
          cost on every /garita visit. Degrades to an in-map
          message if the key is missing. */}
      <div className="mt-4">
        <GaritaTrafficMap />
      </div>

      {/* Dynamic details (migration 052): one quiet line under
          the map — the page's live read, in the same breath as
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
