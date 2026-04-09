import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, RefreshCw, Trash2 } from 'lucide-react'
import axios from 'axios'
import {
  createProject,
  deleteProject,
  getProjects,
  type Project,
} from '../lib/api'
import { useProjectStore } from '../stores/project-store'
import { showToast } from '../stores/toast-store'
import { CreateProjectModal } from '../components/CreateProjectModal'
import { ProjectCard } from '../components/ProjectCard'
import { StatusBadge } from '../components/StatusBadge'
import { LoadingSpinner } from '../components/LoadingSpinner'

function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as { detail?: string; message?: string }
    return d?.detail ?? d?.message ?? e.message
  }
  if (e instanceof Error) return e.message
  return 'Something went wrong'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setProjects = useProjectStore((s) => s.setProjects)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const {
    data: projects = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: getProjects,
    refetchInterval: (query) => {
      const list = query.state.data
      if (list?.some((p: Project) => p.status === 'processing')) return 4000
      return false
    },
  })

  useEffect(() => {
    setProjects(projects)
  }, [projects, setProjects])

  const createMut = useMutation<Project, Error, { name: string; description?: string }>({
    mutationFn: createProject,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      showToast(`Project "${project.name}" created`, 'success')
      setModalOpen(false)
    },
    onError: (e) => showToast(errorMessage(e), 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      showToast('Project deleted successfully', 'success')
      setDeleteTarget(null)
    },
    onError: (e) => {
      showToast(errorMessage(e), 'error')
      setDeleteTarget(null)
    },
  })

  const handleOpenProject = (p: Project) => {
    navigate(`/project/${p.id}`)
  }

  return (
    <div className="min-h-full tron-bg-grid">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white tron-glow-text sm:text-4xl">
              PagePilot
            </h1>
            <p className="mt-2 max-w-xl text-neutral-500">
              Production-grade AI document intelligence. Upload PDFs, process
              them into a searchable knowledge base, and chat with full source
              transparency.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-neutral-300 transition-all duration-200 hover:border-neutral-700 hover:bg-[#111] hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff0033] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[rgba(255,0,51,0.25)] transition-all duration-200 hover:bg-[#ff1744] hover:shadow-[0_0_20px_rgba(255,0,51,0.3)]"
            >
              <Plus className="h-4 w-4" />
              Create project
            </button>
          </div>
        </header>

        <section className="mt-12">
          {isPending && (
            <div className="flex justify-center py-24">
              <LoadingSpinner size="lg" label="Loading projects" />
            </div>
          )}

          {isError && !isPending && (
            <div className="rounded-2xl border border-red-500/20 bg-red-950/20 px-6 py-8 text-center">
              <p className="text-red-300">{errorMessage(error)}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-lg bg-[#ff0033]/15 px-4 py-2 text-sm font-medium text-red-100 transition-all duration-200 hover:bg-[#ff0033]/25"
              >
                Try again
              </button>
            </div>
          )}

          {!isPending && !isError && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800/80 bg-[#0a0a0a] px-6 py-20 text-center">
              <FolderOpen className="h-12 w-12 text-neutral-700" />
              <p className="mt-4 text-lg font-medium text-neutral-200">
                No projects yet
              </p>
              <p className="mt-2 max-w-md text-sm text-neutral-600">
                Create your first project to start uploading documents and
                chatting with your knowledge base.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-6 rounded-xl bg-[#ff0033] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[rgba(255,0,51,0.25)] transition-all duration-200 hover:bg-[#ff1744]"
              >
                Create project
              </button>
            </div>
          )}

          {!isPending && !isError && projects.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:hidden">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onOpen={() => handleOpenProject(p)}
                    onDelete={() => setDeleteTarget(p)}
                  />
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0a0a0a] xl:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-800/80 bg-[#0a0a0a] text-xs uppercase tracking-wider text-neutral-600">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Created</th>
                      <th className="px-5 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {projects.map((p) => (
                      <ProjectTableRow
                        key={p.id}
                        project={p}
                        onOpen={() => handleOpenProject(p)}
                        onDelete={() => setDeleteTarget(p)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        isSubmitting={createMut.isPending}
        onSubmit={async ({ name, description }) => {
          await createMut.mutateAsync({
            name,
            description: description || undefined,
          })
        }}
      />

      {deleteTarget && (
        <DeleteConfirmDialog
          projectName={deleteTarget.name}
          isDeleting={deleteMut.isPending}
          onCancel={() => setDeleteTarget(null)}
          onProceed={() => deleteMut.mutate(deleteTarget.id)}
        />
      )}
    </div>
  )
}

function DeleteConfirmDialog({
  projectName,
  isDeleting,
  onCancel,
  onProceed,
}: {
  projectName: string
  isDeleting: boolean
  onCancel: () => void
  onProceed: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={isDeleting ? undefined : onCancel}
      />
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-[#ff0033]/20 bg-[#0a0a0a] p-6 shadow-2xl shadow-[rgba(255,0,51,0.1)] animate-slide-up">
        <h2 className="text-lg font-semibold text-white">Delete Project</h2>
        <p className="mt-3 text-sm text-neutral-400">
          Do you wish to proceed with the deletion of{' '}
          <span className="font-semibold text-white">"{projectName}"</span>?
        </p>
        <p className="mt-2 text-xs text-neutral-600">
          This will permanently remove all documents, chat sessions, and
          processed data associated with this project.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-xl border border-neutral-700 bg-[#111] px-4 py-2 text-sm font-medium text-neutral-300 transition-all duration-200 hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProceed}
            disabled={isDeleting}
            className="rounded-xl bg-[#ff0033] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[rgba(255,0,51,0.25)] transition-all duration-200 hover:bg-[#ff1744] disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectTableRow({
  project,
  onOpen,
  onDelete,
}: {
  project: Project
  onOpen: () => void
  onDelete: () => void
}) {
  const created = formatDate(project.created_at)
  return (
    <tr
      className="cursor-pointer transition-all duration-200 hover:bg-white/[0.02]"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      tabIndex={0}
      role="link"
    >
      <td className="px-5 py-4">
        <div className="font-medium text-white">{project.name}</div>
        {project.description && (
          <div className="mt-0.5 line-clamp-1 text-xs text-neutral-600">
            {project.description}
          </div>
        )}
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={project.status} />
      </td>
      <td className="px-5 py-4 text-neutral-500">{created}</td>
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
            className="rounded-lg bg-[#ff0033]/90 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#ff1744] hover:shadow-[0_0_10px_rgba(255,0,51,0.3)]"
          >
            Open
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="rounded-lg border border-red-500/20 bg-red-500/5 p-1.5 text-red-400/70 transition-all duration-200 hover:bg-red-500/15 hover:text-red-300 hover:shadow-[0_0_8px_rgba(255,0,51,0.2)]"
            title="Delete project"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
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
