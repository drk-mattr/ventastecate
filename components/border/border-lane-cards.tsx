'use client'

import {
  LANE_LABELS,
  type BorderDirection,
  type BorderEstimate,
  type BorderLane,
  type DirectionFilter,
  type LaneFilter,
} from '@/lib/border/estimate'
import { laneCardDisplay } from '@/lib/border/lane-cell'

// La Garita — the answer as 3 split cards above the map (one
// per lane: Auto general / A pie / Camiones, A EUA only),
// replacing the compact one-line table (2026-11-10). Same
// numbers, same sources, same ladder — only the container
// changes: the headline numbers sit on top of the map, and each
// card carries its open/closed indicator.
//
// The cards are also the feed's lane picker: tapping a card
// sets the feed filter to that lane + A EUA (the cards show the
// norte numbers, so they filter to norte); tapping the active
// card again clears the lane filter. The feed's direction
// dropdown stays the other control. The LANE dropdown is gone —
// the cards replaced it, and keeping both would duplicate the
// control.
//
// Open/closed: outside port hours (6:00–22:00 Tijuana) every
// card shows Cerrado + "abre 6 am"; during port hours a lane is
// closed only when CBP's own freshest snapshot says "Lanes
// Closed" (already stored by the sync, migration 049 — no new
// data). A closed card shows Cerrado INSTEAD of any minutes.
// "Update Pending" is not closed: it means CBP posted no number
// yet, and the card already shows "— sin datos".

const LANES: BorderLane[] = ['auto', 'peatonal', 'comercial']

export type LaneSummaryCell = {
  lane: BorderLane
  direction: BorderDirection
  estimate: BorderEstimate
}

function LaneCardContent({
  lane,
  estimate,
  portOpen,
}: {
  lane: BorderLane
  estimate: BorderEstimate
  portOpen: boolean
}) {
  const display = laneCardDisplay(estimate, 'norte', portOpen)
  return (
    <>
      <span className="flex items-baseline justify-between gap-1">
        <span className="truncate text-[11px] font-semibold text-gray-900">
          {LANE_LABELS[lane]}
        </span>
        {!display.closed && (
          <span className="shrink-0 text-[11px] font-medium text-gray-400">Abierto</span>
        )}
      </span>
      <span
        className={
          display.closed
            ? 'mt-1 block text-lg font-bold leading-tight text-gray-900'
            : display.minutesTone === 'big'
              ? 'mt-1 block text-lg font-bold leading-tight text-gray-900'
              : display.minutesTone === 'small'
                ? 'mt-1 block text-base font-semibold leading-tight text-gray-500'
                : 'mt-1 block text-base font-medium leading-tight text-gray-400'
        }
      >
        {display.minutesLabel}
        {display.counting && (
          <span className="ml-1 text-xs font-medium text-gray-500">y contando</span>
        )}
      </span>
      {display.closedReason === 'port' ? (
        <span className="mt-0.5 block text-[11px] leading-tight text-gray-500">abre 6 am</span>
      ) : (
        <>
          {display.sourceLine && (
            <span className="mt-0.5 block text-[11px] leading-tight text-gray-500">
              {display.sourceLine}
            </span>
          )}
          {display.lanesLine && (
            <span className="mt-0.5 block text-[11px] leading-tight text-gray-500">
              {display.lanesLine}
            </span>
          )}
          {display.cbpLine && (
            <span className="mt-0.5 block text-[11px] leading-tight text-gray-500">
              {display.cbpLine}
            </span>
          )}
        </>
      )}
    </>
  )
}

export function BorderLaneCards({
  cells,
  laneFilter,
  directionFilter,
  portOpen,
  onFilterChange,
}: {
  cells: LaneSummaryCell[]
  laneFilter: LaneFilter
  directionFilter: DirectionFilter
  /** Whether the port is open right now (server time,
   *  America/Tijuana, 6:00–22:00). */
  portOpen: boolean
  onFilterChange: (lane: LaneFilter, direction: DirectionFilter) => void
}) {
  const estimateFor = (lane: BorderLane, direction: BorderDirection): BorderEstimate | undefined =>
    cells.find((c) => c.lane === lane && c.direction === direction)?.estimate

  return (
    <div className="grid grid-cols-3 divide-x divide-gray-100 overflow-hidden rounded-xl border bg-white">
      {LANES.map((lane) => {
        const estimate = estimateFor(lane, 'norte')
        const active = laneFilter === lane
        return (
          <button
            key={lane}
            type="button"
            onClick={() =>
              active
                ? onFilterChange('all', directionFilter)
                : onFilterChange(lane, 'norte')
            }
            aria-pressed={active}
            aria-label={`${LANE_LABELS[lane]} — filtrar actividad`}
            className={`min-w-0 px-2 py-2.5 text-left ${
              active ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            {estimate ? (
              <LaneCardContent lane={lane} estimate={estimate} portOpen={portOpen} />
            ) : (
              <>
                <span className="block truncate text-[11px] font-semibold text-gray-900">
                  {LANE_LABELS[lane]}
                </span>
                <span className="mt-1 block text-base font-medium leading-tight text-gray-400">
                  — sin datos
                </span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
