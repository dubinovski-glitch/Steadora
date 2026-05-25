import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, AlertCircle, AlertTriangle, BookOpen } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { searchApi, type SearchResult } from '../api/search'
import { Badge, priorityVariant, statusVariant } from './primitives/Badge'

export function CommandPalette() {
  const { showCommandPalette, setShowCommandPalette, openIncident, openProblem, setView } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (showCommandPalette) {
      setQuery('')
      setResults([])
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showCommandPalette])

  const doSearch = useCallback((q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    searchApi.search(q)
      .then(r => { setResults(r); setLoading(false) })
      .catch(() => { setResults([]); setLoading(false) })
  }, [])

  const handleChange = (q: string) => {
    setQuery(q)
    setSelected(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 250)
  }

  const open = (r: SearchResult) => {
    setShowCommandPalette(false)
    if (r.type === 'incident') { openIncident(r.id) }
    else if (r.type === 'problem') { openProblem(r.id) }
    else { setView('knowledge') }
  }

  useEffect(() => {
    if (!showCommandPalette) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowCommandPalette(false); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) open(results[selected])
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [showCommandPalette, results, selected])

  if (!showCommandPalette) return null

  const typeIcon = (type: string) => {
    if (type === 'incident') return <AlertCircle size={14} className="text-text-muted shrink-0" />
    if (type === 'problem') return <AlertTriangle size={14} className="text-text-muted shrink-0" />
    return <BookOpen size={14} className="text-text-muted shrink-0" />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setShowCommandPalette(false)}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-xl bg-surface rounded-xl shadow-2xl border border-border-default overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Search incidents, problems, knowledge base…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          {loading && <span className="text-xs text-text-muted animate-pulse">Searching…</span>}
          <kbd className="text-xs text-text-muted border border-border-default rounded px-1 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => open(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selected ? 'bg-hover' : 'hover:bg-hover'}`}
              >
                {typeIcon(r.type)}
                <span className="font-mono text-xs text-text-muted shrink-0 w-20 truncate">{r.number}</span>
                <span className="flex-1 text-sm text-text-primary truncate">{r.title}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {r.priorityCode && <Badge variant={priorityVariant(r.priorityCode)}>{r.priorityCode}</Badge>}
                  {r.statusCode && <Badge variant={statusVariant(r.statusCode)}>{r.statusCode}</Badge>}
                  {r.stateCode && !r.statusCode && <Badge variant="default">{r.stateCode.replace(/_/g, ' ')}</Badge>}
                </div>
              </button>
            ))}
          </div>
        )}

        {results.length === 0 && query.length >= 2 && !loading && (
          <div className="px-4 py-6 text-center text-sm text-text-muted">No results for "{query}"</div>
        )}

        {query.length === 0 && (
          <div className="px-4 py-3 text-xs text-text-muted flex items-center gap-4">
            <span><kbd className="border border-border-default rounded px-1">↑↓</kbd> navigate</span>
            <span><kbd className="border border-border-default rounded px-1">↵</kbd> open</span>
            <span><kbd className="border border-border-default rounded px-1">Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  )
}
