import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { BorderReportSheet } from '@/components/border/border-report-sheet'
import { BorderChart } from '@/components/border/border-chart'
import {
  BorderReportsList,
  type RecentBorderReport,
} from '@/components/border/border-reports-list'
import {
  DIRECTION_LABELS,
  LANE_LABELS,
  PORT_CLOSE_HOUR,
  PORT_OPEN_HOUR,
  WEEKDAY_NAMES,
  daysCollecting,
  estimateLane,
  formatAge,
  formatWait,
  hourlyToday,
  isPortOpen,
  projectionForHour,
  sameWeekdayAverage,
  tijuanaParts,
  weekAnalytics,
  type BorderDirection,
  type BorderEstimate,
  type BorderLane,
  type BorderReportInput,
  type CbpSnapshotInput,
} from '@/lib/border/estimate'

export const metadata: Metadata = {
  title: 'La garita de Tecate',
  description:
    'Tiempos de espera en la garita de Tecate: datos oficiales de CBP y reportes de la comunidad, con fuente y hora en cada número.',
}

const LANES: BorderLane[] = ['auto', 'peatonal', 'comercial']
const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function weekdayPlural(name: string): string {
  if (name === 'domingo') return 'domingos'
  if (name === 'sábado') return 'sábados'
  return name
}

type SnapshotRow = CbpSnapshotInput & { fetched_at: string }
type ReportRow = {
  id: string
  lane: BorderLane
  direction: BorderDirection
  wait_minutes: number
  status: 'en_fila' | 'ya_cruce'
  created_at: string
  user_id: string
}

type VoteRow = {
  report_id: string
  vote: 'confirma' | 'niega'
  created_at: string
}

