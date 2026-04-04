import { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useToastStore, type ToastItem } from '../stores/toast-store'

const variantIcon = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const variantStyles = {
  success: 'border-emerald-500/20 bg-emerald-950/60 text-emerald-100',
  error: 'border-[#ff0033]/30 bg-[#ff0033]/10 text-red-100',
  info: 'border-neutral-700 bg-[#111] text-neutral-100',
}

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
}) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(toast.id), 5200)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  const Icon = variantIcon[toast.variant]
  return (
    <div
      className={`pointer-events-auto animate-slide-up flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl shadow-black/60 backdrop-blur-md ${variantStyles[toast.variant]}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-90" />
      <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="rounded-lg p-1 text-current/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismissToast = useToastStore((s) => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2 sm:max-w-md"
      aria-live="assertive"
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
