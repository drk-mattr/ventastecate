/**
 * Cloudflare Email Worker for hola@ventastecate.com.
 *
 * On each incoming mail it:
 *   1. Posts a parsed alert to the app (/api/internal/email-alert), so the
 *      mail also lands on the admin-only /admin/alerts page, and
 *   2. Forwards the original to Gmail so it can be read and replied to.
 *
 * The two steps are independent: each is wrapped in its own try/catch,
 * and a failure to save the alert never blocks the forward — mail must
 * still reach Gmail.
 *
 * This is a SEPARATE Worker from the site (ventastecate) — deploy it on
 * its own. Env: INTERNAL_POST_TOKEN (secret, same value as the site
 * Worker's secret). No other secrets; the forward address is fixed.
 */

// Minimal local types: this worker is a standalone project without
// @cloudflare/workers-types, and the repo's tsc also checks this file.
type EmailMessage = {
  readonly from: string
  readonly to: string
  readonly headers: Headers
  readonly raw: ReadableStream<Uint8Array>
  readonly forward: (to: string) => Promise<void>
}

type MailEnv = {
  INTERNAL_POST_TOKEN?: string
}

const ALERT_ENDPOINT = 'https://ventastecate.com/api/internal/email-alert'
const FORWARD_TO = 'rovelo.ga@gmail.com'
const MAX_BODY_CHARS = 8000

/** Split raw RFC 5322 text into headers (lowercased names, unfolded)
 * and the offset where the body starts. */
function parseHeaders(rawText: string): { headers: Map<string, string>; bodyStart: number } {
  let idx = rawText.indexOf('\r\n\r\n')
  let sepLen = 4
  if (idx === -1) {
    idx = rawText.indexOf('\n\n')
    sepLen = 2
  }
  const head = idx === -1 ? rawText : rawText.slice(0, idx)
  const headers = new Map<string, string>()
  let current = ''
  for (const line of head.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && current) {
      headers.set(current, `${headers.get(current) ?? ''} ${line.trim()}`)
    } else {
      const m = line.match(/^([^:]+):\s*(.*)$/)
      if (m) {
        current = m[1].toLowerCase()
        headers.set(current, m[2].trim())
      }
    }
  }
  return { headers, bodyStart: idx === -1 ? rawText.length : idx + sepLen }
}

/** Decode a quoted-printable body to bytes (soft line breaks removed,
 * =XX hex escapes resolved, everything else kept as bytes). */
function decodeQuotedPrintableBytes(raw: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '=' && i + 2 < raw.length && /^[0-9A-Fa-f]{2}$/.test(raw.slice(i + 1, i + 3))) {
      bytes.push(parseInt(raw.slice(i + 1, i + 3), 16))
      i += 2
    } else if (ch === '=' && (raw[i + 1] === '\r' || raw[i + 1] === '\n')) {
      // Soft line break: skip it (and the \n of a \r\n pair).
      if (raw[i + 1] === '\r' && raw[i + 2] === '\n') i += 2
      else i += 1
    } else {
      const code = raw.charCodeAt(i)
      if (code < 128) bytes.push(code)
      else {
        const encoded = new TextEncoder().encode(ch)
        for (const b of encoded) bytes.push(b)
      }
    }
  }
  return new Uint8Array(bytes)
}

/** Decode a MIME part body to bytes per its Content-Transfer-Encoding. */
function decodeToBytes(raw: string, encoding: string): Uint8Array {
  const enc = encoding.trim().toLowerCase()
  if (enc === 'base64') {
    try {
      const bin = atob(raw.replace(/\s/g, ''))
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return bytes
    } catch {
      return new TextEncoder().encode(raw)
    }
  }
  if (enc === 'quoted-printable') return decodeQuotedPrintableBytes(raw)
  return new TextEncoder().encode(raw)
}

type Extracted = { text: string; html: string }

/** Extract the plain-text body (and, as a fallback, the HTML body) from
 * one MIME part: single-part text/plain, or multipart with text/plain
 * parts. Nested multiparts recurse. */
function extractPart(rawText: string): Extracted {
  const { headers, bodyStart } = parseHeaders(rawText)
  const body = rawText.slice(bodyStart)
  const contentType = (headers.get('content-type') ?? 'text/plain').toLowerCase()
  const encoding = headers.get('content-transfer-encoding') ?? '7bit'
  const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i)
  if (contentType.startsWith('multipart/') && boundaryMatch) {
    const boundary = boundaryMatch[1]
    const segments = body.split(`--${boundary}`)
    const out: Extracted = { text: '', html: '' }
    // segments[0] is the preamble; the last segment is the closing
    // delimiter plus epilogue — neither is a part.
    for (let i = 1; i < segments.length - 1; i++) {
      const sub = extractPart(segments[i].replace(/^\r?\n/, ''))
      if (sub.text) out.text += (out.text ? '\n' : '') + sub.text
      if (sub.html && !out.html) out.html = sub.html
    }
    return out
  }
  const decoded = new TextDecoder().decode(decodeToBytes(body, encoding))
  if (contentType.startsWith('text/html')) return { text: '', html: decoded }
  if (contentType.startsWith('text/plain')) return { text: decoded, html: '' }
  return { text: '', html: '' }
}

/** Decode one RFC 2047 encoded-word (=?charset?B|Q?text?=), if present. */
function decodeWord(charset: string, enc: string, text: string): string {
  try {
    if (enc.toUpperCase() === 'B') {
      const bin = atob(text.replace(/\s/g, ''))
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return new TextDecoder(charset).decode(bytes)
    }
    // Q-encoding: underscores are spaces, =XX are bytes.
    return new TextDecoder(charset).decode(decodeQuotedPrintableBytes(text.replace(/_/g, ' ')))
  } catch {
    return text
  }
}

function decodeEncodedWords(value: string): string {
  const pattern = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(value)) !== null) {
    out += value.slice(last, m.index)
    out += decodeWord(m[1], m[2], m[3])
    last = m.index + m[0].length
  }
  return out + value.slice(last)
}

const mailHandler = {
  async email(message: EmailMessage, env: MailEnv): Promise<void> {
    const from = String(message.from || '')
    const subject = decodeEncodedWords(message.headers.get('subject') || '').trim() || '(sin asunto)'
    let body = ''
    try {
      const rawText = await new Response(message.raw).text()
      const { text, html } = extractPart(rawText)
      body =
        text.trim() ||
        html
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
    } catch (err) {
      console.error('No se pudo leer el cuerpo del correo:', err)
      body = '(no se pudo leer el cuerpo)'
    }
    body = body.slice(0, MAX_BODY_CHARS)

    // 1) Save the alert in the app (best-effort — never blocks the forward).
    if (env.INTERNAL_POST_TOKEN) {
      try {
        const res = await fetch(ALERT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.INTERNAL_POST_TOKEN}` },
          body: JSON.stringify({ from, subject, body, received_at: new Date().toISOString() }),
        })
        if (!res.ok) console.error('email-alert POST falló:', res.status, await res.text().catch(() => ''))
      } catch (err) {
        console.error('email-alert POST falló:', err)
      }
    } else {
      console.error('INTERNAL_POST_TOKEN no configurado; alerta no guardada')
    }

    // 2) Forward the original to Gmail.
    try {
      await message.forward(FORWARD_TO)
    } catch (err) {
      console.error('Forward a Gmail falló:', err)
    }
  },
}

export default mailHandler
