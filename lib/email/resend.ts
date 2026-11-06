import { Resend } from 'resend'

// User-supplied strings (names, titles, message text) are escaped
// before going into the HTML, so a stray "<" can never break the
// layout or inject markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendMessageNotification({
  to,
  recipientName,
  senderName,
  listingTitle,
  messagePreview,
  messageUrl,
}: {
  to: string
  recipientName: string
  senderName: string
  listingTitle: string
  messagePreview: string
  messageUrl: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email notification')
    return { success: false, error: 'Email not configured' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  // The footer links to the real setting (Step 5): /profile/edit,
  // where the recipient can turn these emails off. The promise in
  // the footer is now true — there is a real switch behind it.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'
  const settingsUrl = `${appUrl}/profile/edit`

  const safeRecipient = escapeHtml(recipientName)
  const safeSender = escapeHtml(senderName)
  const safeListing = escapeHtml(listingTitle)
  const safePreview = escapeHtml(messagePreview)

  try {
    await resend.emails.send({
      from: 'Ventas Tecate <noreply@ventastecate.com>',
      to,
      subject: `Nuevo mensaje de ${senderName} sobre "${listingTitle}"`,
      text: [
        `Hola ${recipientName},`,
        ``,
        `${senderName} te escribió sobre "${listingTitle}":`,
        ``,
        `"${messagePreview}"`,
        ``,
        `Ver mensaje: ${messageUrl}`,
        ``,
        `Este correo es automático. Si no quieres recibir estos avisos por correo, desactívalos en tu configuración: ${settingsUrl}`,
        `Las notificaciones dentro del sitio seguirán funcionando.`,
      ].join('\n'),
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="margin: 0; padding: 0; background-color: #ffffff;">
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111; max-width: 600px; margin: 0 auto; padding: 24px 20px;">
              <p style="margin: 0 0 8px; font-size: 20px; font-weight: bold; color: #111111;">ventastecate.com</p>
              <div style="border-top: 1px solid #e5e5e5; margin: 0 0 24px;"></div>
              <p style="margin: 0 0 12px;">Hola ${safeRecipient},</p>
              <p style="margin: 0 0 12px;"><strong>${safeSender}</strong> te escribió sobre <strong>&ldquo;${safeListing}&rdquo;</strong>:</p>
              <div style="background-color: #f5f5f5; padding: 16px; border-left: 4px solid #111111; margin: 16px 0;">
                <p style="margin: 0; color: #333333;"><em>${safePreview}</em></p>
              </div>
              <a href="${messageUrl}" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 0 20px;">Ver mensaje</a>
              <p style="margin: 0 0 12px; color: #555555;">Puedes responder directamente desde la plataforma.</p>
              <div style="border-top: 1px solid #e5e5e5; margin: 24px 0 12px;"></div>
              <p style="margin: 0; color: #6b7280; font-size: 12px;">Este correo es automático. Si no quieres recibir estos avisos por correo, desactívalos en <a href="${settingsUrl}" style="color: #111111;">tu configuración</a>.</p>
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 12px;">Las notificaciones dentro del sitio seguirán funcionando.</p>
            </div>
          </body>
        </html>
      `,
    })
    return { success: true }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendReportReply({ to, reportType, reportDescription, replyBody }: {
  to: string
  reportType: string
  reportDescription: string
  replyBody: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping report reply')
    return { success: false, error: 'Email not configured' }
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    await resend.emails.send({
      from: 'Ventas Tecate <noreply@ventastecate.com>',
      to,
      subject: `Ventas Tecate: respuesta a tu reporte (${reportType})`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Ventas Tecate</h2>
          <p>Gracias por tu reporte. Te respondemos:</p>
          <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #111; margin: 15px 0;">${replyBody.replace(/</g, '&lt;')}</div>
          <p style="color: #6b7280; font-size: 13px;">Tu reporte original: ${reportDescription.replace(/</g, '&lt;').slice(0, 500)}</p>
          <p style="color: #6b7280; font-size: 12px;">Este correo es automático y no admite respuestas. Si quieres añadir algo, envía un nuevo reporte desde ventastecate.com.</p>
        </div>
      `,
    })
    return { success: true }
  } catch (error) {
    console.error('Error sending report reply:', error)
    return { success: false, error }
  }
}
