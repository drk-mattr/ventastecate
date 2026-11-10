'use client'

import {
  LANE_LABELS,
  type BorderDirection,
  type BorderEstimate,
  type BorderLane,
} from '@/lib/border/estimate'
import { laneCellDisplay } from '@/lib/border/lane-cell'
import type { DirectionFilter, LaneFilter } from '@/components/border/border-feed'

// La Garita restructure — the answer as ONE compact table
// (3 rows, A EUA only) instead of six stacked cards. Same
// numbers, same sources, same ladder — only the container
// changes: ~200 px tall instead of ~950 px on a phone, so the
// feed starts on the first screen.
//
// The A México column was dropped 2026-11-09: there is no
// official southbound source anywhere (CBP measures northbound
// only) and zero southbound community reports have ever existed,
// so it was three rows of "sin datos" nobody reads. Southbound
// reporting still works and still shows in the feed via its
// direction chip — only the table column is gone.
//
// The table is also the feed's filter: tapping a cell sets the
// feed filter to that lane + direction; tapping a lane name
// filters by the lane only. The feed's own chips stay the other
// control (and the way to clear a filter: Todos / Ambas).

const LANES: BorderLane[] = ['auto', 'peatonal', 'comercial']
const DIRECTIONS: BorderDirection[] = ['norte']

export type LaneSummaryCell = {
  lane: BorderLane
  direction: BorderDirection
  estimate: BorderEstimate
}

export function BorderLaneSummary({
  cells,
  laneFilter,
  directionFilter,
  onFilterChange,
}: {
  cells: LaneSummaryCell[]
  laneFilter: LaneFilter
  directionFilter: DirectionFilter
  onFilterChange: (lane: LaneFilter, direction: DirectionFilter) => void
}) {
  const estimateFor = (lane: BorderLane, direction: BorderDirection): BorderEstimate | undefined =>
    cells.find((c) => c.lane === lane && c.direction === direction)?.estimate

  return (
    <div>
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th scope="col" className="w-[86px] px-3 py-2">
                <span className="sr-only">Carril</span>
              </th>
              <th scope="col" className="px-3 py-2 text-xs font-semibold text-gray-900">
                A EUA
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {LANES.map((lane) => (
              <tr key={lane}>
                <th scope="row" className="px-3 py-2 text-left align-top">
                  <button
                    type="button"
                    onClick={() => onFilterChange(lane, 'all')}
                    aria-pressed={laneFilter === lane && directionFilter === 'all'}
                    className="text-left text-xs font-semibold text-gray-900 hover:underline"
                  >
                    {LANE_LABELS[lane]}
                  </button>
                </th>
                {DIRECTIONS.map((direction) => {
                  const estimate = estimateFor(lane, direction)
                  if (!estimate) return <td key={direction} className="px-3 py-2" />
                  const display = laneCellDisplay(
                    estimate,
                    direction,
                    lane === 'auto' && direction === 'norte',
                  )
                  const active =
                    (laneFilter === 'all' || laneFilter === lane) &&
                    (directionFilter === 'all' || directionFilter === direction) &&
                    !(laneFilter === 'all' && directionFilter === 'all')
                  return (
                    <td key={direction} className="p-0 align-top">
                      <button
                        type="button"
                        onClick={() => onFilterChange(lane, direction)}
                        aria-pressed={active}
                        className={`block w-full px-3 py-2 text-left ${
                          active ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={
                            display.minutesTone === 'big'
                              ? 'text-lg font-bold leading-tight text-gray-900'
                              : display.minutesTone === 'small'
                                ? 'text-sm font-semibold leading-tight text-gray-900'
                                : 'text-sm font-medium leading-tight text-gray-400'
                          }
                        >
                          {display.minutesLabel}
                          {display.counting && (
                            <span className="ml-1.5 text-xs font-medium text-gray-500">
                              y contando
                            </span>
                          )}
                        </span>
                        {display.sourceLine && (
                          <span className="mt-0.5 block text-[11px] leading-tight text-gray-500">
                            {display.sourceLine}
                          </span>
                        )}
                        {display.extraLines.map((line) => (
                          <span
                            key={line}
                            className="mt-0.5 block text-[11px] leading-tight text-gray-500"
                          >
                            {line}
                          </span>
                        ))}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
