import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { username, displayName, email } = await request.json()

    const webhookUrl = process.env.DISCORD_NEW_USER_WEBHOOK_URL
    if (!webhookUrl) {
      console.warn('DISCORD_NEW_USER_WEBHOOK_URL not set, skipping notification')
      return NextResponse.json({ success: false, error: 'Webhook not configured' })
    }

    // Cloudflare provides rich geo headers on every request
    const ip         = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? '—'
    const country    = request.headers.get('cf-ipcountry') ?? '—'
    const city       = request.headers.get('cf-ipcity') ?? '—'
    const region     = request.headers.get('cf-region') ?? '—'
    const timezone   = request.headers.get('cf-timezone') ?? '—'
    const userAgent  = request.headers.get('user-agent') ?? '—'

    // Build a readable location string
    const locationParts = [city, region, country].filter(v => v && v !== '—')
    const locationStr = locationParts.length ? locationParts.join(', ') : '—'

    const embed = {
      title: '🎉 Nuevo Usuario Registrado',
      color: 0x5865f2, // Discord blurple
      fields: [
        { name: 'Nombre',    value: displayName || '—', inline: true },
        { name: 'Usuario',   value: `@${username}`,     inline: true },
        { name: 'Email',     value: email || '—',       inline: false },
        { name: '📍 Ubicación', value: locationStr,     inline: true },
        { name: '🌐 Zona Horaria', value: timezone,     inline: true },
        { name: '🖥️ IP',     value: `\`${ip}\``,        inline: false },
        { name: '🔍 User Agent', value: userAgent.slice(0, 100), inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Ventas Tecate' },
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!res.ok) {
      console.error('Discord webhook error:', res.status, await res.text())
      return NextResponse.json({ success: false }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('discord-notify error:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
