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
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition hover:bg-slate-950/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl shadow-black/50 animate-slide-up"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Create project
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Organize documents and chat in a dedicated workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="project-name"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Name
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 financial review"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              autoFocus
              required
              maxLength={200}
            />
          </div>
          <div>
            <label
              htmlFor="project-desc"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Description
            </label>
            <textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context for this project"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              maxLength={2000}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
