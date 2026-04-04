import { create } from 'zustand'
import type { Message, RetrievedSource } from '../lib/api'

interface ChatState {
  messages: Message[]
  isStreaming: boolean
  currentSessionId: string | null
  streamingContent: string
  sources: RetrievedSource[]
  setMessages: (messages: Message[]) => void
  appendMessage: (message: Message) => void
  setIsStreaming: (v: boolean) => void
  setCurrentSessionId: (id: string | null) => void
  setStreamingContent: (content: string) => void
  appendStreamingToken: (token: string) => void
  setSources: (sources: RetrievedSource[]) => void
  resetSession: () => void
  resetForProject: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  currentSessionId: null,
  streamingContent: '',
  sources: [],
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  appendStreamingToken: (token) =>
    set((s) => ({ streamingContent: s.streamingContent + token })),
  setSources: (sources) => set({ sources }),
  resetSession: () =>
    set({
      messages: [],
      streamingContent: '',
      sources: [],
      isStreaming: false,
    }),
  resetForProject: () =>
    set({
      messages: [],
      currentSessionId: null,
      streamingContent: '',
      sources: [],
      isStreaming: false,
    }),
}))
