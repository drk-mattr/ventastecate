import type { AveragePoint, HourlyPoint } from '@/lib/border/estimate'
import { PORT_CLOSE_HOUR, PORT_OPEN_HOUR } from '@/lib/border/estimate'

// Today-vs-average chart for La Garita (proposal §3/§5) — the
// trust device, copied from CBP's own details page: today's line
// against the same-weekday average line. Hand-rolled SVG, no new
// dependency. Monochrome only: today is a solid gray-900 line,
// the average a dashed gray-400 line. No colored legend.
//
// X axis covers port hours (6–22); Y is minutes, 0 up to the
// highest point (at least 60), with gridlines every 30 min.

const WIDTH = 600
const HEIGHT = 220
const PAD_LEFT = 36
const PAD_RIGHT = 12
const PAD_TOP = 12
const PAD_BOTTOM = 28

function niceMax(values: number[]): number {
  const max = Math.max(60, ...values)
  return Math.ceil(max / 30) * 30
}

export function BorderChart({
  today,
  average,
  daysCollecting,
}: {
  today: HourlyPoint[]
  average: AveragePoint[]
  /** Distinct days of CBP history — the honest no-average state. */
  daysCollecting: number
}) {
  const max = niceMax([...today.map((p) => p.minutes), ...average.map((p) => p.minutes)])
  const xFor = (hour: number) =>
    PAD_LEFT +
    ((hour - PORT_OPEN_HOUR) / (PORT_CLOSE_HOUR - PORT_OPEN_HOUR)) * (WIDTH - PAD_LEFT - PAD_RIGHT)
  const yFor = (minutes: number) =>
    PAD_TOP + (1 - minutes / max) * (HEIGHT - PAD_TOP - PAD_BOTTOM)

  const line = (points: { hour: number; minutes: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(p.hour).toFixed(1)},${yFor(p.minutes).toFixed(1)}`).join(' ')

  const gridSteps: number[] = []
  for (let m = 0; m <= max; m += 30) gridSteps.push(m)

  return (
    <div>
      {today.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">Aún no hay datos de hoy.</p>
      ) : (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Espera de hoy contra un día normal"
        >
          {gridSteps.map((m) => (
            <g key={m}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yFor(m)}
                y2={yFor(m)}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 6} y={yFor(m) + 4} textAnchor="end" fontSize={11} fill="#6b7280">
                {m}
              </text>
            </g>
          ))}
          {[6, 9, 12, 15, 18, 21].map((h) => (
            <text
              key={h}
              x={xFor(h)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={11}
              fill="#6b7280"
            >
              {h}:00
            </text>
          ))}
          {average.length > 0 && (
            <path
              d={line(average)}
              fill="none"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          )}
          {today.length > 0 && (
            <>
              <path d={line(today)} fill="none" stroke="#111827" strokeWidth={2.5} />
              {today.map((p) => (
                <circle key={p.hour} cx={xFor(p.hour)} cy={yFor(p.minutes)} r={3.5} fill="#111827" />
              ))}
            </>
          )}
        </svg>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-gray-900" /> Hoy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-gray-400" /> Un
          día normal
        </span>
        {average.length === 0 && (
          <span>
            Sin promedio todavía
            {daysCollecting > 0
              ? ` — llevamos ${daysCollecting} ${daysCollecting === 1 ? 'día' : 'días'} recolectando`
              : ''}
            .
          </span>
        )}
      </div>
    </div>
  )
}
