// La Garita restructure — pure display rules for one cell of the
// compact lane table (3 rows, A EUA only). Pure functions only
// (no Next / Supabase imports) so they are unit-testable: the
// table component renders what this returns, nothing more.
//
// A cell shows the headline from the same BorderEstimate the
// page already computes — no new data, no new scoring. The table
// is one object; the cell is one glance: minutes, source + age,
// and at most two extra lines (agreement, CBP side-by-side).

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

export type LaneCellDisplay = {
  /** "75 min" / "Último dato: 45 min" / "— sin datos". */
  minutesLabel: string
  /** How big the minutes render: 'big' for a current number,
   *  'small' for a demoted last-known number, 'none' when there
   *  is no number at all. */
  minutesTone: 'big' | 'small' | 'none'
  /** Source + age line, or null. */
  sourceLine: string | null
  /** Extra lines, in order: agreement, then the CBP side-by-side
   *  (Auto/norte only, when the headline is community). */
  extraLines: string[]
  /** True when the headline is an en_fila median — people still
   *  in line, a lower bound; rendered inline as "y contando". */
  counting: boolean
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

/**
 * Display rules for one table cell. `showAgreement` is true only
 * for the Auto/norte cell — the agreement line ("2 de 3
 * coinciden…") belongs there once, not once per cell.
 */
export function laneCellDisplay(
  estimate: BorderEstimate,
  direction: BorderDirection,
  showAgreement: boolean,
): LaneCellDisplay {
  if (estimate.state === 'none') {
    // A 'none' estimate can still carry last-known minutes
    // (shown demoted with its age); with nothing at all there
    // is no number — never a fake one.
    if (estimate.minutes !== null) {
      return {
        minutesLabel: '— sin datos',
        minutesTone: 'none',
        sourceLine: `Último dato: ${formatWait(estimate.minutes)} · ${formatAge(estimate.ageMinutes)}`,
        extraLines: [],
        counting: false,
      }
    }
    return {
      minutesLabel: '— sin datos',
      minutesTone: 'none',
      sourceLine: null,
      extraLines: [],
      counting: false,
    }
  }

  if (estimate.state === 'last-known') {
    return {
      minutesLabel: `Último dato: ${formatWait(estimate.minutes ?? 0)}`,
      minutesTone: 'small',
      sourceLine:
        estimate.source === 'community'
          ? `Comunidad · ${formatAge(estimate.ageMinutes)}`
          : `CBP oficial · ${formatAge(estimate.ageMinutes)}`,
      extraLines: [],
      counting: false,
    }
  }

  // state === 'current'
  const extraLines: string[] = []
  if (showAgreement && estimate.agreement) extraLines.push(estimate.agreement)
  const sourceLine =
    estimate.source === 'community'
      ? `Comunidad · ${formatAge(estimate.ageMinutes)} · ${estimate.reportCount} ${plural(
          estimate.reportCount,
          'persona',
          'personas',
        )}`
      : `CBP oficial · ${formatAge(estimate.ageMinutes)}${
          estimate.cbp?.lanes_open !== null && estimate.cbp?.lanes_open !== undefined
            ? ` · ${estimate.cbp.lanes_open} ${plural(estimate.cbp.lanes_open, 'carril abierto', 'carriles abiertos')}`
            : ''
        }`
  // Official and community side by side, always (norte): when
  // the headline is community, the CBP reading stays visible
  // as one small line — the reader never loses the official
  // number.
  if (
    estimate.source === 'community' &&
    direction === 'norte' &&
    estimate.cbp?.delay_minutes !== null &&
    estimate.cbp?.delay_minutes !== undefined
  ) {
    extraLines.push(
      `CBP: ${formatWait(estimate.cbp.delay_minutes)} · ${formatAge(estimate.cbpAgeMinutes)}`,
    )
  }
  return {
    minutesLabel: formatWait(estimate.minutes ?? 0),
    minutesTone: 'big',
    sourceLine,
    extraLines,
    counting: estimate.isCounting,
  }
}
