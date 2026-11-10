// La Garita — border-line estimate (proposal §4).
//
// Deterministic aggregation, no model: the number must always be
// traceable to a source and a timestamp. Pure functions only —
// every function here takes `now` explicitly so the decision ladder
// is unit-testable against fixtures.
//
// The ladder, per lane + direction:
//   1. >=2 ya_cruce reports in the last 60 min agreeing within ±15
//      min -> their median, source Comunidad.
//   2. >=1 ya_cruce report in the last 30 min -> that report (a
//      confirmed one wins over an unconfirmed one), count shown so
//      a single report never pretends to be a consensus.
//   3. en_fila reports only -> their median, ALWAYS labeled
//      "y contando" — minutes waited so far, never a total wait.
//   4. Else the freshest CBP snapshot if < 60 min old.
//   5. Else the staleness ladder: 60-180 min -> "Último dato
//      conocido" (demoted); > 180 min -> no current number.
// Outliers (> 3x the median for that lane, or > 240 min) and
// denied reports (2+ "niega" votes) never enter steps 1-3.

export type BorderLane = 'auto' | 'peatonal' | 'comercial'
export type BorderDirection = 'norte' | 'sur'
export type BorderReportStatus = 'en_fila' | 'ya_cruce'

/** The shared table ↔ feed filter (moved here from the deleted
 *  border-feed.tsx — the table, the client shell, and the
 *  activity feed all import it). */
export type LaneFilter = 'all' | BorderLane
export type DirectionFilter = 'all' | BorderDirection

export type BorderReportInput = {
  id: string
  lane: BorderLane
  direction: BorderDirection
  wait_minutes: number
  status: BorderReportStatus
  /** ISO timestamp of the report. */
  created_at: string
  /** "confirma" votes in the last 30 min. */
  confirms: number
  /** "niega" votes in the last 30 min. */
  denies: number
  /** Pace pick (migration 052), or null when skipped. */
  pace?: BorderPace | null
  /** Tail landmark (migration 052), or null when skipped. */
  tail_marker?: TailMarker | null
}

export type CbpSnapshotInput = {
  lane: BorderLane
  delay_minutes: number | null
  lanes_open: number | null
  operational_status: string | null
  /** CBP's own "At Noon PST" style label, stored as-is. */
  cbp_update_time: string | null
  /** ISO timestamp of when WE fetched it — our freshness clock. */
  fetched_at: string
}

export type BorderEstimate = {
  /** 'current' = fresh enough to headline (< 60 min);
   *  'last-known' = 60-180 min old, demoted; 'none' = > 180 min
   *  or no data at all. */
  state: 'current' | 'last-known' | 'none'
  source: 'community' | 'cbp' | null
  /** Headline minutes, or the last known minutes when state is
   *  'none' (shown demoted with its age), or null when nothing
   *  was ever recorded. */
  minutes: number | null
  /** True when the headline is an en_fila median — people still
   *  in line, a lower bound, never a total wait. */
  isCounting: boolean
  /** Minutes since the headline data point was recorded (report
   *  created_at, or snapshot fetched_at for CBP). */
  ageMinutes: number | null
  /** Community reports behind the headline (0 for a CBP headline). */
  reportCount: number
  /** "2 de 3 coinciden en 45–60 min", or "reportes entre 30 y 90
   *  min — la fila está cambiando" when completed reports
   *  disagree; null when not applicable. */
  agreement: string | null
  /** Freshest CBP snapshot for this lane (norte only; null for
   *  sur — CBP measures into the US only). */
  cbp: CbpSnapshotInput | null
  /** Minutes since the freshest CBP snapshot was fetched
   *  (the "Oficial CBP: … hace X min" line, shown even when the
   *  headline itself comes from the community). */
  cbpAgeMinutes: number | null
}

export const LANE_LABELS: Record<BorderLane, string> = {
  auto: 'Auto general',
  peatonal: 'A pie',
  comercial: 'Camiones',
}

export const DIRECTION_LABELS: Record<BorderDirection, string> = {
  norte: 'a EUA',
  sur: 'a México',
}

