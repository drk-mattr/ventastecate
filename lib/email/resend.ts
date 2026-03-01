import { Resend } from 'resend'

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

  try {
    await resend.emails.send({
      from: 'Ventas Tecate <noreply@ventastecate.com>',
      to,
      subject: `Nuevo mensaje de ${senderName} sobre "${listingTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9fafb; padding: 20px; margin: 20px 0; }
              .message-preview { background-color: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
              .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Ventas Tecate</h1>
              </div>
              <div class="content">
                <h2>¡Hola ${recipientName}!</h2>
                <p><strong>${senderName}</strong> te ha enviado un mensaje sobre tu anuncio:</p>
                <p><strong>"${listingTitle}"</strong></p>
                
                <div class="message-preview">
                  <p><em>${messagePreview}</em></p>
                </div>
                
                <a href="${messageUrl}" class="button">Ver Mensaje Completo</a>
                
                <p>Puedes responder directamente desde la plataforma.</p>
              </div>
              <div class="footer">
                <p>Este es un correo automático de Ventas Tecate</p>
                <p>Si no deseas recibir notificaciones, puedes desactivarlas en tu configuración</p>
              </div>
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
