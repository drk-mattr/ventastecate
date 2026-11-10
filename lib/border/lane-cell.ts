// La Garita — pure display rules for one lane CARD (3 split
// cards, A EUA only, above the map). Pure functions only
// (no Next / Supabase imports) so they are unit-testable: the
// card component renders what this returns, nothing more.
//
// A card shows the headline from the same BorderEstimate the
// page already computes — no new data, no new scoring. The card
// is one glance: lane label, minutes big, source + age, lanes
// open, and the open/closed indicator.
//
// Open/closed, in order:
//   1. Outside port hours (6:00–22:00 Tijuana) every card is
//      closed — a daytime snapshot must never read as current
//      at 11 pm. The page passes portOpen (isPortOpen, server
//      time); the card shows "Cerrado" + "abre 6 am".
//   2. During port hours a lane is closed only when CBP's own
//      freshest snapshot for that lane says operational_status
//      "Lanes Closed" — the status is already stored by the
//      sync (migration 049) and carried on estimate.cbp, so this
//      is UI-only, no migration. "Update Pending" is NOT closed:
//      it means CBP posted no number yet, and the estimate
//      already shows "— sin datos". A closed card shows
//      "Cerrado" INSTEAD of any minutes — never a stale number
//      as if it were current.

// Type-only import: erased at compile time, so it needs no
// runtime resolution. The two display formatters below are
// local copies of lib/border/estimate.ts's formatAge/formatWait
// (the source of truth) — a runtime import would break either
// tsc (which forbids '.ts' extensions) or node --test (whose
// type-stripping resolver requires them). Keep them in sync;
// garita-feed-tests.mjs asserts the outputs match estimate.ts.
import type { BorderDirection, BorderEstimate } from './estimate'

function formatAge(ageMinutes: number | null): string {
  if (ageMinutes === null) return 'sin datos'
  if (ageMinutes < 1) return 'ahora mismo'
  if (ageMinutes < 60) return `hace ${ageMinutes} min`
  if (ageMinutes < 1440) return `hace ${Math.floor(ageMinutes / 60)} h`
  return `hace ${Math.floor(ageMinutes / 1440)} d`
}

function formatWait(minutes: number): string {
  return minutes <= 0 ? 'Sin espera' : `${minutes} min`
}