// Dynamic details (migration 052) — two structured signals
// people actually report at the line, beyond the minutes:
// pace ("¿Cómo va?") and tail ("¿Hasta dónde llega?").
// Closed sets only: the labels live here, the DB stores slugs.

export type BorderPace = 'rapida' | 'normal' | 'lenta'
export type TailMarker = 'garita' | 'glorieta' | 'cetis' | 'panteon' | 'el_alto'

/** Chip labels in the composer (feminine, agreeing with "la fila"). */
export const PACE_LABELS: Record<BorderPace, string> = {
  rapida: 'Va rápida',
  normal: 'Normal',
  lenta: 'Muy lenta',
}

/** Chip labels in the composer, port → town order (the order
 *  the chips render in, so the list reads as "how far back").
 *  Confirmed by Greg 2026-11-09: Garita → Glorieta → CETIS →
 *  Panteón → El Alto; El Alto is one landmark label. */
export const TAIL_MARKER_LABELS: Record<TailMarker, string> = {
  garita: 'En la garita',
  glorieta: 'La glorieta',
  cetis: 'El CETIS',
  panteon: 'El panteón',
  el_alto: 'El Alto',
}

/** Pace as it reads in the aggregated line, after "Ahora: ". */
export const PACE_LINE_LABELS: Record<BorderPace, string> = {
  rapida: 'va rápida',
  normal: 'normal',
  lenta: 'va muy lenta',
}

/** Tail as it reads after "hasta" ("la fila llega hasta …",
 *  "Fila hasta …"). "En la garita" would break that sentence,
 *  so the line form is "la garita". */
export const TAIL_LINE_LABELS: Record<TailMarker, string> = {
  garita: 'la garita',
  glorieta: 'La glorieta',
  cetis: 'El CETIS',
  panteon: 'El panteón',
  el_alto: 'El Alto',
}

export const WEEKDAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
]

/** Port hours, America/Tijuana: 6 am–10 pm. */
export const PORT_OPEN_HOUR = 6
export const PORT_CLOSE_HOUR = 22

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function minutesAgo(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000))
}

/** Tijuana calendar parts for a Date. hourCycle h23 avoids the
 *  "24" midnight quirk of hour12:false in some runtimes. */
export function tijuanaParts(date: Date): {
  dateKey: string
  hour: number
  minute: number
  weekday: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Tijuana',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: weekdayMap[get('weekday')] ?? 0,
  }
}

export function isPortOpen(now: Date): boolean {
  const { hour } = tijuanaParts(now)
  return hour >= PORT_OPEN_HOUR && hour < PORT_CLOSE_HOUR
}

/** "hace 8 min" / "hace 2 h" / "ahora mismo" — freshness is
 *  always words, never color (design system). */
export function formatAge(ageMinutes: number | null): string {
  if (ageMinutes === null) return 'sin datos'
  if (ageMinutes < 1) return 'ahora mismo'
  if (ageMinutes < 60) return `hace ${ageMinutes} min`
  if (ageMinutes < 1440) return `hace ${Math.floor(ageMinutes / 60)} h`
  return `hace ${Math.floor(ageMinutes / 1440)} d`
}

export function formatWait(minutes: number): string {
  return minutes <= 0 ? 'Sin espera' : `${minutes} min`
}

function agreementText(completed: BorderReportInput[]): string | null {
  if (completed.length < 2) return null
  const values = completed.map((r) => r.wait_minutes).sort((a, b) => a - b)
  // Largest cluster of values within a ±15 min window.
  let best: number[] = []
  for (let i = 0; i < values.length; i++) {
    const cluster = values.filter((v) => v >= values[i] && v <= values[i] + 15)
    if (cluster.length > best.length) best = cluster
  }
  if (best.length >= 2) {
    const lo = Math.min(...best)
    const hi = Math.max(...best)
    const range = lo === hi ? `${lo} min` : `${lo}–${hi} min`
    return `${best.length} de ${completed.length} coinciden en ${range}`
  }
  const lo = values[0]
  const hi = values[values.length - 1]
  return `reportes entre ${lo} y ${hi} min — la fila está cambiando`
}

/** Median of a cluster of completed reports agreeing within ±15
 *  min, or null when no such cluster exists. */
