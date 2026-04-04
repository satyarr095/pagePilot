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
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-slate-800/60"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-200">
            {source.source_file ?? source.document_id}
          </p>
          <p className="text-xs text-slate-500">
            Score {(resolveScore(source) * 100).toFixed(1)}%
            {source.chunk_index != null && ` · Chunk ${source.chunk_index}`}
          </p>
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-700/60 px-3 py-3 text-xs leading-relaxed text-slate-400">
          {source.raw_text || source.content || 'No preview available'}
        </div>
      )}
    </div>
  )
}

export function SourceViewer({ open, onToggle, sources }: SourceViewerProps) {
  return (
    <div
      className={`relative flex shrink-0 flex-col border-l border-slate-800/80 bg-slate-950/95 transition-[width] duration-300 ease-out ${
        open ? 'w-full max-w-md lg:w-96' : 'w-0 overflow-hidden border-l-0'
      }`}
    >
      <div className="flex h-full min-w-[min(100vw,24rem)] flex-col">
        <div className="flex h-14 items-center justify-between border-b border-slate-800/80 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Sources</h2>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              {sources.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Collapse sources panel"
          >
            <PanelRightClose className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {sources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
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
      className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-lg border border-slate-700 bg-slate-900/90 px-2 py-2 text-slate-300 shadow-lg transition hover:border-indigo-500/40 hover:text-white lg:block"
      aria-label="Open sources panel"
    >
      <Sparkles className="h-4 w-4" />
      {count > 0 && (
        <span className="ml-1 text-xs font-medium text-indigo-300">{count}</span>
      )}
    </button>
  )
}
