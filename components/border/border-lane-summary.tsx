'use client'

import {
  LANE_LABELS,
  type BorderDirection,
  type BorderEstimate,
  type BorderLane,
  type DirectionFilter,
  type LaneFilter,
} from '@/lib/border/estimate'
import { laneCellDisplay } from '@/lib/border/lane-cell'

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
// Vertical redesign 2026-11-10: the rows went one-line (~100 px
// for the whole table). The thead ("A EUA") is gone — the page
// context is A EUA, the only direction with official data. Each
// row is minutes + short meta on one line; the CBP side-by-side
// survives as the only second line, and only on community-
// headline rows. The agreement line left the cell — the dynamics
// quiet line under the table carries agreement now.
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
          <tbody className="divide-y divide-gray-100">
            {LANES.map((lane) => (
              <tr key={lane}>
                <th scope="row" className="px-3 py-1.5 text-left align-middle">
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
                  if (!estimate) return <td key={direction} className="px-3 py-1.5" />
                  const display = laneCellDisplay(estimate, direction)
                  const active =
                    (laneFilter === 'all' || laneFilter === lane) &&
                    (directionFilter === 'all' || directionFilter === direction) &&
                    !(laneFilter === 'all' && directionFilter === 'all')
                  return (
                    <td key={direction} className="p-0 align-middle">
                      <button
                        type="button"
                        onClick={() => onFilterChange(lane, direction)}
                        aria-pressed={active}
                        className={`block w-full px-3 py-1.5 text-left ${
                          active ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={
                            display.minutesTone === 'big'
                              ? 'text-base font-bold leading-tight text-gray-900'
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
                          <span className="ml-1.5 text-[11px] leading-tight text-gray-500">
                            · {display.sourceLine}
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
