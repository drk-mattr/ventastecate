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
}

const QR_SIZE = 1024

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'negocio'
}

export function BusinessQrDialog({ businessId, businessName }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const qrRef = useRef<QRCodeStyling | null>(null)

  const url = `https://ventastecate.com/businesses/${businessId}`

  // The dialog content only mounts when open, so the QR is created and
  // appended when the dialog first opens — never during server render.
  useEffect(() => {
    if (!open) return
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling({
        width: QR_SIZE,
        height: QR_SIZE,
        type: 'canvas',
        data: url,
        margin: 32,
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
  }, [open, url])

  const handleDownload = () => {
    void qrRef.current?.download({ name: `codigo-qr-${slugify(businessName)}`, extension: 'png' })
  }

  const handleShare = async () => {
    const qr = qrRef.current
    if (!qr) return
    const blob = await qr.getRawData('png')
    // getRawData is typed Blob | Buffer — in the browser it is always a Blob.
    const file = blob instanceof Blob ? new File([blob], `codigo-qr-${slugify(businessName)}.png`, { type: 'image/png' }) : null
    if (file && navigator.canShare?.({ files: [file] })) {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="h-7 px-3 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:border-gray-400 flex items-center gap-1.5 transition-colors"
          aria-label="Ver código QR"
        >
          <QrCode className="h-4 w-4" />
          Código QR
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Código QR</DialogTitle>
          <DialogDescription>
            {businessName} — escanea el código para abrir este negocio en Ventas Tecate.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <div
            ref={containerRef}
            className="w-full max-w-[256px] rounded-lg bg-white [&_canvas]:h-auto [&_canvas]:w-full"
            aria-label={`Código QR de ${businessName}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Descargar PNG
          </Button>
          <Button onClick={handleShare}>
            {shared || copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {shared ? 'Compartido' : copied ? 'Enlace copiado' : 'Compartir'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
