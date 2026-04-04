import { create } from 'zustand'
import type { Message, RetrievedSource } from '../lib/api'

type StreamPhase = 'idle' | 'waiting' | 'receiving'

interface ChatState {
  messages: Message[]
  streamPhase: StreamPhase
  currentSessionId: string | null
  streamingContent: string
  sources: RetrievedSource[]

  setMessages: (messages: Message[]) => void
  appendMessage: (message: Message) => void
  setCurrentSessionId: (id: string | null) => void
  setSources: (sources: RetrievedSource[]) => void

  /** Transition to the 'waiting' phase (user just sent, no tokens yet). */
  startStreaming: () => void

  /** Append a token and transition to 'receiving' if still 'waiting'. */
  appendStreamingToken: (token: string) => void

  /**
   * Atomic end-of-stream. Appends the assistant message, clears streaming
   * state, and optionally switches session — all in ONE set() call.
   */
  finishStreaming: (
    assistantMessage: Message | null,
    newSessionId?: string | null,
  ) => void

  /** Abort streaming (error / cancel). */
  abortStreaming: () => void

  resetForProject: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  streamPhase: 'idle',
  currentSessionId: null,
  streamingContent: '',
  sources: [],

  setMessages: (messages) => set({ messages }),

  appendMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),

  setSources: (sources) => set({ sources }),

  startStreaming: () =>
    set({ streamPhase: 'waiting', streamingContent: '' }),

  appendStreamingToken: (token) =>
    set((s) => ({
      streamingContent: s.streamingContent + token,
      streamPhase: 'receiving',
    })),

  finishStreaming: (assistantMessage, newSessionId) =>
    set((s) => ({
      messages: assistantMessage
        ? [...s.messages, assistantMessage]
        : s.messages,
      streamingContent: '',
      streamPhase: 'idle',
      ...(newSessionId != null ? { currentSessionId: newSessionId } : {}),
    })),

  abortStreaming: () =>
    set({ streamingContent: '', streamPhase: 'idle' }),

  resetForProject: () =>
    set({
      messages: [],
      currentSessionId: null,
      streamingContent: '',
      sources: [],
      streamPhase: 'idle',
    }),
}))
