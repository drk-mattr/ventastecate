import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { messageReportSchema } from '@/lib/validation'
import { sanitizeDiscordText } from '@/lib/discord'
import { isMissingObjectError } from '@/lib/messages/safety'

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Acoso',
  scam: 'Fraude o estafa',
  offensive: 'Contenido ofensivo',
  other: 'Otro motivo',
}

/**
 * Messaging v2 Step 4 — report a conversation. Reuses the reports
 * system (023): the report is stored first in the reports table
 * (visible in /admin/reports for the superadmin), and a Discord
 * alert goes out best-effort, same as /api/report. Reporting hides
 * or blocks nothing by itself — the thread stays readable.
 *
 * Pre-031 the reports.conversation_id column does not exist: the
 * insert is retried without the link (Step 3's pre-030 pattern),
 * so the report still reaches the inbox, just unlinked.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = messageReportSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Error de configuración' }, { status: 503 })
  }

  const { id } = await params
  const { data: conv, error: convError } = await admin
    .from('conversations')
    .select('id, buyer_id, seller_id, listing_id, listing_title')
    .eq('id', id)
    .maybeSingle()
  if (convError || !conv) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
  }
  if (conv.buyer_id !== user.id && conv.seller_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single()
  const reporterLabel = profile
    ? `${profile.display_name} (@${profile.username})`
    : 'Anónimo'

  const type = `message_${parsed.data.reason}`
  const baseInsert = {
    type,
    description: parsed.data.description || null,
    listing_id: conv.listing_id ?? null,
    listing_title: conv.listing_title ?? null,
    reporter_id: user.id,
    reporter_label: reporterLabel,
    status: 'new',
  }

  // Store first, so a Discord failure can never lose the report.
  let { data: inserted, error: insertError } = await admin
    .from('reports')
    .insert({ ...baseInsert, conversation_id: id })
    .select('id')
    .single()

  if (insertError && isMissingObjectError(insertError)) {
    // Pre-031 database: no conversation_id column yet. Retry
    // without the link rather than losing the report.
    const retry = await admin.from('reports').insert(baseInsert).select('id').single()
    inserted = retry.data
    insertError = retry.error
  }

  if (insertError || !inserted) {
    console.error('Message report insert error:', insertError?.message)
    return NextResponse.json({ error: 'No se pudo enviar el reporte' }, { status: 500 })
  }

  // Best-effort Discord alert, same as /api/report. A failure here
  // never fails the report — it is already stored.
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (webhookUrl) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: '🚩 Reporte de conversación — Ventas Tecate',
            description: parsed.data.description
              ? sanitizeDiscordText(parsed.data.description, 2000)
              : '—',
            color: 0xff4444,
            fields: [
              { name: '🗂️ Reporte', value: `${appUrl}/admin/reports/${inserted.id}`, inline: false },
              { name: '💬 Conversación', value: `${appUrl}/messages?conversation=${id}`, inline: false },
              ...(conv.listing_title
                ? [{ name: '🏷️ Anuncio', value: sanitizeDiscordText(conv.listing_title, 200), inline: false }]
                : []),
              { name: '🚩 Motivo', value: REASON_LABELS[parsed.data.reason] ?? parsed.data.reason, inline: true },
              { name: 'Usuario', value: sanitizeDiscordText(reporterLabel, 100), inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    }).catch((err) => console.error('Discord webhook error:', err))
  }

  return NextResponse.json({ success: true, reportId: inserted.id })
}
