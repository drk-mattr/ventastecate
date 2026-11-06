// Items engine — activity_score + confidence gates (§7.1, §7.3,
// §11.3, 034D).
//
// The score itself lives in PostgreSQL (migration 035:
// item_activity + item_activity_scope). This helper only calls
// those functions and applies the §11.3 thresholds. It never
// invents a score: if the migration has not been applied yet, the
// RPC fails and the caller gets available: false — the page then
// renders its 034C unranked state (no trending section, no rank
// numbers, no crash). No recommendation_score exists anywhere.
//
// Gates (§11.3):
//   - Tecate / Alrededores (the home region): >= 3 scoring items.
//   - Every other region, and 'Todas' (no single place node, so
//     the region rule is its floor): >= 5 scoring items, >= 2
//     towns, >= 5 distinct users.
//   - At every level above town: the leader's mentions must come
//     from >= 3 distinct contributors, or the ranking does not
//     render at all.
// Fail closed: when the gate does not pass, the page shows the
// mentions without a numbered ranking (§7.3).

import type { SupabaseClient } from '@supabase/supabase-js'

export type ItemActivityRow = {
  itemId: string
  businessId: string
  kindId: string
  town: string | null
  score: number
  mentions: number
  contributors: number
  latestMentionAt: string | null
}

export type ActivityGate = {
  level: 'tecate' | 'region'
  requiredItems: number
  requiredTowns: number
  requiredUsers: number
  scoringItems: number
  towns: number
  distinctUsers: number
  leaderContributors: number
  passes: boolean
}

export type ItemActivity = {
  rows: ItemActivityRow[]
  gate: ActivityGate
  available: boolean
}

const ACTIVITY_WINDOW_DAYS = 30
const MIN_LEADER_CONTRIBUTORS = 3
const TRENDING_LIMIT = 10

export { TRENDING_LIMIT }

export function gateRuleForRegion(regionLabel: string): {
  level: 'tecate' | 'region'
  requiredItems: number
  requiredTowns: number
  requiredUsers: number
} {
  if (regionLabel === 'Tecate' || regionLabel === 'Alrededores') {
    return { level: 'tecate', requiredItems: 3, requiredTowns: 0, requiredUsers: 0 }
  }
  return { level: 'region', requiredItems: 5, requiredTowns: 2, requiredUsers: 5 }
}

function emptyGate(rule: ReturnType<typeof gateRuleForRegion>): ActivityGate {
  return {
    level: rule.level,
    requiredItems: rule.requiredItems,
    requiredTowns: rule.requiredTowns,
    requiredUsers: rule.requiredUsers,
    scoringItems: 0,
    towns: 0,
    distinctUsers: 0,
    leaderContributors: 0,
    passes: false,
  }
}

export async function fetchItemActivity(
  admin: SupabaseClient,
  kindIds: string[],
  towns: string[] | null,
  regionLabel: string,
): Promise<ItemActivity> {
  const rule = gateRuleForRegion(regionLabel)
  const unavailable: ItemActivity = { rows: [], gate: emptyGate(rule), available: false }
  if (kindIds.length === 0) return unavailable

  // Migration 035 not applied yet → the function does not exist and
  // the RPC errors. That is the expected cold state: report it, do
  // not throw, do not fake a score.
  const { data, error } = await admin.rpc('item_activity', {
    p_kind_ids: kindIds,
    p_towns: towns,
    p_days: ACTIVITY_WINDOW_DAYS,
  })
  if (error || !data) return unavailable
  const rows: ItemActivityRow[] = ((data as unknown[]) || []).map((r) => {
    const row = r as Record<string, unknown>
    return {
      itemId: String(row.item_id ?? ''),
      businessId: String(row.business_id ?? ''),
      kindId: String(row.kind_id ?? ''),
      town: (row.town as string | null) ?? null,
      score: Number(row.score ?? 0),
      mentions: Number(row.mentions ?? 0),
      contributors: Number(row.contributors ?? 0),
      latestMentionAt: (row.latest_mention_at as string | null) ?? null,
    }
  })

  const { data: scopeData, error: scopeError } = await admin.rpc('item_activity_scope', {
    p_kind_ids: kindIds,
    p_towns: towns,
    p_days: ACTIVITY_WINDOW_DAYS,
  })
  if (scopeError || !scopeData) return unavailable
  const scope = (Array.isArray(scopeData) ? scopeData[0] : scopeData) as Record<
    string,
    unknown
  >
  const gate: ActivityGate = {
    level: rule.level,
    requiredItems: rule.requiredItems,
    requiredTowns: rule.requiredTowns,
    requiredUsers: rule.requiredUsers,
    scoringItems: Number(scope?.scoring_items ?? rows.length),
    towns: Number(scope?.towns ?? new Set(rows.map((r) => r.town).filter(Boolean)).size),
    distinctUsers: Number(scope?.distinct_users ?? 0),
    leaderContributors: rows[0]?.contributors ?? 0,
    passes: false,
  }
  gate.passes =
    gate.scoringItems >= rule.requiredItems &&
    gate.towns >= rule.requiredTowns &&
    gate.distinctUsers >= rule.requiredUsers &&
    gate.leaderContributors >= MIN_LEADER_CONTRIBUTORS
  return { rows, gate, available: true }
}