// Reads fail soft to []: before migration 049 is applied the
// tables don't exist, and the page must show its honest empty
// state instead of crashing.
async function safeRows<T>(promise: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await promise
    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

function LaneCard({
  lane,
  direction,
  estimate,
}: {
  lane: BorderLane
  direction: BorderDirection
  estimate: BorderEstimate
}) {
  const cbp = estimate.cbp
  return (
    <article className="rounded-xl border bg-white p-4">
      <h3 className="text-[15px] font-semibold text-gray-900">
        {LANE_LABELS[lane]} — {DIRECTION_LABELS[direction]}
      </h3>

      {estimate.state === 'current' && estimate.minutes !== null && (
        <>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatWait(estimate.minutes)}
            {estimate.isCounting && (
              <span className="ml-2 text-base font-medium text-gray-500">y contando</span>
            )}
          </p>
          {estimate.source === 'community' ? (
            <p className="mt-1 text-xs text-gray-500">
              Comunidad · {formatAge(estimate.ageMinutes)} · {estimate.reportCount}{' '}
              {estimate.reportCount === 1 ? 'persona' : 'personas'}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              CBP oficial · {formatAge(estimate.ageMinutes)}
              {cbp?.lanes_open !== null && cbp?.lanes_open !== undefined
                ? ` · ${cbp.lanes_open} ${cbp.lanes_open === 1 ? 'carril abierto' : 'carriles abiertos'}`
                : ''}
            </p>
          )}
          {estimate.agreement && (
            <p className="mt-1 text-xs text-gray-500">{estimate.agreement}</p>
          )}
          {estimate.isCounting && (
            <p className="mt-1 text-xs text-gray-500">
              Gente aún en la fila — es lo que llevan esperando, no el total.
            </p>
          )}
          {estimate.ageMinutes !== null && estimate.ageMinutes >= 30 && (
            <p className="mt-1 text-xs text-gray-500">
              Último dato {formatAge(estimate.ageMinutes)} — puede haber cambiado.
            </p>
          )}
        </>
      )}

      {estimate.state === 'last-known' && estimate.minutes !== null && (
        <>
          <p className="mt-2 text-xl font-semibold text-gray-900">
            Último dato conocido: {formatWait(estimate.minutes)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {estimate.source === 'community' ? 'Comunidad' : 'CBP oficial'} ·{' '}
            {formatAge(estimate.ageMinutes)} — puede haber cambiado.
          </p>
          <p className="mt-1 text-xs text-gray-500">¿Estás en la fila? Repórtala.</p>
        </>
      )}

      {estimate.state === 'none' && (
        <>
          <p className="mt-2 text-xl font-semibold text-gray-900">Sin datos recientes</p>
          {estimate.minutes !== null ? (
            <p className="mt-1 text-xs text-gray-500">
              Último dato: {formatWait(estimate.minutes)} · {formatAge(estimate.ageMinutes)}.
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              No hay un número actual para este carril.
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">¿Estás en la fila? Repórtala.</p>
        </>
      )}

      {/* Official and community side by side, always (norte).
          Southbound has no official number anywhere — say so. */}
      {direction === 'norte' && estimate.source === 'community' && (
        <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
          {cbp && cbp.delay_minutes !== null
            ? `Oficial CBP: ${formatWait(cbp.delay_minutes)} · ${formatAge(
                estimate.cbpAgeMinutes,
              )}${
                cbp.lanes_open !== null && cbp.lanes_open !== undefined
                  ? ` · ${cbp.lanes_open} ${cbp.lanes_open === 1 ? 'carril abierto' : 'carriles abiertos'}`
                  : ''
              }`
            : 'CBP no reporta este carril ahora.'}
        </p>
      )}
      {direction === 'norte' && estimate.source !== 'community' && cbp === null && (
        <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
          CBP sin actualizar todavía.
        </p>
      )}
      {direction === 'sur' && (
        <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
          Solo reportes de la comunidad — no hay dato oficial para entrar a México.
        </p>
      )}
    </article>
  )
}

export default async function GaritaPage() {
  const now = new Date()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [snapshots, reports, recentVotes] = await Promise.all([
    safeRows<SnapshotRow>(
      supabase
        .from('border_line_snapshots')
        .select('lane, delay_minutes, lanes_open, operational_status, cbp_update_time, fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1200),
    ),
    safeRows<ReportRow>(
      supabase
        .from('border_line_reports')
        .select('id, lane, direction, wait_minutes, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(200),
    ),
    safeRows<VoteRow>(
      supabase
        .from('border_line_votes')
        .select('report_id, vote, created_at')
        .gte('created_at', new Date(now.getTime() - 30 * 60 * 1000).toISOString())
        .limit(1000),
    ),
  ])

  const votesByReport = new Map<string, { confirms: number; denies: number }>()
  for (const v of recentVotes) {
    const entry = votesByReport.get(v.report_id) ?? { confirms: 0, denies: 0 }
    if (v.vote === 'confirma') entry.confirms += 1
    else entry.denies += 1
    votesByReport.set(v.report_id, entry)
  }

  const reportInputs: BorderReportInput[] = reports.map((r) => ({
    id: r.id,
    lane: r.lane,
    direction: r.direction,
    wait_minutes: r.wait_minutes,
    status: r.status,
    created_at: r.created_at,
    confirms: votesByReport.get(r.id)?.confirms ?? 0,
    denies: votesByReport.get(r.id)?.denies ?? 0,
  }))

  const cbpByLane = new Map<BorderLane, CbpSnapshotInput>()
  for (const s of snapshots) {
    if (!cbpByLane.has(s.lane)) cbpByLane.set(s.lane, s)
  }

  const estimates = new Map<string, BorderEstimate>()
  for (const lane of LANES) {
    for (const direction of ['norte', 'sur'] as const) {
      // CBP measures into the US only — sur never gets a CBP
      // snapshot, so its cards can never imply an official number.
      estimates.set(
        `${lane}:${direction}`,
        estimateLane(
          lane,
          direction,
          reportInputs,
          direction === 'norte' ? (cbpByLane.get(lane) ?? null) : null,
          now,
        ),
      )
    }
  }

  // Recent reports (last 10) with author handles + vote counts.
  const recent = reports.slice(0, 10)
  const authorIds = [...new Set(recent.map((r) => r.user_id))]
  const authors = new Map<string, { username: string; display_name: string }>()
  if (authorIds.length > 0) {
    const rows = await safeRows<{ id: string; username: string; display_name: string }>(
      supabase.from('profiles').select('id, username, display_name').in('id', authorIds),
    )
    for (const row of rows) authors.set(row.id, row)
  }
  const userVotes: Record<string, 'confirma' | 'niega'> = {}
  if (user && recent.length > 0) {
    const rows = await safeRows<{ report_id: string; vote: 'confirma' | 'niega' }>(
      supabase
        .from('border_line_votes')
        .select('report_id, vote')
        .eq('user_id', user.id)
        .in(
          'report_id',
          recent.map((r) => r.id),
        ),
    )
    for (const row of rows) userVotes[row.report_id] = row.vote
  }
  const recentReports: RecentBorderReport[] = recent.map((r) => {
    const ageMinutes = Math.max(
      0,
      Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 60000),
    )
    const author = authors.get(r.user_id)
    return {
      id: r.id,
      lane: r.lane,
      direction: r.direction,
      wait_minutes: r.wait_minutes,
      status: r.status,
      created_at: r.created_at,
      ageLabel: formatAge(ageMinutes),
      username: author?.username ?? 'usuario',
      display_name: author?.display_name ?? 'Usuario',
      confirms: votesByReport.get(r.id)?.confirms ?? 0,
      denies: votesByReport.get(r.id)?.denies ?? 0,
    }
  })

  // Chart + projection + week, all for Auto general / a EUA.
  const todayPoints = hourlyToday(snapshots, reportInputs, 'auto', now)
  const averagePoints = sameWeekdayAverage(snapshots, 'auto', now)
  const days = daysCollecting(snapshots)
  const parts = tijuanaParts(now)
  const open = isPortOpen(now)
  const projection = open
    ? parts.hour < PORT_CLOSE_HOUR - 1
      ? projectionForHour(snapshots, 'auto', parts.hour + 1, now)
      : null
    : projectionForHour(
        snapshots,
        'auto',
        PORT_OPEN_HOUR,
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
      )
  const week = weekAnalytics(snapshots, 'auto', now)
  const weekMax = Math.max(0, ...week.byWeekday.map((d) => d.minutes ?? 0))
  // When the port is closed the projection targets tomorrow 6 am,
  // so the weekday named is tomorrow's.
  const projectionWeekday = open
    ? WEEKDAY_NAMES[parts.weekday]
    : WEEKDAY_NAMES[(parts.weekday + 1) % 7]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 pb-16">
        <h1 className="pt-5 text-xl font-bold text-gray-900">La garita de Tecate</h1>
        <p className="mt-1 text-sm text-gray-500">
          {open
            ? `Abierta · cierra 10 pm`
            : `Cerrada · abre 6 am`}
          {' — '}tiempos de espera con datos oficiales y reportes de la comunidad.
        </p>
        {snapshots.length === 0 && (
          <p className="mt-2 text-xs text-gray-500">
            CBP sin actualizar todavía — la sincronización empieza cuando se active el
            reporte automático de cada 30 minutos.
          </p>
        )}

        {/* Sticky report button. Offsets are the header's height:
            ~104px on mobile (two rows: logo + search) and ~57px on
            desktop (one row). If the button ever tucks under the
            header on a phone, these are the two numbers to adjust. */}
        <div className="sticky top-[104px] z-30 bg-gray-50 py-2 md:top-[57px]">
          <BorderReportSheet />
        </div>

        <h2 className="mt-4 text-base font-semibold text-gray-900">A EUA</h2>
        <div className="mt-2 grid gap-3">
          {LANES.map((lane) => (
            <LaneCard
              key={lane}
              lane={lane}
              direction="norte"
              estimate={estimates.get(`${lane}:norte`)!}
            />
          ))}
        </div>

        <h2 className="mt-6 text-base font-semibold text-gray-900">A México</h2>
        <div className="mt-2 grid gap-3">
          {LANES.map((lane) => (
            <LaneCard
              key={lane}
              lane={lane}
              direction="sur"
              estimate={estimates.get(`${lane}:sur`)!}
            />
          ))}
        </div>

        <section className="mt-6 rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">Hoy vs. un día normal</h2>
          <p className="text-xs text-gray-500">Auto general · a EUA</p>
          <div className="mt-3">
            <BorderChart today={todayPoints} average={averagePoints} daysCollecting={days} />
          </div>
          <div className="mt-4 border-t border-gray-100 pt-3">
            {projection ? (
              <p className="text-sm text-gray-900">
                Para las {projection.hour}:00: entre {projection.low} y {projection.high} min,
                según los últimos {projection.samples}{' '}
                {weekdayPlural(projection.weekdayName)} a esa hora.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Aún no hay suficiente historial para proyectar — se necesitan 3{' '}
                {projectionWeekday} con datos a esa hora
                {days > 0 ? ` (llevamos ${days} ${days === 1 ? 'día' : 'días'} recolectando)` : ''}
                .
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">Reportes recientes</h2>
          <div className="mt-3">
            <BorderReportsList reports={recentReports} userVotes={userVotes} />
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">Esta semana</h2>
          <p className="text-xs text-gray-500">Auto general · a EUA · últimos 7 días</p>
          {week.busiestHour || week.quietestHour ? (
            <div className="mt-3 space-y-2 text-sm text-gray-900">
              {week.busiestHour && (
                <p>
                  Hora más pesada: {week.busiestHour.hour}:00 ({week.busiestHour.minutes} min en
                  promedio)
                </p>
              )}
              {week.quietestHour && (
                <p>
                  Hora más tranquila: {week.quietestHour.hour}:00 (
                  {week.quietestHour.minutes} min en promedio)
                </p>
              )}
              <div className="space-y-1.5 pt-2">
                {week.byWeekday.map((d) => (
                  <div key={d.weekday} className="flex items-center gap-2">
                    <span className="w-8 shrink-0 text-xs text-gray-500">
                      {WEEKDAY_SHORT[d.weekday]}
                    </span>
                    <span
                      className="h-2 rounded bg-gray-900"
                      style={{
                        width: `${d.minutes !== null && weekMax > 0 ? Math.max(4, (d.minutes / weekMax) * 100) : 0}%`,
                      }}
                    />
                    <span className="text-xs text-gray-500">
                      {d.minutes !== null ? `${d.minutes} min` : 'sin datos'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              Aún no hay historial de esta semana.
            </p>
          )}
        </section>

        <footer className="mt-6 text-xs leading-relaxed text-gray-500">
          <p>
            Datos oficiales: U.S. Customs and Border Protection (CBP). Comunidad: reportes de
            usuarios de ventasTecate.
          </p>
          <p className="mt-2">
            Cómo calculamos el tiempo: si dos o más personas que ya cruzaron coinciden en los
            últimos 60 minutos, el número es su mediana; si solo hay un reporte reciente, se
            muestra tal cual, con el conteo a la vista; si la gente sigue en la fila, el número
            es lo que llevan esperando, no el total. Sin reportes recientes, se muestra el dato
            oficial de CBP si tiene menos de 60 minutos. Pasados 60 minutos el dato se marca
            como último conocido, y pasadas 3 horas ya no se muestra ningún número actual. Los
            reportes con 2 o más votos en contra, y los de más de 4 horas, nunca entran al
            cálculo.
          </p>
        </footer>
      </main>
    </div>
  )
}
