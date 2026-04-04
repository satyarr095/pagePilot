import { useEffect, useId, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: { name: string; description: string }) => Promise<void>
  isSubmitting: boolean
}

export function CreateProjectModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateProjectModalProps) {
  const titleId = useId()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) {
      setName('')
      setDescription('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await onSubmit({ name: trimmed, description: description.trim() })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#ff0033]/20 bg-[#0a0a0a] p-6 shadow-2xl shadow-[rgba(255,0,51,0.1)] animate-slide-up"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Create project
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Organize documents and chat in a dedicated workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 transition-all duration-200 hover:bg-white/[0.05] hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="project-name"
              className="mb-1.5 block text-sm font-medium text-neutral-400"
            >
              Name
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 financial review"
              className="w-full rounded-xl border border-neutral-800 bg-[#050505] px-3 py-2.5 text-sm text-white placeholder:text-neutral-700 transition-all duration-200 focus:border-[#ff0033]/50 focus:outline-none focus:ring-2 focus:ring-[#ff0033]/20 focus:shadow-[0_0_12px_rgba(255,0,51,0.15)]"
              autoFocus
              required
              maxLength={200}
            />
          </div>
          <div>
            <label
              htmlFor="project-desc"
              className="mb-1.5 block text-sm font-medium text-neutral-400"
            >
              Description
            </label>
            <textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context for this project"
              rows={3}
              className="w-full resize-none rounded-xl border border-neutral-800 bg-[#050505] px-3 py-2.5 text-sm text-white placeholder:text-neutral-700 transition-all duration-200 focus:border-[#ff0033]/50 focus:outline-none focus:ring-2 focus:ring-[#ff0033]/20 focus:shadow-[0_0_12px_rgba(255,0,51,0.15)]"
              maxLength={2000}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-400 transition-all duration-200 hover:bg-white/[0.05] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-xl bg-[#ff0033] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[rgba(255,0,51,0.25)] transition-all duration-200 hover:bg-[#ff1744] hover:shadow-[0_0_20px_rgba(255,0,51,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
