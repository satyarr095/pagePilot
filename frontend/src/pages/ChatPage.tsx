import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  ArrowLeft,
  ChevronLeft,
  FileText,
  MessageSquarePlus,
  PanelRightOpen,
  Play,
  Upload,
} from 'lucide-react'
import {
  createChatSession,
  getChatSessions,
  getDocuments,
  getProject,
  getSessionMessages,
  processDocuments,
  uploadDocument,
  type Message,
  type RetrievedSource,
} from '../lib/api'
import { sendMessage } from '../lib/sse'
import { useChatStore } from '../stores/chat-store'
import { useProjectStore } from '../stores/project-store'
import { showToast } from '../stores/toast-store'
import { ChatWindow } from '../components/ChatWindow'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SourcePanelToggle, SourceViewer } from '../components/SourceViewer'
import { StatusBadge } from '../components/StatusBadge'
import { UploadDialog } from '../components/UploadDialog'

function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as { detail?: string; message?: string }
    return d?.detail ?? d?.message ?? e.message
  }
  if (e instanceof Error) return e.message
  return 'Something went wrong'
}

export function ChatPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = projectId ?? ''
  const queryClient = useQueryClient()
  const streamAbortRef = useRef<AbortController | null>(null)

  const setSelectedProject = useProjectStore((s) => s.setSelectedProject)
  const setMessages = useChatStore((s) => s.setMessages)
  const appendMessage = useChatStore((s) => s.appendMessage)
  const streamPhase = useChatStore((s) => s.streamPhase)
  const startStreaming = useChatStore((s) => s.startStreaming)
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const setCurrentSessionId = useChatStore((s) => s.setCurrentSessionId)
  const appendStreamingToken = useChatStore((s) => s.appendStreamingToken)
  const setSources = useChatStore((s) => s.setSources)
  const sources = useChatStore((s) => s.sources)
  const resetForProject = useChatStore((s) => s.resetForProject)
  const finishStreaming = useChatStore((s) => s.finishStreaming)
  const abortStreaming = useChatStore((s) => s.abortStreaming)

  const isStreaming = streamPhase !== 'idle'

  const [input, setInput] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(true)
  const [mobileSourcesOpen, setMobileSourcesOpen] = useState(false)

  // ── Synchronous project-change reset ──────────────────────────────
  // Must happen during render (before queries evaluate) so stale
  // session IDs from a previous project never reach the server.
  const prevProjectIdRef = useRef<string | null>(null)
  const loadedSessionRef = useRef<string | null>(null)
  if (prevProjectIdRef.current !== id) {
    prevProjectIdRef.current = id
    loadedSessionRef.current = null
    resetForProject()
  }

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'processing' ? 3000 : false
    },
  })

  const isProcessing = projectQuery.data?.status === 'processing'

  const documentsQuery = useQuery({
    queryKey: ['documents', id],
    queryFn: () => getDocuments(id),
    enabled: Boolean(id),
    refetchInterval: isProcessing ? 5000 : false,
  })

  const sessionsQuery = useQuery({
    queryKey: ['chat-sessions', id],
    queryFn: () => getChatSessions(id),
    enabled: Boolean(id),
  })

  // Detect status transitions (processing → ready/failed)
  const prevStatusRef = useRef<string | null>(null)
  useEffect(() => {
    const status = projectQuery.data?.status
    if (!status) return
    const prev = prevStatusRef.current
    prevStatusRef.current = status

    if (prev === 'processing' && status === 'ready') {
      showToast('Processing complete — chat is now available!', 'success')
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    } else if (prev === 'processing' && status === 'failed') {
      showToast('Processing failed. Please check your documents.', 'error')
    }
  }, [projectQuery.data?.status, id, queryClient])

  useEffect(() => {
    if (projectQuery.data) setSelectedProject(projectQuery.data)
    return () => setSelectedProject(null)
  }, [projectQuery.data, setSelectedProject])

  // Auto-select first session on initial load
  useEffect(() => {
    if (!currentSessionId && sessionsQuery.data?.length) {
      setCurrentSessionId(sessionsQuery.data[0].id)
    }
  }, [sessionsQuery.data, currentSessionId, setCurrentSessionId])

  // Fetch messages for the current session (always fetches to keep
  // React Query cache warm, but we only apply data to the store
  // on explicit session changes — see the effect below).
  const messagesQuery = useQuery({
    queryKey: ['session-messages', id, currentSessionId],
    queryFn: () => getSessionMessages(id, currentSessionId!),
    enabled: Boolean(id) && Boolean(currentSessionId) && !isStreaming,
    retry: false,
  })

  // ── Explicit session-load effect ──────────────────────────────────
  // Only populates the Zustand messages store when the session changes
  // (user clicked a different session, auto-selected on load, etc.).
  // Background refetches for the SAME session are ignored entirely,
  // which eliminates the race condition with streaming.
  useEffect(() => {
    if (!currentSessionId || !messagesQuery.data) return
    if (isStreaming) return
    if (loadedSessionRef.current === currentSessionId) return
    loadedSessionRef.current = currentSessionId
    setMessages(messagesQuery.data)
  }, [currentSessionId, messagesQuery.data, isStreaming, setMessages])

  const processMut = useMutation({
    mutationFn: () => processDocuments(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      showToast(res.message ?? 'Processing started', 'success')
    },
    onError: (e) => showToast(errorMessage(e), 'error'),
  })

  const newSessionMut = useMutation({
    mutationFn: () => createChatSession(id),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', id] })
      loadedSessionRef.current = session.id
      setCurrentSessionId(session.id)
      setMessages([])
      setSources([])
      showToast('New chat session ready', 'success')
    },
    onError: (e) => showToast(errorMessage(e), 'error'),
  })

  const handleUpload = async (
    file: File,
    onProgress: (pct: number) => void,
  ) => {
    await uploadDocument(id, file, onProgress)
    queryClient.invalidateQueries({ queryKey: ['documents', id] })
    queryClient.invalidateQueries({ queryKey: ['project', id] })
    showToast('Document uploaded', 'success')
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !id) return

    // Read directly from the store to avoid stale closure
    if (useChatStore.getState().streamPhase !== 'idle') return

    streamAbortRef.current?.abort()
    const ac = new AbortController()
    streamAbortRef.current = ac

    const activeSessionId = currentSessionId

    const userMsgId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `u-${Date.now()}`

    appendMessage({
      id: userMsgId,
      chat_session_id: activeSessionId ?? 'pending',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    })
    setInput('')
    setSources([])
    startStreaming()

    let full = ''
    let collectedSources: RetrievedSource[] = []

    try {
      await sendMessage(
        id,
        text,
        activeSessionId,
        {
          onToken: (t) => {
            full += t
            appendStreamingToken(t)
          },
          onSources: (s) => {
            collectedSources = s
            setSources(s)
          },
          onDone: (returnedSessionId) => {
            const effectiveSessionId =
              returnedSessionId || activeSessionId || ''

            let assistantMsg: Message | null = null
            if (full.trim()) {
              assistantMsg = {
                id:
                  typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `a-${Date.now()}`,
                chat_session_id: effectiveSessionId,
                role: 'assistant',
                content: full,
                sources: collectedSources.length
                  ? (collectedSources as unknown as Record<string, unknown>[])
                  : undefined,
                created_at: new Date().toISOString(),
              }
            }

            const isNewSession =
              returnedSessionId && returnedSessionId !== activeSessionId

            // Atomic: append message + clear streaming + optionally switch session
            finishStreaming(
              assistantMsg,
              isNewSession ? returnedSessionId : null,
            )

            // Mark session as loaded so the messagesQuery effect
            // never overwrites the authoritative data we just set.
            loadedSessionRef.current = isNewSession
              ? returnedSessionId
              : activeSessionId

            if (isNewSession) {
              queryClient.invalidateQueries({
                queryKey: ['chat-sessions', id],
              })
            }

            // Prime React Query cache so subsequent navigations
            // (switch away and back) see the latest messages.
            const finalSessionId = isNewSession
              ? returnedSessionId
              : activeSessionId
            if (finalSessionId) {
              queryClient.setQueryData(
                ['session-messages', id, finalSessionId],
                useChatStore.getState().messages,
              )
            }
          },
          onError: (msg) => {
            showToast(msg, 'error')
            abortStreaming()
          },
        },
        ac.signal,
      )
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        showToast(errorMessage(e), 'error')
      }
      abortStreaming()
    }
  }

  const openSources = (s: RetrievedSource[]) => {
    setSources(s)
    setSourcesOpen(true)
    setMobileSourcesOpen(true)
  }

  const handleSessionSwitch = (sessionId: string) => {
    if (sessionId === currentSessionId) return
    loadedSessionRef.current = null // force reload from server
    setMessages([])
    setCurrentSessionId(sessionId)
    setSources([])
    abortStreaming()
  }

  const project = projectQuery.data
  const documents = documentsQuery.data ?? []
  const sessions = sessionsQuery.data ?? []
  const chatReady = project?.status === 'ready'

  if (!id) {
    return (
      <div className="p-8 text-center text-neutral-500">
        Missing project identifier.
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#050505]">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-[#ff0033]/10 bg-[#0a0a0a] lg:max-w-[280px]">
          <div className="flex items-center gap-2 border-b border-[#ff0033]/10 p-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-neutral-500 transition-all duration-200 hover:bg-white/[0.03] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </div>

          <div className="border-b border-[#ff0033]/10 p-4">
            {projectQuery.isPending && (
              <LoadingSpinner size="sm" label="Loading project" />
            )}
            {projectQuery.isError && (
              <p className="text-sm text-red-400">
                {errorMessage(projectQuery.error)}
              </p>
            )}
            {project && (
              <>
                <h1 className="text-base font-semibold text-white">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="mt-1 line-clamp-3 text-xs text-neutral-600">
                    {project.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={project.status} />
                </div>
              </>
            )}
          </div>

          {!chatReady && (
          <div className="flex gap-2 border-b border-[#ff0033]/10 p-3">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              disabled={project?.status === 'processing'}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-[#111] py-2 text-xs font-medium text-neutral-300 transition-all duration-200 hover:border-[#ff0033]/25 hover:bg-white/[0.03] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => processMut.mutate()}
              disabled={processMut.isPending || documents.length === 0 || project?.status === 'processing'}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#ff0033] py-2 text-xs font-semibold text-white shadow-md shadow-[rgba(255,0,51,0.2)] transition-all duration-200 hover:bg-[#ff1744] hover:shadow-[0_0_15px_rgba(255,0,51,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              {processMut.isPending ? '...' : 'Process'}
            </button>
          </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">
              Documents
            </p>
            {documentsQuery.isPending && (
              <LoadingSpinner size="sm" label="Loading documents" />
            )}
            {documents.length === 0 && !documentsQuery.isPending && (
              <p className="text-xs text-neutral-600">No documents uploaded.</p>
            )}
            <ul className="space-y-1">
              {documents.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-2 py-1.5 text-xs text-neutral-400"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[#ff0033]/60" />
                  <span className="truncate">{d.file_name}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[#ff0033]/10 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Chats
              </p>
              <button
                type="button"
                onClick={() => newSessionMut.mutate()}
                disabled={newSessionMut.isPending}
                className="inline-flex items-center gap-1 rounded-lg bg-[#ff0033]/90 px-2 py-1 text-[11px] font-semibold text-white transition-all duration-200 hover:bg-[#ff1744] disabled:opacity-50"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                New
              </button>
            </div>
            {sessionsQuery.isPending && (
              <LoadingSpinner size="sm" label="Loading sessions" />
            )}
            <ul className="max-h-40 space-y-1 overflow-y-auto lg:max-h-56">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleSessionSwitch(s.id)}
                    className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-xs transition-all duration-200 ${
                      currentSessionId === s.id
                        ? 'bg-[#ff0033]/10 text-[#ff1744] ring-1 ring-[#ff0033]/25 shadow-[0_0_8px_rgba(255,0,51,0.1)]'
                        : 'text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-200'
                    }`}
                  >
                    {s.title || `Session ${s.id.slice(0, 8)}`}
                  </button>
                </li>
              ))}
            </ul>
            {sessions.length === 0 && !sessionsQuery.isPending && (
              <p className="text-xs text-neutral-600">
                No sessions yet. Start a new chat.
              </p>
            )}
          </div>
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {!sourcesOpen && (
            <SourcePanelToggle
              onClick={() => setSourcesOpen(true)}
              count={sources.length}
            />
          )}

          <button
            type="button"
            onClick={() => setMobileSourcesOpen(true)}
            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-2 py-1.5 text-xs text-neutral-300 lg:hidden"
          >
            <PanelRightOpen className="h-4 w-4" />
            Sources
          </button>

          <ChatWindow onShowSources={openSources} />

          <footer className="border-t border-[#ff0033]/10 bg-[#0a0a0a]/95 p-3 backdrop-blur">
            {!chatReady && project && (
              <div className="mx-auto mb-2 max-w-3xl rounded-lg border border-[#ff0033]/20 bg-[#ff0033]/5 px-3 py-2 text-center text-xs text-[#ff1744]/80">
                {project.status === 'processing'
                  ? 'Documents are being processed. Chat will be available once processing completes.'
                  : project.status === 'failed'
                    ? 'Processing failed. Please re-upload and process your documents.'
                    : 'Upload and process documents before chatting.'}
              </div>
            )}
            <form
              className="mx-auto flex max-w-3xl gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSend()
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  chatReady
                    ? 'Message your documents...'
                    : 'Chat unavailable — process documents first'
                }
                disabled={isStreaming || !chatReady}
                className="min-h-[48px] flex-1 rounded-2xl border border-neutral-800 bg-[#111] px-4 py-3 text-sm text-white placeholder:text-neutral-700 transition-all duration-200 focus:border-[#ff0033]/50 focus:outline-none focus:ring-2 focus:ring-[#ff0033]/20 focus:shadow-[0_0_15px_rgba(255,0,51,0.1)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim() || !chatReady}
                className="rounded-2xl bg-[#ff0033] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[rgba(255,0,51,0.2)] transition-all duration-200 hover:bg-[#ff1744] hover:shadow-[0_0_20px_rgba(255,0,51,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </footer>
        </div>

        <div className="hidden lg:block">
          <SourceViewer
            open={sourcesOpen}
            onToggle={() => setSourcesOpen(false)}
            sources={sources}
          />
        </div>
      </div>

      {mobileSourcesOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            type="button"
            aria-label="Close sources"
            className="absolute inset-0 bg-black/80"
            onClick={() => setMobileSourcesOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-[min(100vw,20rem)] flex-col border-l border-[#ff0033]/10 bg-[#0a0a0a] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileSourcesOpen(false)}
              className="flex items-center gap-2 border-b border-[#ff0033]/10 px-4 py-3 text-sm text-neutral-400"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to chat
            </button>
            <div className="min-h-0 flex-1 overflow-hidden">
              <SourceViewer
                open
                onToggle={() => setMobileSourcesOpen(false)}
                sources={sources}
              />
            </div>
          </div>
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  )
}
