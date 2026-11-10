'use client'

import { useEffect, useRef, useState } from 'react'
import QRCodeStyling from 'qr-code-styling'
import { Check, Download, QrCode, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Props {
  businessId: string
  businessName: string
  businessTown?: string | null
  /** Quiet text-link trigger (owner-only slot on the business page)
      instead of the pill button. Same dialog, same print-ready card. */
  asLink?: boolean
}

// Print-ready card: 1600x2000 px ≈ 5.3 x 6.7 in at 300 DPI, so a shop can
// print it and put it on display. Pure black on white, no transparency.
const CARD_WIDTH = 1600
const CARD_HEIGHT = 2000
// The QR itself: big in absolute terms so it scans from a meter away,
// smaller relative to the card than the old bare 1024px export.
const QR_SIZE = 960
const QR_MARGIN = 32
const QR_X = (CARD_WIDTH - QR_SIZE) / 2
const QR_Y = 360
const TEXT_MAX_WIDTH = 1400

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'negocio'
}

// The site wordmark is Fraunces, loaded via next/font as the --font-forum
// variable on <body> (layout.tsx). Resolve the generated family name at
// runtime so the canvas draws the same wordmark as the header.
function forumFamily(): string {
  if (typeof window === 'undefined') return 'Georgia, serif'
  const fromBody = getComputedStyle(document.body).getPropertyValue('--font-forum').trim()
  const fromRoot = getComputedStyle(document.documentElement).getPropertyValue('--font-forum').trim()
  const family = fromBody || fromRoot
  if (!family) return 'Georgia, serif'
  // next/font generates a single-token family name; quote it if it has spaces.
  return /\s/.test(family) && !family.startsWith('"') ? `"${family}"` : family
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

// Compose the print-ready card: wordmark on top, QR in the middle, business
// name + town below, generous white space everywhere. Returns a PNG blob.
async function buildCardBlob(
  qr: QRCodeStyling,
  businessName: string,
  town: string | null,
): Promise<Blob> {
  const raw = await qr.getRawData('png')
  if (!(raw instanceof Blob)) throw new Error('No se pudo generar el código QR')
  const qrBitmap = await createImageBitmap(raw)

  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const family = forumFamily()
  try {
    await Promise.race([
      document.fonts.load(`700 108px ${family}`),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ])
  } catch {
    // Font did not load in time — the serif fallback below still draws.
  }

  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Wordmark, same lowercase wordmark as the site header.
  ctx.font = `700 108px ${family}, Georgia, serif`
  ctx.fillText('ventastecate.com', CARD_WIDTH / 2, 230)

  // QR, centered with the card's white space as its quiet zone.
  ctx.drawImage(qrBitmap, QR_X, QR_Y, QR_SIZE, QR_SIZE)

  // Business name: shrink, then wrap to at most two lines.
  const nameFont = (size: number) => `700 ${size}px ${family}, Georgia, serif`
  let nameSize = 76
  let nameLines: string[] = []
  while (nameSize >= 44) {
    ctx.font = nameFont(nameSize)
    nameLines = wrapLines(ctx, businessName, TEXT_MAX_WIDTH)
    if (nameLines.length <= 2) break
    nameSize -= 6
  }
  if (nameLines.length > 2) {
    nameLines = nameLines.slice(0, 2)
    while (ctx.measureText(`${nameLines[1]}…`).width > TEXT_MAX_WIDTH && nameLines[1].length > 1) {
      nameLines[1] = nameLines[1].slice(0, -1)
    }
    nameLines[1] = `${nameLines[1].trim()}…`
  }
  ctx.font = nameFont(nameSize)
  ctx.fillStyle = '#000000'
  const nameFirstY = nameLines.length > 1 ? 1430 : 1470
  nameLines.forEach((line, i) => {
    ctx.fillText(line, CARD_WIDTH / 2, nameFirstY + i * 90)
  })

  // Town, in dark gray (never a light gray — it has to print clean).
  if (town) {
    ctx.fillStyle = '#404040'
    ctx.font = `500 48px ${family}, Georgia, serif`
    const townY = nameLines.length > 1 ? 1625 : 1575
    ctx.fillText(town, CARD_WIDTH / 2, townY)
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo generar la imagen')
  return blob
}

export function BusinessQrDialog({ businessId, businessName, businessTown, asLink = false }: Props) {
  const [open, setOpen] = useState(false)
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const qrRef = useRef<QRCodeStyling | null>(null)
  const cardBlobRef = useRef<Blob | null>(null)
  const cardUrlRef = useRef<string | null>(null)

  const url = `https://ventastecate.com/businesses/${businessId}`
  const town = businessTown || null

  // Reset the card when the dialog closes (event handler, not an effect,
  // so setState here is fine) and revoke the object URL.
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      if (cardUrlRef.current) URL.revokeObjectURL(cardUrlRef.current)
      cardUrlRef.current = null
      cardBlobRef.current = null
      setCardUrl(null)
      setGenerating(true)
    }
  }

  // Revoke any lingering object URL on unmount.
  useEffect(() => {
    return () => {
      if (cardUrlRef.current) URL.revokeObjectURL(cardUrlRef.current)
    }
  }, [])

  // The dialog content only mounts when open, so the QR is created and the
  // card composed when the dialog first opens — never during server render.
  // The preview shows the exact same card blob that download/share export.
  // (No synchronous setState in this effect: generating starts true and
  // is only cleared in the async continuation below.)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling({
        width: QR_SIZE,
        height: QR_SIZE,
        type: 'canvas',
        data: url,
        margin: QR_MARGIN,
        qrOptions: { errorCorrectionLevel: 'M' },
        dotsOptions: { color: '#000000', type: 'square' },
        backgroundOptions: { color: '#ffffff' },
        cornersSquareOptions: { color: '#000000', type: 'square' },
        cornersDotOptions: { color: '#000000', type: 'square' },
      })
    }
    const container = containerRef.current
    if (container && container.childElementCount === 0) {
      qrRef.current.append(container)
    }
    void buildCardBlob(qrRef.current, businessName, town)
      .then((blob) => {
        if (cancelled) return
        cardBlobRef.current = blob
        if (cardUrlRef.current) URL.revokeObjectURL(cardUrlRef.current)
        cardUrlRef.current = URL.createObjectURL(blob)
        setCardUrl(cardUrlRef.current)
        setGenerating(false)
      })
      .catch(() => {
        if (!cancelled) setGenerating(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, url, businessName, town])

  const handleDownload = () => {
    if (!cardUrl) return
    const a = document.createElement('a')
    a.href = cardUrl
    a.download = `codigo-qr-${slugify(businessName)}.png`
    a.click()
  }

  const handleShare = async () => {
    const blob = cardBlobRef.current
    if (!blob) return
    const file = new File([blob], `codigo-qr-${slugify(businessName)}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: businessName, text: url })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
        return
      } catch {
        // Share sheet dismissed — do nothing, do not fall back to copy.
        return
      }
    }
    // No native share sheet: copy the link instead.
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — nothing to do.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {asLink ? (
          <button
            className="text-gray-500 underline hover:text-gray-700 inline-flex items-center gap-1"
            aria-label="Ver código QR"
          >
            <QrCode className="h-3.5 w-3.5" />
            Código QR
          </button>
        ) : (
          <button
            className="h-7 px-3 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:border-gray-400 flex items-center gap-1.5 transition-colors"
            aria-label="Ver código QR"
          >
            <QrCode className="h-4 w-4" />
            Código QR
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Código QR</DialogTitle>
          <DialogDescription>
            {businessName} — escanea el código para abrir este negocio en Ventas Tecate.
          </DialogDescription>
        </DialogHeader>
        {/* Hidden QR canvas: the source bitmap for the composed card. */}
        <div ref={containerRef} className="hidden" aria-hidden="true" />
        <div className="flex justify-center py-2">
          {cardUrl ? (
            <img
              src={cardUrl}
              alt={`Código QR de ${businessName}`}
              className="w-full max-w-[260px] rounded-lg border border-gray-200 bg-white"
            />
          ) : (
            <div className="w-full max-w-[260px] aspect-[4/5] rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
              <span className="text-sm text-gray-500">
                {generating ? 'Preparando código…' : 'No se pudo generar el código'}
              </span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={!cardUrl}>
            <Download className="h-4 w-4" />
            Descargar PNG
          </Button>
          <Button onClick={handleShare} disabled={!cardUrl}>
            {shared || copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {shared ? 'Compartido' : copied ? 'Enlace copiado' : 'Compartir'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
