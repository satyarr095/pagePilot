import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { Message, RetrievedSource } from '../lib/api'
import { useChatStore } from '../stores/chat-store'

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <div className="flex items-center gap-1">
        <span className="thinking-dot h-2 w-2 rounded-full bg-indigo-400" />
        <span className="thinking-dot h-2 w-2 rounded-full bg-indigo-400 [animation-delay:150ms]" />
        <span className="thinking-dot h-2 w-2 rounded-full bg-indigo-400 [animation-delay:300ms]" />
      </div>
      <span className="ml-1.5 text-xs text-slate-400">Thinking...</span>
    </div>
  )
}

interface ChatWindowProps {
  onShowSources: (sources: RetrievedSource[]) => void
}

export function ChatWindow({ onShowSources }: ChatWindowProps) {
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const bottomRef = useRef<HTMLDivElement>(null)

  const hasStreamedText = streamingContent.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streamingContent, isStreaming])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 && !isStreaming && (
          <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/30 px-6 py-16 text-center">
            <p className="text-lg font-medium text-slate-200">
              Start a conversation
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Ask questions about your uploaded documents. Responses stream in
              live with retrieved sources you can inspect on the right.
            </p>
          </div>
        )}

        {messages.map((m: Message) => (
          <MessageBubble
            key={m.id}
            message={m}
            onShowSources={
              m.role === 'assistant' ? onShowSources : undefined
            }
          />
        ))}

        {isStreaming && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[min(100%,42rem)] rounded-2xl border border-slate-700/80 bg-slate-800/60 px-4 py-3 text-sm leading-relaxed text-slate-100">
              {hasStreamedText ? (
                <>
                  <span className="whitespace-pre-wrap break-words">
                    {streamingContent}
                  </span>
                  <span className="streaming-cursor" aria-hidden />
                </>
              ) : (
                <ThinkingIndicator />
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
