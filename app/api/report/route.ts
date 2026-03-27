import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'


const TYPE_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  suggestion: '💡 Sugerencia',
  other: '📝 Otro',
}

export async function POST(request: NextRequest) {
  try {
    const { type, description, email } = await request.json()

    if (!description || !type) {
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

    // Cloudflare geo headers
    const ip       = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? '—'
    const country  = request.headers.get('cf-ipcountry') ?? '—'
    const city     = request.headers.get('cf-ipcity') ?? '—'
    const region   = request.headers.get('cf-region') ?? '—'
    const timezone = request.headers.get('cf-timezone') ?? '—'
    const ua       = request.headers.get('user-agent') ?? '—'

    const locationParts = [city, region, country].filter(v => v && v !== '—')
    const locationStr = locationParts.length ? locationParts.join(', ') : '—'

    // Send to Discord
    const embed = {
      title: `${TYPE_LABELS[type] || type} — Ventas Tecate`,
      description: description.slice(0, 2000),
      color: type === 'bug' ? 0xff4444 : type === 'suggestion' ? 0x4488ff : 0x888888,
      fields: [
        { name: 'Usuario',       value: username,              inline: true },
        ...(email ? [{ name: 'Email', value: email,            inline: true }] : []),
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