export type LaneCardDisplay = {
  /** Closed (outside port hours, or CBP "Lanes Closed"). */
  closed: boolean
  /** Why closed, for the meta line: 'port' -> "abre 6 am";
   *  'lane' -> the CBP source + age of the closed status. */
  closedReason: 'port' | 'lane' | null
  /** "60 min" / "Sin espera" / "— sin datos" / "Cerrado". */
  minutesLabel: string
  /** How big the minutes render: 'big' for a current number,
   *  'small' for a demoted last-known number, 'none' when there
   *  is no number at all (or the card is closed). */
  minutesTone: 'big' | 'small' | 'none'
  /** Source + age line, or null. Short form — it renders under
   *  the minutes. "CBP · hace 27 min" /
   *  "Comunidad · hace 8 min · 1 persona" /
   *  "Último dato · CBP · hace 2 h" (demoted). */
  sourceLine: string | null
  /** Lanes open, CBP headline only ("2 carriles"). */
  lanesLine: string | null
  /** The CBP side-by-side, community headline only
   *  ("CBP: 60 min · hace 27 min"). */
  cbpLine: string | null
  /** True when the headline is an en_fila median — people still
   *  in line, a lower bound; rendered inline as "y contando". */
  counting: boolean
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

/** CBP's own per-lane status, verbatim from the freshest
 *  snapshot. Observed values in prod: "delay", "no delay",
 *  "Update Pending", "Lanes Closed". Only the last one closes
 *  a lane; the comparison is case-insensitive because CBP's
 *  casing is their choice, not ours. */
function isLaneClosedByCbp(estimate: BorderEstimate): boolean {
  const status = estimate.cbp?.operational_status
  return (
    typeof status === 'string' && status.trim().toLowerCase() === 'lanes closed'
  )
}

/**
 * Display rules for one lane card. Short source strings — the
 * card is ~120 px wide on a phone, so each line is one short
 * fact and wraps are expected, never a paragraph.
 */
export function laneCardDisplay(
  estimate: BorderEstimate,
  direction: BorderDirection,
  portOpen: boolean,
): LaneCardDisplay {
  if (!portOpen) {
    // Outside 6:00–22:00 Tijuana every lane is closed, whatever
    // the last snapshot said — the hours, not yesterday's
    // numbers, are the answer.
    return {
      closed: true,
      closedReason: 'port',
      minutesLabel: 'Cerrado',
      minutesTone: 'none',
      sourceLine: null,
      lanesLine: null,
      cbpLine: null,
      counting: false,
    }
  }

  if (isLaneClosedByCbp(estimate)) {
    // CBP says this lane is closed. The minutes (if any) are
    // from before the closure — never shown as current.
    return {
      closed: true,
      closedReason: 'lane',
      minutesLabel: 'Cerrado',
      minutesTone: 'none',
      sourceLine: `CBP · ${formatAge(estimate.cbpAgeMinutes)}`,
      lanesLine: null,
      cbpLine: null,
      counting: false,
    }
  }

  if (estimate.state === 'none') {
    // A 'none' estimate can still carry last-known minutes
    // (shown demoted with its age); with nothing at all there
    // is no number — never a fake one.
    if (estimate.minutes !== null) {
      return {
        closed: false,
        closedReason: null,
        minutesLabel: '— sin datos',
        minutesTone: 'none',
        sourceLine: `Último dato: ${formatWait(estimate.minutes)} · ${formatAge(estimate.ageMinutes)}`,
        lanesLine: null,
        cbpLine: null,
        counting: false,
      }
    }
    return {
      closed: false,
      closedReason: null,
      minutesLabel: '— sin datos',
      minutesTone: 'none',
      sourceLine: null,
      lanesLine: null,
      cbpLine: null,
      counting: false,
    }
  }

  if (estimate.state === 'last-known') {
    return {
      closed: false,
      closedReason: null,
      minutesLabel: formatWait(estimate.minutes ?? 0),
      minutesTone: 'small',
      sourceLine:
        estimate.source === 'community'
          ? `Último dato · Comunidad · ${formatAge(estimate.ageMinutes)}`
          : `Último dato · CBP · ${formatAge(estimate.ageMinutes)}`,
      lanesLine: null,
      cbpLine: null,
      counting: false,
    }
  }

  // state === 'current'
  const sourceLine =
    estimate.source === 'community'
      ? `Comunidad · ${formatAge(estimate.ageMinutes)} · ${estimate.reportCount} ${plural(
          estimate.reportCount,
          'persona',
          'personas',
        )}`
      : `CBP · ${formatAge(estimate.ageMinutes)}`
  const lanesLine =
    estimate.source === 'cbp' &&
    estimate.cbp?.lanes_open !== null &&
    estimate.cbp?.lanes_open !== undefined
      ? `${estimate.cbp.lanes_open} ${plural(estimate.cbp.lanes_open, 'carril', 'carriles')}`
      : null
  // Official and community side by side, always (norte): when
  // the headline is community, the CBP reading stays visible
  // as one small line — the reader never loses the official
  // number.
  const cbpLine =
    estimate.source === 'community' &&
    direction === 'norte' &&
    estimate.cbp?.delay_minutes !== null &&
    estimate.cbp?.delay_minutes !== undefined
      ? `CBP: ${formatWait(estimate.cbp.delay_minutes)} · ${formatAge(estimate.cbpAgeMinutes)}`
      : null
  return {
    closed: false,
    closedReason: null,
    minutesLabel: formatWait(estimate.minutes ?? 0),
    minutesTone: 'big',
    sourceLine,
    lanesLine,
    cbpLine,
    counting: estimate.isCounting,
  }
}
