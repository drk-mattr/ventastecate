import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessageNotification } from '@/lib/email/resend'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageId } = await request.json()

    const supabase = await createClient()

    // Get the conversation details
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        *,
        listing:listings(id, title),
        buyer:buyer_id(id, username, display_name, email),
        seller:seller_id(id, username, display_name, email)
      `)
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Get the message
    const { data: message } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Get sender profile
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', message.sender_id)
      .single()

    // Determine recipient (opposite of sender)
    const recipient = message.sender_id === conversation.buyer_id 
      ? conversation.seller 
      : conversation.buyer

    // Get recipient's email from auth.users
    const { data: { user: recipientUser } } = await supabase.auth.admin.getUserById(recipient.id)

    if (!recipientUser?.email) {
      return NextResponse.json({ error: 'Recipient email not found' }, { status: 404 })
    }

    // Send email notification
    const messagePreview = message.content.length > 100 
      ? message.content.substring(0, 100) + '...'
      : message.content

    const messageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'}/messages?conversation=${conversationId}`

    const result = await sendMessageNotification({
      to: recipientUser.email,
      recipientName: recipient.display_name,
      senderName: sender?.display_name || 'Un usuario',
      listingTitle: conversation.listing.title,
      messagePreview,
      messageUrl,
    })

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in send-message-notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
