import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username, displayName, email } = await request.json()

    const webhookUrl = process.env.DISCORD_NEW_USER_WEBHOOK_URL
    if (!webhookUrl) {
      console.warn('DISCORD_NEW_USER_WEBHOOK_URL not set, skipping notification')
      return NextResponse.json({ success: false, error: 'Webhook not configured' })
    }

    const embed = {
      title: '🎉 Nuevo Usuario Registrado',
      color: 0x5865f2, // Discord blurple
      fields: [
        { name: 'Nombre', value: displayName || '—', inline: true },
        { name: 'Usuario', value: `@${username}`, inline: true },
        { name: 'Email', value: email || '—', inline: false },
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
