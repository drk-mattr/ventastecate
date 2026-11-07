/**
 * Structured event dates (migration 043).
 *
 * Events finally carry their own date/time/venue/ticket fields instead
 * of hiding them in free text. Every read here fails soft: before 043
 * is applied the columns don't exist, the values are undefined, and
 * every helper below returns null/false — cards and detail render
 * exactly as they did before, with no errors and no empty blocks.
 *
 * TIMEZONE: all event times are Baja California local time. The
 * Worker renders in UTC, so every formatter pins
 * timeZone 'America/Tijuana' (same offsets as America/Los_Angeles
 * year-round) — server and client render the same day and hour.
 *
 * DATE-ONLY CONVENTION: the posting form has separate date and time
 * inputs; a date with no time is stored at local midnight (00:00).
 * A stored time of exactly 00:00 local therefore means "no time was
 * set" — display shows the day only, and the past check treats the
 * event as running through the end of that day (a date-only event on
 * Nov 7 is not "terminado" at 00:01 on Nov 7). A real event genuinely
 * starting at midnight would read as date-only; that is vanishingly
 * rare for local events and the trade-off is documented here.
 */

export type EventFields = {
  event_starts_at?: string | null
  event_ends_at?: string | null
  event_venue?: string | null
  event_ticket_url?: string | null
}

/** Baja California local time — every event date is read in this zone. */
const EVENT_TZ = 'America/Tijuana'

type TzParts = { year: number; month: number; day: number; hour: number; minute: number; second: number }

/** Date/time parts of an instant in the event timezone (null if invalid). */
function partsInTz(iso: string): TzParts | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })
  const parts: Record<string, number> = {}
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour % 24, // hour12:false can yield "24" for midnight
    minute: parts.minute,
    second: parts.second,
  }
}

/** True when the stored local time is exactly midnight — i.e. date-only. */
export function isDateOnly(iso: string): boolean {
  const p = partsInTz(iso)
  return Boolean(p && p.hour === 0 && p.minute === 0 && p.second === 0)
}

/** Short day: "vie 20 nov". Periods stripped (ICU varies: "vie." vs "vie"). */
export function formatEventDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d
    .toLocaleDateString('es-MX', { timeZone: EVENT_TZ, weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Short time, 24h: "19:00". */
export function formatEventTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-MX', { timeZone: EVENT_TZ, hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Long day: "viernes, 20 de noviembre de 2026". */
export function formatEventDayLong(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-MX', { timeZone: EVENT_TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function dayTimeShort(iso: string): string {
  return isDateOnly(iso) ? formatEventDay(iso) : `${formatEventDay(iso)} · ${formatEventTime(iso)}`
}

function dayTimeLong(iso: string): string {
  return isDateOnly(iso) ? formatEventDayLong(iso) : `${formatEventDayLong(iso)} · ${formatEventTime(iso)}`
}

function sameDay(a: string, b: string): boolean {
  const pa = partsInTz(a)
  const pb = partsInTz(b)
  return Boolean(pa && pb && pa.year === pb.year && pa.month === pb.month && pa.day === pb.day)
}

/**
 * Short range for cards: "vie 20 nov · 19:00", "sáb 7 nov",
 * "dom 8 nov · 16:00 – 18:00", "vie 13 nov – lun 17 nov".
 * Null when there is no start date.
 */
export function formatEventRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string | null {
  if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) return null
  if (!endsAt || Number.isNaN(new Date(endsAt).getTime())) return dayTimeShort(startsAt)
  if (sameDay(startsAt, endsAt)) {
    if (isDateOnly(startsAt) && isDateOnly(endsAt)) return formatEventDay(startsAt)
    if (isDateOnly(startsAt)) return formatEventDay(startsAt)
    return `${formatEventDay(startsAt)} · ${formatEventTime(startsAt)} – ${formatEventTime(endsAt)}`
  }
  return `${dayTimeShort(startsAt)} – ${dayTimeShort(endsAt)}`
}

/** Long range for the detail page. Null when there is no start date. */
export function formatEventRangeLong(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string | null {
  if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) return null
  if (!endsAt || Number.isNaN(new Date(endsAt).getTime())) return dayTimeLong(startsAt)
  if (sameDay(startsAt, endsAt)) {
    if (isDateOnly(startsAt) && isDateOnly(endsAt)) return formatEventDayLong(startsAt)
    if (isDateOnly(startsAt)) return formatEventDayLong(startsAt)
    return `${formatEventDayLong(startsAt)} · ${formatEventTime(startsAt)} – ${formatEventTime(endsAt)}`
  }
  return `${dayTimeLong(startsAt)} – ${dayTimeLong(endsAt)}`
}

/**
 * True when the event is over: the end (or the start, when there is
 * no end) has passed. A date-only end runs through the end of that
 * day (see the convention above). No date → never past.
 */
export function isEventPast(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  now = Date.now(),
): boolean {
  const end = endsAt ?? startsAt
  if (!end) return false
  let endMs = new Date(end).getTime()
  if (Number.isNaN(endMs)) return false
  if (isDateOnly(end)) endMs += 24 * 60 * 60 * 1000
  return now > endMs
}

/**
 * Upcoming-first ordering for event-filtered views: upcoming events
 * by start date, then undated (newest first), then past events
 * (most recent first). Pre-043 every row is undated, so the result
 * is exactly the current newest-first order.
 *
 * Lives outside any component: Date.now() during render is flagged
 * as impure by the repo's purity lint (same pattern as the
 * TopBusinesses computation on the homepage).
 */
export function sortEventListings<T extends EventFields & { created_at: string }>(
  listings: T[],
): T[] {
  const now = Date.now()
  const upcoming: T[] = []
  const undated: T[] = []
  const past: T[] = []
  for (const l of listings) {
    const s = l.event_starts_at ?? null
    if (!s || Number.isNaN(new Date(s).getTime())) {
      undated.push(l)
      continue
    }
    if (isEventPast(s, l.event_ends_at ?? null, now)) past.push(l)
    else upcoming.push(l)
  }
  upcoming.sort(
    (a, b) => new Date(a.event_starts_at as string).getTime() - new Date(b.event_starts_at as string).getTime(),
  )
  undated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  past.sort(
    (a, b) => new Date(b.event_starts_at as string).getTime() - new Date(a.event_starts_at as string).getTime(),
  )
  return [...upcoming, ...undated, ...past]
}
