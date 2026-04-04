import type { ProjectStatus } from '../lib/api'

const styles: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  created: {
    label: 'Created',
    className:
      'bg-neutral-800/80 text-neutral-300 ring-1 ring-inset ring-neutral-700/80',
  },
  processing: {
    label: 'Processing',
    className:
      'bg-[#ff0033]/10 text-[#ff1744] ring-1 ring-inset ring-[#ff0033]/30 shadow-[0_0_8px_rgba(255,0,51,0.2)] animate-pulse-soft',
  },
  ready: {
    label: 'Ready',
    className:
      'bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
  },
  failed: {
    label: 'Failed',
    className:
      'bg-red-900/30 text-red-300 ring-1 ring-inset ring-red-500/40',
  },
}

interface StatusBadgeProps {
  status: ProjectStatus | string
  className?: string
}

const isProjectStatus = (s: string): s is ProjectStatus =>
  s === 'created' ||
  s === 'processing' ||
  s === 'ready' ||
  s === 'failed'

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key: ProjectStatus = isProjectStatus(status) ? status : 'created'
  const cfg = styles[key]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className} ${className}`}
    >
      {cfg.label}
    </span>
  )
}
