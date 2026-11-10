import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  estimateLane,
  type BorderLane,
  type BorderReportInput,
  type CbpSnapshotInput,
} from '@/lib/border/estimate'

// GET /api/border/current — the Garita headline for the header
// chip: all three lanes heading north, each computed with the
// exact same §4 ladder as /garita (lib/border/estimate.ts).
// Public data, same as the page — no auth. Response:
//   { lanes: { auto: {...}, peatonal: {...}, comercial: {...} } }
// where each lane is:
//   { minutes, ageMinutes, source: 'community'|'cbp'|null,
//     isCounting, hasCurrent }
// hasCurrent is true only when the estimate is fresh (< 60 min);
// anything older returns hasCurrent false and the chip renders
// plain "Garita" with no time — a stale number is never shown
// as current. isCounting is true when the headline is an en_fila
// median (people still in line — a lower bound, never a total).
// Reads fail soft to hasCurrent false: before migration 049 the
// tables don't exist, and the chip must degrade, not 500.
// The chip is the route's only caller, so the shape change is
// safe inside this PR.
const LANES: BorderLane[] = ['auto', 'peatonal', 'comercial']

type LaneCurrent = {
  minutes: number | null
  ageMinutes: number | null
  source: 'community' | 'cbp' | null
  isCounting: boolean
  hasCurrent: boolean
}

const EMPTY_LANE: LaneCurrent = {
  minutes: null,
  ageMinutes: null,
  source: null,
  isCounting: false,
  hasCurrent: false,
}

function emptyResponse() {
  return {
    lanes: {
      auto: { ...EMPTY_LANE },
      peatonal: { ...EMPTY_LANE },
      comercial: { ...EMPTY_LANE },
    },
  }
}

export async function GET() {
  const now = new Date()
  try {
    const supabase = await createClient()

    const [snapRes, repRes, voteRes] = await Promise.all([
      supabase
        .from('border_line_snapshots')
        .select('lane, delay_minutes, lanes_open, operational_status, cbp_update_time, fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(300),
      supabase
        .from('border_line_reports')
        .select('id, lane, direction, wait_minutes, status, created_at, user_id')
        .eq('direction', 'norte')
        // Moderator-hidden posts leave the estimate (migration 051).
        .is('hidden_at', null)
        .order('created_at', { ascending: false })
        .limit(600),
      supabase
        .from('border_line_votes')
        .select('report_id, vote, created_at')
        .gte('created_at', new Date(now.getTime() - 30 * 60 * 1000).toISOString())
        .limit(1000),
    ])

    if (snapRes.error || repRes.error || voteRes.error) {
      return NextResponse.json(emptyResponse(), {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const votesByReport = new Map<string, { confirms: number; denies: number }>()
    for (const v of voteRes.data ?? []) {
      const entry = votesByReport.get(v.report_id) ?? { confirms: 0, denies: 0 }
      if (v.vote === 'confirma') entry.confirms += 1
      else entry.denies += 1
      votesByReport.set(v.report_id, entry)
    }

    const reportInputs: BorderReportInput[] = (repRes.data ?? []).map((r) => ({
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
    for (const s of (snapRes.data ?? []) as CbpSnapshotInput[]) {
      if (!cbpByLane.has(s.lane)) cbpByLane.set(s.lane, s)
    }

    const lanes: Record<BorderLane, LaneCurrent> = {
      auto: { ...EMPTY_LANE },
      peatonal: { ...EMPTY_LANE },
      comercial: { ...EMPTY_LANE },
    }
    for (const lane of LANES) {
      const estimate = estimateLane(lane, 'norte', reportInputs, cbpByLane.get(lane) ?? null, now)
      const hasCurrent = estimate.state === 'current' && estimate.minutes !== null
      lanes[lane] = {
        minutes: hasCurrent ? estimate.minutes : null,
        ageMinutes: hasCurrent ? estimate.ageMinutes : null,
        source: hasCurrent ? estimate.source : null,
        isCounting: hasCurrent ? estimate.isCounting : false,
        hasCurrent,
      }
    }

    return NextResponse.json(
      { lanes },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(emptyResponse(), {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
