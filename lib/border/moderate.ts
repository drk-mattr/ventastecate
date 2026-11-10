// Server-only shared hide/restore core for border posts.
// Used by the internal (bearer) route and the admin (superadmin
// session) route. Hide is reversible only: hidden_at is set or
// cleared, never delete. Reason required, logged to
// moderation_log (migration 051 added the border target there).
// The log insert is best-effort — a failed log never blocks the
// hide/restore itself, same as the listing moderate route.
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export async function setBorderReportHidden(
  admin: AdminClient,
  opts: { reportId: string; action: 'hide' | 'restore'; reason: string; actor: string },
): Promise<{ ok: boolean; error?: string; logged: boolean; hidden: boolean }> {
  const { reportId, action, reason, actor } = opts
  const { data: report, error: fetchError } = await admin
    .from('border_line_reports')
    .select('id')
    .eq('id', reportId)
    .maybeSingle()
  if (fetchError) {
    return { ok: false, error: 'No se pudo verificar el reporte', logged: false, hidden: false }
  }
  if (!report) {
    return { ok: false, error: 'Reporte no encontrado', logged: false, hidden: false }
  }
  const hiddenAt = action === 'hide' ? new Date().toISOString() : null
  const { error: updateError } = await admin
    .from('border_line_reports')
    .update({ hidden_at: hiddenAt })
    .eq('id', reportId)
  if (updateError) {
    return { ok: false, error: 'No se pudo actualizar el reporte', logged: false, hidden: false }
  }
  const { error: logError } = await admin.from('moderation_log').insert({
    border_report_id: reportId,
    action,
    reason,
    actor,
  })
  return { ok: true, logged: !logError, hidden: action === 'hide' }
}
