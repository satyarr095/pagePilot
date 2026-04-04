import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { Message, RetrievedSource } from '../lib/api'
import { useChatStore } from '../stores/chat-store'

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <div className="flex items-center gap-1">
        <span className="thinking-dot h-2 w-2 rounded-full bg-[#ff0033] shadow-[0_0_8px_rgba(255,0,51,0.55)]" />
        <span className="thinking-dot h-2 w-2 rounded-full bg-[#ff1744] shadow-[0_0_8px_rgba(255,23,68,0.5)] [animation-delay:150ms]" />
        <span className="thinking-dot h-2 w-2 rounded-full bg-[#e53935] shadow-[0_0_8px_rgba(229,57,53,0.5)] [animation-delay:300ms]" />
      </div>
      <span className="ml-1.5 text-xs text-neutral-500">Thinking...</span>
    </div>
  )
}

interface ChatWindowProps {
  onShowSources: (sources: RetrievedSource[]) => void
}

export function ChatWindow({ onShowSources }: ChatWindowProps) {
  const messages = useChatStore((s) => s.messages)
  const streamPhase = useChatStore((s) => s.streamPhase)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isActive = streamPhase !== 'idle'
  const hasTokens = streamingContent.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streamingContent, streamPhase])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 && !isActive && (
          <div className="rounded-2xl border border-dashed border-neutral-800/80 bg-[#0a0a0a] px-6 py-16 text-center">
            <p className="text-lg font-medium text-neutral-200">
              Start a conversation
            </p>
            <p className="mt-2 text-sm text-neutral-600">
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

        {isActive && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[min(100%,42rem)] rounded-2xl border border-neutral-800/80 bg-[#111] px-4 py-3 text-sm leading-relaxed text-neutral-100">
              {hasTokens ? (
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
