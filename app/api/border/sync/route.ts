import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// CBP Border Wait Times, port 250501 (Tecate). No key, no auth,
// public domain — cite CBP as the source on the page.
// Shape (verified live 2026-11-09): a top-level JSON array of
// port objects; each lane group carries standard_lanes with
// { update_time, operational_status, delay_minutes, lanes_open }
// as STRINGS — delay_minutes is "" when the lane posts nothing
// ("Update Pending") or the lane does not exist ("N/A").
// Tecate has NO SENTRI / Ready Lane — those read "N/A" and are
// never stored or shown.
const CBP_URL = 'https://bwt.cbp.gov/api/bwtnew'
const TECATE_PORT = '250501'

type CbpLaneGroup = {
  standard_lanes?: {
    update_time?: string
    operational_status?: string
    delay_minutes?: string
    lanes_open?: string
  }
}

type CbpPort = {
  port_number?: string
  port_status?: string
  passenger_vehicle_lanes?: CbpLaneGroup
  pedestrian_lanes?: CbpLaneGroup
  commercial_vehicle_lanes?: CbpLaneGroup
}

function authorized(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_POST_TOKEN
  if (!expected) return false
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return false
  const token = header.slice('Bearer '.length)
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

function parseIntOrNull(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

// POST /api/border/sync — cron-called every 30 min (Muse runtime
// cron, same pattern as the FeLiNo runonce). Bearer-guarded with
// INTERNAL_POST_TOKEN, like the internal endpoints. Fetches the
// CBP feed, extracts port 250501, stores one snapshot row per
// lane (auto / peatonal / comercial). A lane with no reading
// ("Update Pending") is still stored, with delay_minutes null —
// a gap is data, not a missing row. Fails loudly (502 + log)
// when CBP is unreachable or Tecate is absent, so the page can
// say "CBP sin actualizar desde hace X" instead of serving a
// stale snapshot as if it were fresh.
export async function POST(request: NextRequest) {
  try {
    if (!authorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 503 })
    }

    let ports: CbpPort[]
    try {
      const res = await fetch(CBP_URL, {
        headers: {
          // A browser UA: some CDNs 403 bare fetch clients.
          'User-Agent':
            'Mozilla/5.0 (compatible; VentasTecate/1.0; +https://ventastecate.com/garita)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) {
        console.error('border sync: CBP fetch failed', res.status)
        return NextResponse.json(
          { error: `CBP respondió ${res.status}` },
          { status: 502 },
        )
      }
      const json: unknown = await res.json()
      if (!Array.isArray(json)) {
        console.error('border sync: CBP returned a non-array payload')
        return NextResponse.json({ error: 'Respuesta de CBP inválida' }, { status: 502 })
      }
      ports = json as CbpPort[]
    } catch (err) {
      console.error('border sync: CBP fetch error', err)
      return NextResponse.json({ error: 'No se pudo contactar a CBP' }, { status: 502 })
    }

    const tecate = ports.find((p) => p.port_number === TECATE_PORT)
    if (!tecate) {
      console.error('border sync: port 250501 absent from CBP feed')
      return NextResponse.json(
        { error: 'CBP no reporta Tecate en este momento' },
        { status: 502 },
      )
    }

    const lanes = [
      { lane: 'auto', group: tecate.passenger_vehicle_lanes },
      { lane: 'peatonal', group: tecate.pedestrian_lanes },
      { lane: 'comercial', group: tecate.commercial_vehicle_lanes },
    ] as const

    const rows = lanes.map(({ lane, group }) => {
      const std = group?.standard_lanes
      return {
        lane,
        source: 'cbp',
        delay_minutes: parseIntOrNull(std?.delay_minutes),
        lanes_open: parseIntOrNull(std?.lanes_open),
        operational_status: std?.operational_status || null,
        cbp_update_time: std?.update_time || null,
      }
    })

    const { error: insertError } = await admin.from('border_line_snapshots').insert(rows)
    if (insertError) {
      if (
        insertError.code === '42P01' ||
        insertError.code === '42703' ||
        insertError.code === 'PGRST204'
      ) {
        return NextResponse.json(
          { error: 'La garita aún no está activada (falta aplicar la migración 049)' },
          { status: 503 },
        )
      }
      console.error('border sync: snapshot insert failed', insertError.message)
      return NextResponse.json({ error: 'No se pudieron guardar los datos' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      inserted: rows.length,
      port_status: tecate.port_status ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