function agreeingClusterMedian(completed: BorderReportInput[]): number | null {
  if (completed.length < 2) return null
  const values = completed.map((r) => r.wait_minutes).sort((a, b) => a - b)
  let best: number[] = []
  for (let i = 0; i < values.length; i++) {
    const cluster = values.filter((v) => v >= values[i] && v <= values[i] + 15)
    if (cluster.length > best.length) best = cluster
  }
  if (best.length < 2) return null
  return median(best)
}

export function estimateLane(
  lane: BorderLane,
  direction: BorderDirection,
  allReports: BorderReportInput[],
  cbp: CbpSnapshotInput | null,
  now: Date,
): BorderEstimate {
  const base: BorderEstimate = {
    state: 'none',
    source: null,
    minutes: null,
    isCounting: false,
    ageMinutes: null,
    reportCount: 0,
    agreement: null,
    cbp,
    cbpAgeMinutes: cbp ? minutesAgo(cbp.fetched_at, now) : null,
  }
  const reports = allReports.filter((r) => r.lane === lane && r.direction === direction)

  // Eligible for the live estimate: last 60 min, not denied,
  // not an absurd wait. The outlier cut is relative to the
  // median of the candidate set itself.
  const candidates = reports.filter(
    (r) => minutesAgo(r.created_at, now) <= 60 && r.denies < 2 && r.wait_minutes <= 240,
  )
  const med = median(candidates.map((r) => r.wait_minutes))
  const eligible =
    med !== null && med > 0
      ? candidates.filter((r) => r.wait_minutes <= 3 * med)
      : candidates
  const completed = eligible.filter((r) => r.status === 'ya_cruce')
  const inLine = eligible.filter((r) => r.status === 'en_fila')

  // 1. >=2 completed reports agreeing within ±15 min -> median.
  const clusterMedian = agreeingClusterMedian(completed)
  if (clusterMedian !== null) {
    const clusterMembers = completed.filter(
      (r) => Math.abs(r.wait_minutes - clusterMedian) <= 15,
    )
    const freshest = clusterMembers.reduce((a, b) =>
      new Date(a.created_at) > new Date(b.created_at) ? a : b,
    )
    return {
      ...base,
      state: 'current',
      source: 'community',
      minutes: clusterMedian,
      isCounting: false,
      ageMinutes: minutesAgo(freshest.created_at, now),
      reportCount: clusterMembers.length,
      agreement: agreementText(completed),
    }
  }

  // 2. One completed report in the last 30 min. A confirmed
  // report (3+ "sigue así") outranks an unconfirmed one.
  const freshCompleted = completed
    .filter((r) => minutesAgo(r.created_at, now) <= 30)
    .sort((a, b) => {
      const confA = a.confirms >= 3 ? 1 : 0
      const confB = b.confirms >= 3 ? 1 : 0
      if (confA !== confB) return confB - confA
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  if (freshCompleted.length > 0) {
    const pick = freshCompleted[0]
    return {
      ...base,
      state: 'current',
      source: 'community',
      minutes: pick.wait_minutes,
      isCounting: false,
      ageMinutes: minutesAgo(pick.created_at, now),
      reportCount: 1,
      agreement: agreementText(completed),
    }
  }

  // 3. Only in-line reports -> median so far, labeled as such.
  if (inLine.length > 0) {
    const medInLine = median(inLine.map((r) => r.wait_minutes))
    const freshest = inLine.reduce((a, b) =>
      new Date(a.created_at) > new Date(b.created_at) ? a : b,
    )
    return {
      ...base,
      state: 'current',
      source: 'community',
      minutes: medInLine,
      isCounting: true,
      ageMinutes: minutesAgo(freshest.created_at, now),
      reportCount: inLine.length,
      agreement: null,
    }
  }

  // 4. Fresh CBP snapshot (< 60 min old, with a real number).
  // CBP measures into the US only — never used for sur.
  if (direction === 'norte' && cbp && cbp.delay_minutes !== null) {
    const cbpAge = minutesAgo(cbp.fetched_at, now)
    if (cbpAge < 60) {
      return {
        ...base,
        state: 'current',
        source: 'cbp',
        minutes: cbp.delay_minutes,
        isCounting: false,
        ageMinutes: cbpAge,
        reportCount: 0,
        agreement: null,
      }
    }
  }

  // 5. Staleness ladder: the freshest data point of either
  // source, however old. 60-180 min -> demoted "last known";
  // > 180 min -> no current number (the last known value is
  // still carried so the page can show it, demoted, with age).
  const oldCommunity = reports
    .filter((r) => r.denies < 2 && r.wait_minutes <= 240)
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]
  let last: {
    minutes: number
    source: 'community' | 'cbp'
    ageMinutes: number
    isCounting: boolean
  } | null = null
  if (oldCommunity) {
    last = {
      minutes: oldCommunity.wait_minutes,
      source: 'community',
      ageMinutes: minutesAgo(oldCommunity.created_at, now),
      isCounting: oldCommunity.status === 'en_fila',
    }
  }
  if (direction === 'norte' && cbp && cbp.delay_minutes !== null) {
    const cbpAge = minutesAgo(cbp.fetched_at, now)
    if (!last || cbpAge < last.ageMinutes) {
      last = {
        minutes: cbp.delay_minutes,
        source: 'cbp',
        ageMinutes: cbpAge,
        isCounting: false,
      }
    }
  }
  if (!last) return base
  return {
    ...base,
    state: last.ageMinutes < 180 ? 'last-known' : 'none',
    source: last.source,
    minutes: last.minutes,
    isCounting: last.isCounting,
    ageMinutes: last.ageMinutes,
    reportCount: 0,
    agreement: null,
  }
}

// --- Dynamic details: pace + tail (migration 052) ---

export type DynamicsAggregate = {
  pace: { value: BorderPace; count: number; ageMinutes: number } | null
  tail: { value: TailMarker; count: number; ageMinutes: number } | null
  /** Freshest age behind either displayed signal, or null. */
  ageMinutes: number | null
  /** Distinct reports behind the line (mode members of pace
   *  ∪ mode members of tail). */
  reportCount: number
}

const NO_DYNAMICS: DynamicsAggregate = {
  pace: null,
  tail: null,
  ageMinutes: null,
  reportCount: 0,
}

/** The mode of a list of picks, or null when there is no unique
 *  mode (too few, or a tie at the top). Agreement is the only
 *  trust signal: one report is an anecdote, never a headline. */
function modeOf<T extends string>(
  values: T[],
): { value: T; count: number } | null {
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: { value: T; count: number } | null = null
  let tied = false
  for (const [value, count] of counts) {
    if (!best || count > best.count) {
      best = { value, count }
      tied = false
    } else if (count === best.count) {
      tied = true
    }
  }
  if (!best || tied || best.count < 2) return null
  return best
}

/** Aggregated pace + tail for one lane + direction. Same base
 *  eligibility as the ladder (last 60 min, not denied, not an
 *  absurd wait), then a stricter 30-minute freshness cutoff —
 *  pace and tail move faster than the median wait, and past 30
 *  min the line disappears entirely, never demoted.
 *  Pace: either status counts (a ya_cruce pace still describes
 *  the crossing just completed). Tail: auto + en_fila only — a
 *  tail on any other lane, or on a ya_cruce report, is stored
 *  and simply never aggregated. Both signals aggregate
 *  independently; the line shows whichever has an aggregate. */
export function aggregateDynamics(
  allReports: BorderReportInput[],
  lane: BorderLane,
  direction: BorderDirection,
  now: Date,
): DynamicsAggregate {
  const eligible = allReports
    .filter((r) => r.lane === lane && r.direction === direction)
    .filter(
      (r) => minutesAgo(r.created_at, now) <= 60 && r.denies < 2 && r.wait_minutes <= 240,
    )

  const paceCandidates = eligible.filter(
    (r) => r.pace != null && minutesAgo(r.created_at, now) <= 30,
  )
  const paceMode = modeOf(paceCandidates.map((r) => r.pace as BorderPace))
  const paceMembers = paceMode
    ? paceCandidates.filter((r) => r.pace === paceMode.value)
    : []

  const tailCandidates =
    lane === 'auto'
      ? eligible.filter(
          (r) =>
            r.tail_marker != null &&
            r.status === 'en_fila' &&
            minutesAgo(r.created_at, now) <= 30,
        )
      : []
  const tailMode = modeOf(tailCandidates.map((r) => r.tail_marker as TailMarker))
  const tailMembers = tailMode
    ? tailCandidates.filter((r) => r.tail_marker === tailMode.value)
    : []

  if (!paceMode && !tailMode) return NO_DYNAMICS

  const memberIds = new Set<string>()
  let freshestAge: number | null = null
  for (const m of [...paceMembers, ...tailMembers]) {
    memberIds.add(m.id)
    const age = minutesAgo(m.created_at, now)
    if (freshestAge === null || age < freshestAge) freshestAge = age
  }
  const paceAge = paceMembers.length
    ? Math.min(...paceMembers.map((m) => minutesAgo(m.created_at, now)))
    : null
  const tailAge = tailMembers.length
    ? Math.min(...tailMembers.map((m) => minutesAgo(m.created_at, now)))
    : null
  return {
    pace:
      paceMode && paceAge !== null
        ? { value: paceMode.value, count: paceMode.count, ageMinutes: paceAge }
        : null,
    tail:
      tailMode && tailAge !== null
        ? { value: tailMode.value, count: tailMode.count, ageMinutes: tailAge }
        : null,
    ageMinutes: freshestAge,
    reportCount: memberIds.size,
  }
}

/** The one quiet line under the table, split for the two-tone
 *  render (signal gray-900, count + age gray-500). Returns null
 *  when there is nothing worth saying — no empty state, the
 *  line simply doesn't exist until an aggregate does. */
export function dynamicsLineParts(
  agg: DynamicsAggregate,
): { signal: string; meta: string } | null {
  if (!agg.pace && !agg.tail) return null
  const parts: string[] = []
  if (agg.pace) parts.push(PACE_LINE_LABELS[agg.pace.value])
  if (agg.tail) parts.push(`la fila llega hasta ${TAIL_LINE_LABELS[agg.tail.value]}`)
  // Tail-only starts the sentence, so it takes the capital:
  // "La fila llega hasta El Alto". With pace present the line
  // starts "Ahora: …" and the tail stays lowercase mid-line.
  const signal = agg.pace
    ? `Ahora: ${parts.join(' · ')}`
    : parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  const meta = `${agg.reportCount} ${agg.reportCount === 1 ? 'reporte' : 'reportes'}, ${formatAge(agg.ageMinutes)}`
  return { signal, meta }
}

// --- Unified activity feed: CBP entries (read-only projection) ---

export type CbpFeedEntry = {
  kind: 'cbp'
  /** `cbp-${lane}-${fetched_at}` — stable across renders. */
  id: string
  /** Snapshot fetched_at (ISO) — the entry's timestamp. */
  at: string
  /** "hace 11 min" — computed server-side, never Date.now()
   *  in render. */
  ageLabel: string
  lane: BorderLane
  /** CBP measures northbound only, always. */
  direction: 'norte'
  wait_minutes: number
  lanes_open: number | null
  /** CBP's own "At 1:00 pm PST" label, stored as-is. */
  cbp_label: string | null
}

/** Today's CBP entries for the unified "Actividad" feed: a
 *  read-only projection of the stored snapshots — no new table,
 *  no new fetch. The sync writes 3 rows every 30 min, so without
 *  dedup the feed would print the same `60 min` all day. Rule:
 *  one entry per (lane, sync) only when `delay_minutes` OR
 *  `lanes_open` changed vs the previous snapshot for that lane.
 *  Identical repeats produce no entry. The walk runs over the
 *  full snapshot list (oldest first) so today's first snapshot
 *  is correctly judged against yesterday's last one — a number
 *  CBP held overnight is not a new entry in the morning.
 *  Snapshots with no number (delay_minutes null) carry nothing
 *  to show and are skipped. Returns newest first, today only
 *  (Tijuana calendar day). */
export function deriveCbpFeedEntries(
  snapshots: CbpSnapshotInput[],
  now: Date,
): CbpFeedEntry[] {
  const today = tijuanaParts(now).dateKey
  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime(),
  )
  const lastSeen = new Map<BorderLane, { delay: number; lanes: number | null }>()
  const entries: CbpFeedEntry[] = []
  for (const s of ordered) {
    if (s.delay_minutes === null) continue
    const prev = lastSeen.get(s.lane)
    const changed =
      !prev || prev.delay !== s.delay_minutes || prev.lanes !== s.lanes_open
    lastSeen.set(s.lane, { delay: s.delay_minutes, lanes: s.lanes_open })
    if (!changed) continue
    if (tijuanaParts(new Date(s.fetched_at)).dateKey !== today) continue
    entries.push({
      kind: 'cbp',
      id: `cbp-${s.lane}-${s.fetched_at}`,
      at: s.fetched_at,
      ageLabel: formatAge(minutesAgo(s.fetched_at, now)),
      lane: s.lane,
      direction: 'norte',
      wait_minutes: s.delay_minutes,
      lanes_open: s.lanes_open,
      cbp_label: s.cbp_update_time,
    })
  }
  // Newest first.
  return entries.reverse()
}

