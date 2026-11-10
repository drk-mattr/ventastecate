import type { Metadata } from 'next'
import { ChevronDown } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { BorderReportSheet } from '@/components/border/border-report-sheet'
import { BorderChart } from '@/components/border/border-chart'
import { GaritaPageClient } from '@/components/border/garita-page-client'
import type { LaneSummaryCell } from '@/components/border/border-lane-summary'
import type { FeedBorderReport } from '@/components/border/border-feed'
import {
  PORT_CLOSE_HOUR,
  PORT_OPEN_HOUR,
  WEEKDAY_NAMES,
  aggregateDynamics,
  daysCollecting,
  estimateLane,
  formatAge,
  hourlyToday,
  isPortOpen,
  projectionForHour,
  sameWeekdayAverage,
  tijuanaParts,
  weekAnalytics,
  type BorderDirection,
  type BorderEstimate,
  type BorderLane,
  type BorderPace,
  type BorderReportInput,
  type CbpSnapshotInput,
  type DynamicsAggregate,
  type TailMarker,
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
  note: string | null
  photo_url: string | null
  pace: BorderPace | null
  tail_marker: TailMarker | null
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
        .select('id, lane, direction, wait_minutes, status, note, photo_url, pace, tail_marker, created_at, user_id')
        // Moderator-hidden posts leave the feed AND the estimate
        // inputs (migration 051). The column exists once 051 is
        // applied, which happens before this code deploys.
        // pace + tail_marker exist once 052 is applied, same
        // order — migration before deploy.
        .is('hidden_at', null)
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
    pace: r.pace,
    tail_marker: r.tail_marker,
  }))

  // Dynamic details (migration 052): pace + tail for auto / a
  // EUA only — the line 95% of readers drive. One quiet line
  // under the table, only when >= 2 recent reports agree.
  const dynamics: DynamicsAggregate = aggregateDynamics(
    reportInputs,
    'auto',
    'norte',
    now,
  )

  const cbpByLane = new Map<BorderLane, CbpSnapshotInput>()
  for (const s of snapshots) {
    if (!cbpByLane.has(s.lane)) cbpByLane.set(s.lane, s)
  }

  const estimates = new Map<string, BorderEstimate>()
  for (const lane of LANES) {
    // A EUA only — the México column was dropped 2026-11-09
    // (no official southbound source anywhere, zero southbound
    // reports ever). CBP measures into the US only, so the
    // snapshot is always the norte one.
    estimates.set(
      `${lane}:norte`,
      estimateLane(lane, 'norte', reportInputs, cbpByLane.get(lane) ?? null, now),
    )
  }

  // The answer as one table: the three norte estimates in row
  // order (Auto / A pie / Camiones) for the client shell, which
  // renders the compact table + the feed.
  const estimateCells: LaneSummaryCell[] = []
  for (const lane of LANES) {
    estimateCells.push({
      lane,
      direction: 'norte',
      estimate: estimates.get(`${lane}:norte`)!,
    })
  }

  // Feed (migration 051): today's reports, newest first, last
  // 50 — a post IS a border report rendered as a card. The
  // estimate above reads the same rows through its own 30-minute
  // vote window; the cards show ALL votes on each post, so an
  // older post does not read as unconfirmed.
  const todayKey = tijuanaParts(now).dateKey
  const feedRows = reports
    .filter((r) => tijuanaParts(new Date(r.created_at)).dateKey === todayKey)
    .slice(0, 50)
  const feedIds = feedRows.map((r) => r.id)
  const feedVotesByReport = new Map<string, { confirms: number; denies: number }>()
  if (feedIds.length > 0) {
    const feedVoteRows = await safeRows<VoteRow>(
      supabase
        .from('border_line_votes')
        .select('report_id, vote, created_at')
        .in('report_id', feedIds)
        .limit(2000),
    )
    for (const v of feedVoteRows) {
      const entry = feedVotesByReport.get(v.report_id) ?? { confirms: 0, denies: 0 }
      if (v.vote === 'confirma') entry.confirms += 1
      else entry.denies += 1
      feedVotesByReport.set(v.report_id, entry)
    }
  }
  const authorIds = [...new Set(feedRows.map((r) => r.user_id))]
  const authors = new Map<string, { username: string; display_name: string }>()
  if (authorIds.length > 0) {
    const rows = await safeRows<{ id: string; username: string; display_name: string }>(
      supabase.from('profiles').select('id, username, display_name').in('id', authorIds),
    )
    for (const row of rows) authors.set(row.id, row)
  }
  const userVotes: Record<string, 'confirma' | 'niega'> = {}
  if (user && feedRows.length > 0) {
    const rows = await safeRows<{ report_id: string; vote: 'confirma' | 'niega' }>(
      supabase
        .from('border_line_votes')
        .select('report_id, vote')
        .eq('user_id', user.id)
        .in('report_id', feedIds),
    )
    for (const row of rows) userVotes[row.report_id] = row.vote
  }
  const feedReports: FeedBorderReport[] = feedRows.map((r) => {
    const ageMinutes = Math.max(
      0,
      Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 60000),
    )
    const author = authors.get(r.user_id)
    return {
      id: r.id,
      user_id: r.user_id,
      lane: r.lane,
      direction: r.direction,
      wait_minutes: r.wait_minutes,
      status: r.status,
      created_at: r.created_at,
      ageLabel: formatAge(ageMinutes),
      username: author?.username ?? 'usuario',
      display_name: author?.display_name ?? 'Usuario',
      note: r.note,
      photo_url: r.photo_url,
      pace: r.pace,
      tail_marker: r.tail_marker,
      confirms: feedVotesByReport.get(r.id)?.confirms ?? 0,
      denies: feedVotesByReport.get(r.id)?.denies ?? 0,
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
          <BorderReportSheet portOpen={open} />
        </div>

        {/* The answer + the evidence, in one client shell: the
            compact lane table first, then the feed in its own
            place ("La fila, en vivo"). One filter state drives
            both — tapping a table cell filters the feed. */}
        <div className="mt-4">
          <GaritaPageClient
            cells={estimateCells}
            dynamics={dynamics}
            feedReports={feedReports}
            userVotes={userVotes}
          />
        </div>

        {/* Analytics — collapsed until they have data. The
            projection needs 3 same-weekday samples (~3 weeks)
            and "Esta semana" needs 7 days; until then this is
            one row, not ~500 px of empty states. Auto-expands
            once daysCollecting >= 3. */}
        <details
          open={days >= 3}
          className="group mt-6 overflow-hidden rounded-xl border bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
            <span>
              <span className="block text-base font-semibold text-gray-900">
                Datos y proyecciones
              </span>
              <span className="block text-xs text-gray-500">
                Hoy vs. un día normal · Esta semana
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-6 border-t border-gray-100 px-4 py-4">
            <section>
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
            <section className="border-t border-gray-100 pt-4">
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
          </div>
        </details>

        <footer className="mt-6 text-xs leading-relaxed text-gray-500">
          <p>
            Datos oficiales: U.S. Customs and Border Protection (CBP). Comunidad: reportes de
            usuarios de ventasTecate.
          </p>
          <p className="mt-2">
            Los reportes con 2 o más votos en contra no entran al cálculo, pero siguen visibles
            con sus votos.
          </p>
          <details className="group mt-2">
            <summary className="cursor-pointer list-none font-medium text-gray-700">
              Cómo calculamos el tiempo
              <ChevronDown className="ml-1 inline h-3.5 w-3.5 text-gray-500 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2">
              Si dos o más personas que ya cruzaron coinciden en los últimos 60 minutos, el
              número es su mediana; si solo hay un reporte reciente, se muestra tal cual, con el
              conteo a la vista; si la gente sigue en la fila, el número es lo que llevan
              esperando, no el total. Sin reportes recientes, se muestra el dato oficial de CBP
              si tiene menos de 60 minutos. Pasados 60 minutos el dato se marca como último
              conocido, y pasadas 3 horas ya no se muestra ningún número actual. Los reportes
              con 2 o más votos en contra, y los de más de 4 horas, nunca entran al cálculo.
            </p>
          </details>
        </footer>
      </main>
    </div>
  )
}
