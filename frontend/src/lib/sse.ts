import { getChatStreamUrl, type RetrievedSource } from './api'

export interface StreamCallbacks {
  onToken?: (text: string) => void
  onSources?: (sources: RetrievedSource[]) => void
  onDone?: (sessionId: string) => void
  onError?: (message: string) => void
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

interface SseEvent {
  type: string
  content?: string
  sources?: RetrievedSource[]
  scores?: number[]
  session_id?: string
  message?: string
}

/**
 * Stream chat messages from the backend SSE endpoint.
 *
 * The backend sends all events as default SSE `message` events with a JSON
 * payload containing a `type` field: "sources", "token", "done", or "error".
 */
export async function sendMessage(
  projectId: string,
  message: string,
  sessionId: string | null,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const url = getChatStreamUrl(projectId)

  const body: Record<string, unknown> = { message }
  if (sessionId) body.session_id = sessionId

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    callbacks.onError?.((e as Error).message || 'Network error')
    return
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    callbacks.onError?.(text || `Request failed (${res.status})`)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let doneEmitted = false
  let failed = false

  const emitDone = (sessionId: string) => {
    if (doneEmitted || failed) return
    doneEmitted = true
    callbacks.onDone?.(sessionId)
  }

  const fail = (msg: string) => {
    if (failed) return
    failed = true
    callbacks.onError?.(msg)
  }

  const processBlock = (block: string) => {
    const lines = block.split(/\r?\n/)
    const dataLines: string[] = []

    for (const line of lines) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
    }

    if (dataLines.length === 0) return

    const raw = dataLines.join('\n')
    const evt = safeJsonParse<SseEvent>(raw)
    if (!evt || !evt.type) return

    switch (evt.type) {
      case 'token':
        if (evt.content != null) callbacks.onToken?.(evt.content)
        break
      case 'sources':
        if (evt.sources?.length) {
          const enriched: RetrievedSource[] = evt.sources.map((s, i) => ({
            ...s,
            score: evt.scores?.[i] ?? s.similarity ?? s.score ?? 0,
          }))
          callbacks.onSources?.(enriched)
        }
        break
      case 'done':
        emitDone(evt.session_id ?? '')
        break
      case 'error':
        fail(evt.message ?? 'Stream error')
        break
      default:
        break
    }
  }

  const processBuffer = () => {
    const parts = buffer.split(/\n\n/)
    buffer = parts.pop() ?? ''
    for (const block of parts) {
      if (!block.trim()) continue
      processBlock(block)
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      processBuffer()
    }
    buffer += decoder.decode()
    processBuffer()
    if (!failed && !doneEmitted) emitDone('')
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    fail((e as Error).message || 'Stream interrupted')
  }
}