// --- History: today, same-weekday average, projections, week ---

export type HourlyPoint = {
  hour: number
  minutes: number
  source: 'community' | 'cbp'
}

export type AveragePoint = {
  hour: number
  minutes: number
  /** Distinct past same-weekdays behind this hour's median. */
  samples: number
}

/** Today's hourly points for one lane (norte): per hour, the
 *  community ya_cruce median if any reports fell in that hour,
 *  else the CBP snapshot median. Hours are Tijuana hours. */
export function hourlyToday(
  snapshots: CbpSnapshotInput[],
  reports: BorderReportInput[],
  lane: BorderLane,
  now: Date,
): HourlyPoint[] {
  const today = tijuanaParts(now)
  const points: HourlyPoint[] = []
  for (let hour = PORT_OPEN_HOUR; hour <= today.hour && hour < PORT_CLOSE_HOUR; hour++) {
    const communityValues = reports
      .filter(
        (r) =>
          r.lane === lane &&
          r.direction === 'norte' &&
          r.status === 'ya_cruce' &&
          r.denies < 2 &&
          r.wait_minutes <= 240 &&
          tijuanaParts(new Date(r.created_at)).dateKey === today.dateKey &&
          tijuanaParts(new Date(r.created_at)).hour === hour,
      )
      .map((r) => r.wait_minutes)
    const communityMedian = median(communityValues)
    if (communityMedian !== null) {
      points.push({ hour, minutes: communityMedian, source: 'community' })
      continue
    }
    const cbpValues = snapshots
      .filter(
        (s) =>
          s.lane === lane &&
          s.delay_minutes !== null &&
          tijuanaParts(new Date(s.fetched_at)).dateKey === today.dateKey &&
          tijuanaParts(new Date(s.fetched_at)).hour === hour,
      )
      .map((s) => s.delay_minutes as number)
    const cbpMedian = median(cbpValues)
    if (cbpMedian !== null) points.push({ hour, minutes: cbpMedian, source: 'cbp' })
  }
  return points
}

