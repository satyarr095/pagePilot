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
        className={`max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-indigo-600 to-sky-600 text-white'
            : 'border border-slate-700/80 bg-slate-800/60 text-slate-100'
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
              className={`text-[11px] ${isUser ? 'text-indigo-100/80' : 'text-slate-500'}`}
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
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900/60 px-2 py-1 text-xs font-medium text-indigo-200 ring-1 ring-indigo-500/30 transition hover:bg-slate-900 hover:text-white"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Sources ({sources.length})
            </button>
          )}
        </div>

        {!isUser && hasSources && expanded && (
          <ul className="mt-3 space-y-2 border-t border-slate-700/80 pt-3 text-xs text-slate-400">
            {sources.slice(0, 3).map((s, i) => (
              <li key={`${s.document_id}-${s.chunk_index ?? i}`}>
                <span className="font-medium text-slate-300">
                  {s.source_file ?? s.document_id}
                </span>
                {s.chunk_index != null && (
                  <span className="text-slate-500">
                    {' '}
                    · chunk {s.chunk_index}
                  </span>
                )}
                <span className="text-indigo-300/90">
                  {' '}
                  · score {(resolveScore(s) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
            {sources.length > 3 && (
              <li className="text-slate-500">
                +{sources.length - 3} more in side panel
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
