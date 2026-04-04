import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastState {
  toasts: ToastItem[]
  pushToast: (message: string, variant?: ToastVariant) => void
  dismissToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (message, variant = 'info') =>
    set((s) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      return { toasts: [...s.toasts, { id, message, variant }] }
    }),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function showToast(message: string, variant: ToastVariant = 'info') {
  useToastStore.getState().pushToast(message, variant)
}