/** Same-weekday average: for each hour, the median of that
 *  hour's readings across past same-weekdays (today excluded).
 *  Built from stored CBP snapshots only — our own averages,
 *  never CBP's undocumented "Average Wait". */
export function sameWeekdayAverage(
  snapshots: CbpSnapshotInput[],
  lane: BorderLane,
  now: Date,
): AveragePoint[] {
  const today = tijuanaParts(now)
  // Per (date, hour) -> median of that hour's snapshots.
  const byDateHour = new Map<string, number[]>()
  for (const s of snapshots) {
    if (s.lane !== lane || s.delay_minutes === null) continue
    const p = tijuanaParts(new Date(s.fetched_at))
    if (p.dateKey === today.dateKey) continue
    if (p.weekday !== today.weekday) continue
    const key = `${p.dateKey}|${p.hour}`
    const arr = byDateHour.get(key) ?? []
    arr.push(s.delay_minutes)
    byDateHour.set(key, arr)
  }
  // Per hour -> list of per-date medians.
  const perHour = new Map<number, number[]>()
  for (const [key, values] of byDateHour) {
    const hour = Number(key.split('|')[1])
    const m = median(values)
    if (m === null) continue
    const arr = perHour.get(hour) ?? []
    arr.push(m)
    perHour.set(hour, arr)
  }
  const out: AveragePoint[] = []
  for (const [hour, medians] of [...perHour.entries()].sort((a, b) => a[0] - b[0])) {
    const m = median(medians)
    if (m !== null) out.push({ hour, minutes: m, samples: medians.length })
  }
  return out
}

