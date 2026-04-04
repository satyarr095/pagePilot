import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { Message, RetrievedSource } from '../lib/api'

interface MessageBubbleProps {
  message: Message
  onShowSources?: (sources: RetrievedSource[]) => void
}

function formatTime(iso?: string) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function resolveScore(s: RetrievedSource): number {
  return s.score ?? s.similarity ?? 0
}

export function MessageBubble({
  message,
  onShowSources,
}: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(false)
  const isUser = message.role === 'user'
  const sources = message.sources ?? []
  const hasSources = sources.length > 0

  if (!message.content?.trim()) return null

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div
        className={`max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
          isUser
            ? 'bg-gradient-to-br from-[#ff0033] to-[#b71c1c] text-white shadow-[0_0_15px_rgba(255,0,51,0.2)]'
            : 'border border-neutral-800/80 bg-[#111] text-neutral-100'
        }`}
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
        </div>

        <div
          className={`mt-2 flex flex-wrap items-center gap-2 ${isUser ? 'justify-end' : 'justify-between'}`}
        >
          {message.created_at && (
            <span
              className={`text-[11px] ${isUser ? 'text-red-100/60' : 'text-neutral-600'}`}
            >
              {formatTime(message.created_at)}
            </span>
          )}
          {!isUser && hasSources && onShowSources && (
            <button
              type="button"
              onClick={() => {
                setExpanded((v) => !v)
                onShowSources(sources)
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-[#ff0033]/10 px-2 py-1 text-xs font-medium text-[#ff1744] ring-1 ring-[#ff0033]/25 transition-all duration-200 hover:bg-[#ff0033]/15 hover:text-white hover:shadow-[0_0_10px_rgba(255,0,51,0.2)]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Sources ({sources.length})
            </button>
          )}
        </div>

        {!isUser && hasSources && expanded && (
          <ul className="mt-3 space-y-2 border-t border-neutral-800/80 pt-3 text-xs text-neutral-500">
            {sources.slice(0, 3).map((s, i) => (
              <li key={`${s.document_id}-${s.chunk_index ?? i}`}>
                <span className="font-medium text-neutral-300">
                  {s.source_file ?? s.document_id}
                </span>
                {s.chunk_index != null && (
                  <span className="text-neutral-600">
                    {' '}
                    · chunk {s.chunk_index}
                  </span>
                )}
                <span className="text-[#ff0033]/80">
                  {' '}
                  · score {(resolveScore(s) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
            {sources.length > 3 && (
              <li className="text-neutral-600">
                +{sources.length - 3} more in side panel
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
