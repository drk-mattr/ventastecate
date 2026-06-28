import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reportSchema } from '@/lib/validation'
import { sanitizeDiscordText, sanitizeEmailForDisplay } from '@/lib/discord'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const TYPE_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  suggestion: '💡 Sugerencia',
  other: '📝 Otro',
  // Listing report reasons
  spam: '🚫 Spam o duplicado',
  scam: '⚠️ Fraude o estafa',
  prohibited: '🚷 Artículo prohibido',
  offensive: '😡 Contenido ofensivo',
  listing_other: '📝 Otro motivo',
}

export async function POST(request: NextRequest) {
  try {
    // Rate-limit to curb webhook flooding of the moderation channel.
    const ip = clientIp(request.headers)
    const limit = rateLimit(`report:${ip}`, 10, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados envíos, intenta más tarde' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      )
    }

    const parsed = reportSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const { type, description, email, listingId, listingTitle } = parsed.data

    // A listing report is identified by listingId; for those, a reason (type) is
    // enough and the description is optional. For general feedback, both type and
    // description are required (unchanged behavior).
    const isListingReport = Boolean(listingId)
    if (!type || (!isListingReport && !description)) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Get current user info if logged in
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let username = 'Anónimo'
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single()
      if (profile) {
        username = `${profile.display_name} (@${profile.username})`
      }
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_URL not set')
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    // Cloudflare geo headers (ip already resolved above)
    const country  = request.headers.get('cf-ipcountry') ?? '—'
    const city     = request.headers.get('cf-ipcity') ?? '—'
    const region   = request.headers.get('cf-region') ?? '—'
    const timezone = request.headers.get('cf-timezone') ?? '—'
    const ua       = request.headers.get('user-agent') ?? '—'

    const locationParts = [city, region, country].filter(v => v && v !== '—')
    const locationStr = locationParts.length ? locationParts.join(', ') : '—'

    // Deep link to the reported listing (for one-click moderation triage)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'
    const listingUrl = isListingReport ? `${appUrl}/listings/${listingId}` : null

    // Send to Discord
    const embed = {
      title: isListingReport
        ? `🚩 Reporte de anuncio — Ventas Tecate`
        : `${TYPE_LABELS[type] || type} — Ventas Tecate`,
      description: description ? sanitizeDiscordText(description, 2000) : '—',
      color: isListingReport ? 0xff4444 : type === 'bug' ? 0xff4444 : type === 'suggestion' ? 0x4488ff : 0x888888,
      fields: [
        ...(isListingReport ? [
          { name: '🏷️ Anuncio',  value: sanitizeDiscordText(listingTitle, 200), inline: false },
          { name: '🔗 Enlace',   value: listingUrl as string,  inline: false },
          { name: '🚩 Motivo',   value: TYPE_LABELS[type] || type, inline: true },
        ] : []),
        { name: 'Usuario',       value: sanitizeDiscordText(username, 100), inline: true },
        ...(sanitizeEmailForDisplay(email) ? [{ name: 'Email', value: sanitizeEmailForDisplay(email)!, inline: true }] : []),
        { name: '📍 Ubicación',  value: locationStr,           inline: false },
        { name: '🌐 Zona Horaria', value: timezone,            inline: true },
        { name: '🖥️ IP',         value: `\`${ip}\``,           inline: true },
        { name: '🔍 User Agent', value: ua.slice(0, 100),      inline: false },
      ],
      timestamp: new Date().toISOString(),
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!res.ok) {
      console.error('Discord webhook error:', res.status)
      return NextResponse.json({ error: 'Error al enviar reporte' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
