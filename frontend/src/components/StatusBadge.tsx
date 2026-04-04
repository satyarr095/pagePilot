import type { ProjectStatus } from '../lib/api'

const styles: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  created: {
    label: 'Created',
    className:
      'bg-slate-700/80 text-slate-200 ring-1 ring-inset ring-slate-600/80',
  },
  processing: {
    label: 'Processing',
    className:
      'bg-amber-500/15 text-amber-200 ring-1 ring-inset ring-amber-500/40',
  },
  ready: {
    label: 'Ready',
    className:
      'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/40',
  },
  failed: {
    label: 'Failed',
    className:
      'bg-red-500/15 text-red-200 ring-1 ring-inset ring-red-500/40',
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
