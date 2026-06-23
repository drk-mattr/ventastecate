import PostalMime from 'postal-mime'

/**
 * Cloudflare Email Worker for soporte@ventastecate.com.
 *
 * On each incoming email it:
 *   1. Posts a clean summary to a Discord channel (so the team sees it where
 *      reports/new-users already land), and
 *   2. Forwards the original to a human inbox (Gmail) so you can reply.
 *
 * Configure via Cloudflare → Email Routing → route soporte@ → this Worker.
 * Env: DISCORD_SUPPORT_WEBHOOK (secret), FORWARD_TO (verified destination email).
 */
export default {
  async email(message, env) {
    let subject = '(sin asunto)'
    let bodyText = ''

    // Parse the raw MIME so we get a readable subject + body.
    try {
      const email = await new PostalMime().parse(message.raw)
      subject = email.subject || subject
      bodyText = (email.text || email.html?.replace(/<[^>]+>/g, ' ') || '').trim()
    } catch (err) {
      bodyText = `(no se pudo leer el cuerpo: ${err})`
    }

    // 1) Notify Discord (best-effort — never block the forward on this).
    if (env.DISCORD_SUPPORT_WEBHOOK) {
      try {
        await fetch(env.DISCORD_SUPPORT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [
              {
                title: `📧 ${subject}`.slice(0, 256),
                description: bodyText.slice(0, 3500) || '(sin contenido)',
                color: 0x33302b,
                fields: [
                  { name: 'De', value: String(message.from).slice(0, 256), inline: true },
                  { name: 'Para', value: String(message.to).slice(0, 256), inline: true },
                ],
                timestamp: new Date().toISOString(),
                footer: { text: 'soporte@ventastecate.com' },
              },
            ],
          }),
        })
      } catch (err) {
        console.error('Discord notify failed:', err)
      }
    }

    // 2) Forward to a real inbox so you can read/reply.
    if (env.FORWARD_TO) {
      try {
        await message.forward(env.FORWARD_TO)
      } catch (err) {
        console.error('Forward failed:', err)
      }
    }
  },
}
