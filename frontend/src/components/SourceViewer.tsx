import { ChevronDown, ChevronRight, PanelRightClose, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { RetrievedSource } from '../lib/api'

function resolveScore(s: RetrievedSource): number {
  return s.score ?? s.similarity ?? 0
}

interface SourceViewerProps {
  open: boolean
  onToggle: () => void
  sources: RetrievedSource[]
}

function SourceRow({ source }: { source: RetrievedSource }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-neutral-800/60 bg-[#0a0a0a] transition-all duration-200 hover:border-[#ff0033]/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-all duration-200 hover:bg-white/[0.02]"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-neutral-600" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-neutral-200">
            {source.source_file ?? source.document_id}
          </p>
          <p className="text-xs text-neutral-600">
            Score {(resolveScore(source) * 100).toFixed(1)}%
            {source.chunk_index != null && ` · Chunk ${source.chunk_index}`}
          </p>
        </div>
      </button>
      {open && (
        <div className="border-t border-neutral-800/60 px-3 py-3 text-xs leading-relaxed text-neutral-500">
          {source.raw_text || source.content || 'No preview available'}
        </div>
      )}
    </div>
  )
}

export function SourceViewer({ open, onToggle, sources }: SourceViewerProps) {
  return (
    <div
      className={`relative flex h-full min-h-0 shrink-0 flex-col border-l border-[#ff0033]/10 bg-[#0a0a0a] transition-[width] duration-300 ease-out ${
        open ? 'w-full max-w-md lg:w-96' : 'w-0 overflow-hidden border-l-0'
      }`}
    >
      <div className="flex h-full min-h-0 min-w-[min(100vw,24rem)] flex-col">
        <div className="flex h-14 items-center justify-between border-b border-[#ff0033]/10 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#ff0033]" />
            <h2 className="text-sm font-semibold text-white">Sources</h2>
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-neutral-500 ring-1 ring-neutral-800">
              {sources.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-2 text-neutral-500 transition-all duration-200 hover:bg-white/[0.03] hover:text-white"
            aria-label="Collapse sources panel"
          >
            <PanelRightClose className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {sources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-800/80 bg-[#050505] p-6 text-center text-sm text-neutral-600">
              Retrieved passages will appear here after the assistant responds.
            </div>
          ) : (
            sources.map((s, i) => (
              <SourceRow
                key={`${s.document_id}-${s.chunk_index ?? i}`}
                source={s}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function SourcePanelToggle({
  onClick,
  count,
}: {
  onClick: () => void
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-2 py-2 text-neutral-400 shadow-lg transition-all duration-200 hover:border-[#ff0033]/30 hover:text-white hover:shadow-[0_0_12px_rgba(255,0,51,0.15)] lg:block"
      aria-label="Open sources panel"
    >
      <Sparkles className="h-4 w-4" />
      {count > 0 && (
        <span className="ml-1 text-xs font-medium text-[#ff0033]">{count}</span>
      )}
    </button>
  )
}
