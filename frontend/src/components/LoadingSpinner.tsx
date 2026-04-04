import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  className?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
}

export function LoadingSpinner({
  className = '',
  label = 'Loading',
  size = 'md',
}: LoadingSpinnerProps) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-2 text-slate-400 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Loader2
        className={`${sizeMap[size]} animate-spin text-indigo-400`}
        aria-hidden
      />
    </span>
  )
}
