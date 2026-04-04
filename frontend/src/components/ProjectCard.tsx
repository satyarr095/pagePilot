import { ChevronRight, FileStack, Trash2 } from 'lucide-react'
import type { Project } from '../lib/api'
import { StatusBadge } from './StatusBadge'

interface ProjectCardProps {
  project: Project
  onOpen: () => void
  onDelete?: () => void
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  return (
    <div className="group flex w-full flex-col rounded-2xl border border-neutral-800/80 bg-[#0a0a0a] p-5 text-left transition-all duration-300 hover:border-[#ff0033]/30 hover:bg-[#111] hover:shadow-[0_0_20px_rgba(255,0,51,0.1)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white transition-all duration-200 group-hover:text-[#ff1744] group-hover:tron-glow-text">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={project.status} />
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="rounded-lg border border-red-500/20 bg-red-500/5 p-1.5 text-red-400/70 transition-all duration-200 hover:bg-red-500/15 hover:text-red-300 hover:shadow-[0_0_8px_rgba(255,0,51,0.2)]"
              title="Delete project"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-neutral-600">
        <span className="inline-flex items-center gap-1.5">
          <FileStack className="h-4 w-4 text-neutral-600" />
          {formatDate(project.created_at)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-neutral-800/80 pt-4">
        <span className="text-xs text-neutral-600 sm:hidden">
          {formatDate(project.created_at)}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#ff0033]/80 transition-all duration-200 hover:text-[#ff1744]"
        >
          Open workspace
          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