export type Projection = {
  hour: number
  low: number
  high: number
  median: number
  samples: number
  weekdayName: string
}

/** Projection for one target hour: the range of that hour's
 *  medians across past same-weekdays. Honest only with >= 3
 *  same-weekday samples (~3 weeks); otherwise null and the page
 *  shows "aún no hay suficiente historial". */
export function projectionForHour(
  snapshots: CbpSnapshotInput[],
  lane: BorderLane,
  targetHour: number,
  now: Date,
): Projection | null {
  const today = tijuanaParts(now)
  const byDate = new Map<string, number[]>()
  for (const s of snapshots) {
    if (s.lane !== lane || s.delay_minutes === null) continue
    const p = tijuanaParts(new Date(s.fetched_at))
    if (p.dateKey === today.dateKey) continue
    if (p.weekday !== today.weekday) continue
    if (p.hour !== targetHour) continue
    const arr = byDate.get(p.dateKey) ?? []
    arr.push(s.delay_minutes)
    byDate.set(p.dateKey, arr)
  }
  const medians: number[] = []
  for (const values of byDate.values()) {
    const m = median(values)
    if (m !== null) medians.push(m)
  }
  if (medians.length < 3) return null
  const med = median(medians)
  if (med === null) return null
  return {
    hour: targetHour,
    low: Math.min(...medians),
    high: Math.max(...medians),
    median: med,
    samples: medians.length,
    weekdayName: WEEKDAY_NAMES[today.weekday],
  }
}

