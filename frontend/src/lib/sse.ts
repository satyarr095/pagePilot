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
 * The backend sends default SSE events (no `event:` field) with JSON
 * `data:` payloads containing a `type` discriminator.
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

  const emitDone = (sid: string) => {
    if (doneEmitted || failed) return
    doneEmitted = true
    callbacks.onDone?.(sid)
  }

  const fail = (msg: string) => {
    if (failed) return
    failed = true
    callbacks.onError?.(msg)
  }

  const processBlock = (block: string) => {
    // Split on both \n and \r\n
    const lines = block.split(/\r?\n/)
    const dataLines: string[] = []

    for (const line of lines) {
      // Skip SSE comments (lines starting with ':')
      if (line.startsWith(':')) continue
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
    }

    if (dataLines.length === 0) return

    const raw = dataLines.join('\n')
    if (!raw.trim()) return

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

  /**
   * Split the buffer on blank lines (SSE event boundary).
   * Handles \n\n, \r\n\r\n, and mixed line endings.
   */
  const processBuffer = () => {
    const parts = buffer.split(/\r?\n\r?\n/)
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
    // Flush remaining bytes
    buffer += decoder.decode()
    if (buffer.trim()) processBlock(buffer)
    if (!failed && !doneEmitted) emitDone('')
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    fail((e as Error).message || 'Stream interrupted')
  }
}
