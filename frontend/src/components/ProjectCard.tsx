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
    <div className="group flex w-full flex-col rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-left transition hover:border-indigo-500/40 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-indigo-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white group-hover:text-indigo-100">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">
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
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
              title="Delete project"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <FileStack className="h-4 w-4 text-slate-500" />
          {formatDate(project.created_at)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-4">
        <span className="text-xs text-slate-500 sm:hidden">
          {formatDate(project.created_at)}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
        >
          Open workspace
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
