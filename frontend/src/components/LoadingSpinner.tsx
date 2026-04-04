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
      className={`inline-flex items-center justify-center gap-2 text-neutral-500 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Loader2
        className={`${sizeMap[size]} animate-spin text-[#ff0033] drop-shadow-[0_0_6px_rgba(255,0,51,0.5)]`}
        aria-hidden
      />
    </span>
  )
}
