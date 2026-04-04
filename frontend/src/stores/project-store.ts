import { create } from 'zustand'
import type { Project } from '../lib/api'

interface ProjectState {
  projects: Project[]
  selectedProject: Project | null
  setProjects: (projects: Project[]) => void
  setSelectedProject: (project: Project | null) => void
  upsertProject: (project: Project) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  selectedProject: null,
  setProjects: (projects) => set({ projects }),
  setSelectedProject: (selectedProject) => set({ selectedProject }),
  upsertProject: (project) =>
    set((s) => {
      const idx = s.projects.findIndex((p) => p.id === project.id)
      const next =
        idx === -1
          ? [...s.projects, project]
          : s.projects.map((p) => (p.id === project.id ? project : p))
      return { projects: next }
    }),
}))