/** Distinct calendar days with any snapshots — "llevamos X
 *  días recolectando" for the honest no-history state. */
export function daysCollecting(snapshots: CbpSnapshotInput[]): number {
  const days = new Set(snapshots.map((s) => tijuanaParts(new Date(s.fetched_at)).dateKey))
  return days.size
}

export type WeekAnalytics = {
  busiestHour: { hour: number; minutes: number } | null
  quietestHour: { hour: number; minutes: number } | null
  /** Average wait per weekday (0 = domingo), last 7 days. */
  byWeekday: { weekday: number; minutes: number | null }[]
}

/** "Esta semana": busiest / quietest hour of the day and the
 *  average wait per weekday, from the last 7 days of CBP
 *  snapshots for one lane (norte). */
export function weekAnalytics(
  snapshots: CbpSnapshotInput[],
  lane: BorderLane,
  now: Date,
): WeekAnalytics {
  const since = now.getTime() - 7 * 24 * 60 * 60 * 1000
  const recent = snapshots.filter(
    (s) =>
      s.lane === lane &&
      s.delay_minutes !== null &&
      new Date(s.fetched_at).getTime() >= since,
  )
  // Per hour-of-day -> median across the week.
  const perHour = new Map<number, number[]>()
  // Per weekday -> all readings.
  const perWeekday = new Map<number, number[]>()
  for (const s of recent) {
    const p = tijuanaParts(new Date(s.fetched_at))
    const h = perHour.get(p.hour) ?? []
    h.push(s.delay_minutes as number)
    perHour.set(p.hour, h)
    const w = perWeekday.get(p.weekday) ?? []
    w.push(s.delay_minutes as number)
    perWeekday.set(p.weekday, w)
  }
  let busiest: { hour: number; minutes: number } | null = null
  let quietest: { hour: number; minutes: number } | null = null
  for (const [hour, values] of perHour) {
    const m = median(values)
    if (m === null) continue
    if (!busiest || m > busiest.minutes) busiest = { hour, minutes: m }
    if (!quietest || m < quietest.minutes) quietest = { hour, minutes: m }
  }
  const byWeekday = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const values = perWeekday.get(weekday) ?? []
    return { weekday, minutes: median(values) }
  })
  return { busiestHour: busiest, quietestHour: quietest, byWeekday }
}
