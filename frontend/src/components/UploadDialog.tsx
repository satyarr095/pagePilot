import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { FileUp, X } from 'lucide-react'
import { LoadingSpinner } from './LoadingSpinner'

interface UploadDialogProps {
  open: boolean
  onClose: () => void
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<void>
}

export function UploadDialog({ open, onClose, onUpload }: UploadDialogProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setFile(null)
    setProgress(0)
    setUploading(false)
    setError(null)
    setDragOver(false)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, uploading])

  const pickPdf = (f: File | null | undefined) => {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    setError(null)
    setFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    pickPdf(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    setError(null)
    try {
      await onUpload(file, setProgress)
      onClose()
      reset()
    } catch (e) {
      setError((e as Error).message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => !uploading && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[#ff0033]/20 bg-[#0a0a0a] p-6 shadow-2xl shadow-[rgba(255,0,51,0.1)] animate-slide-up"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Upload documents
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              PDF files are ingested for retrieval and chat.
            </p>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => !uploading && onClose()}
            className="rounded-lg p-2 text-neutral-500 transition-all duration-200 hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={(e) => pickPdf(e.target.files?.[0])}
        />

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300 ${
            dragOver
              ? 'border-[#ff0033] bg-[#ff0033]/5 shadow-[0_0_20px_rgba(255,0,51,0.15)]'
              : 'border-neutral-800 bg-[#050505] hover:border-neutral-700 hover:bg-white/[0.01]'
          }`}
        >
          <FileUp className="mx-auto h-10 w-10 text-[#ff0033]/70" />
          <p className="mt-3 text-sm font-medium text-neutral-200">
            Drag and drop a PDF here
          </p>
          <p className="mt-1 text-xs text-neutral-600">or click to browse</p>
        </div>

        {file && (
          <div className="mt-4 rounded-xl border border-neutral-800 bg-[#050505] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-neutral-200">
                {file.name}
              </p>
              <span className="shrink-0 text-xs text-neutral-600">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            {(uploading || progress > 0) && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-neutral-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ff0033] to-[#ff1744] shadow-[0_0_10px_rgba(255,0,51,0.4)] transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-neutral-600">
                  {progress}%
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => !uploading && onClose()}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-400 transition-all duration-200 hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || uploading}
            onClick={handleUpload}
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff0033] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[rgba(255,0,51,0.25)] transition-all duration-200 hover:bg-[#ff1744] hover:shadow-[0_0_20px_rgba(255,0,51,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading && <LoadingSpinner size="sm" label="Uploading" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
