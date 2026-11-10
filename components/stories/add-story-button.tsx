'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { compressImage } from '@/lib/images/compress'
import { StoryComposer } from './story-composer'

// Shared add-story entry: the file input + compression + full-screen
// composer, owned once here so the stories rail's add circle and the
// feed-header "+" (shown when the rail is hidden) are the same code,
// not two copies. Nothing is published until Publicar in the composer.
interface AddStoryButtonProps {
  /** 'rail' = the 48px dashed circle inside the stories rail;
      'header' = the small 32px dashed "+" in the feed header row. */
  variant: 'rail' | 'header'
  /** Rail-level error display (the rail shows it under the row, as
      before). Without it, an error renders as a small fixed toast
      so a failed tap never fails silently. */
  onUploadError?: (message: string | null) => void
}

export function AddStoryButton({ variant, onUploadError }: AddStoryButtonProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<{ dataUrl: string; filename: string } | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const reportError = (message: string | null) => {
    if (onUploadError) {
      onUploadError(message)
      return
    }
    setLocalError(message)
    if (message) window.setTimeout(() => setLocalError(null), 4000)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading || pending) return
    setUploading(true)
    reportError(null)
    try {
      const compressed = await compressImage(file)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read'))
        reader.readAsDataURL(compressed)
      })
      // Open the composer — nothing is published until Publicar.
      setPending({ dataUrl, filename: compressed.name })
    } catch {
      reportError('No se pudo publicar la historia')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const closeComposer = () => {
    setPending(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePublished = () => {
    closeComposer()
    router.refresh()
  }

  const isRail = variant === 'rail'

  const button = (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      disabled={uploading}
      aria-label="Agregar historia"
      className={
        isRail
          ? 'h-12 w-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 hover:border-gray-900 hover:text-gray-900 disabled:opacity-50'
          : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-900 hover:text-gray-900 disabled:opacity-50'
      }
    >
      <Plus className={isRail ? 'h-6 w-6' : 'h-4 w-4'} />
    </button>
  )

  return (
    <>
      {isRail ? <div className="flex-none flex flex-col items-center w-12">{button}</div> : button}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {pending && (
        <StoryComposer
          dataUrl={pending.dataUrl}
          filename={pending.filename}
          onClose={closeComposer}
          onPublished={handlePublished}
        />
      )}
      {!onUploadError && localError && (
        <div role="alert" className="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {localError}
        </div>
      )}
    </>
  )
}
