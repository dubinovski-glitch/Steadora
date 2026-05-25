import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { problemApi } from '../../api/problems'
import { Badge, priorityVariant } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { Pagination } from '../../components/primitives/Pagination'
import { useAppStore } from '../../store/appStore'
import type { Problem } from '../../types'

const PAGE_SIZE = 25

const STATE_STEPS = ['investigating', 'rca', 'workaround', 'implementing_fix', 'vendor_engaged', 'closed']

function StateProgress({ stateCode }: { stateCode: string }) {
  const idx = STATE_STEPS.indexOf(stateCode)
  return (
    <div className="flex items-center gap-1">
      {STATE_STEPS.map((s, i) => (
        <div key={s} className={`w-2 h-2 rounded-full ${i < idx ? 'bg-[#1f8a4c]' : i === idx ? 'bg-accent' : 'bg-border-default'}`} title={s} />
      ))}
    </div>
  )
}

interface Props { addToast: (t: string) => void }

export function ProblemsView({ addToast: _addToast }: Props) {
  const { setShowNewProblem, openProblem } = useAppStore()
  const [problems, setProblems] = useState<Problem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [includeResolved, setIncludeResolved] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    problemApi.getAll(includeResolved, true, page, PAGE_SIZE)
      .then(res => { setProblems(res.items); setTotal(res.total) })
      .finally(() => setLoading(false))
  }, [includeResolved, page])

  const resetPage = (checked: boolean) => { setIncludeResolved(checked); setPage(1) }

  const active = problems.filter(p => p.resolvedAt === null)
  const resolved = problems.filter(p => p.resolvedAt !== null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Problem management</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={includeResolved} onChange={e => resetPage(e.target.checked)} className="rounded" />
            Show resolved
          </label>
          <button
            onClick={() => setShowNewProblem(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus size={14} /> New Problem
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          ['Open problems', total],
          ['Linked incidents', active.reduce((s, p) => s + p.linkedIncidentCount, 0)],
          ['Known errors', active.filter(p => p.isKnownError).length],
          ['Avg age (days)', active.length ? Math.round(active.reduce((s, p) => s + (Date.now() - new Date(p.openedAt).getTime()) / 86400000, 0) / active.length) : 0],
        ].map(([label, val]) => (
          <div key={String(label)} className="bg-surface rounded-lg border border-border-default px-4 py-3 shadow-sm">
            <div className="text-xs text-text-secondary mb-1">{label}</div>
            <div className="text-2xl font-semibold tabular">{val}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading…</div>
      ) : (
        <>
          <ProblemGroup title="Active problems" items={active} onOpen={openProblem} />
          {resolved.length > 0 && <ProblemGroup title="Recently resolved" items={resolved} onOpen={openProblem} />}
          {total > PAGE_SIZE && (
            <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}

function ProblemGroup({ title, items, onOpen }: { title: string; items: Problem[]; onOpen: (id: number) => void }) {
  if (items.length === 0) return null
  return (
    <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default bg-subtle">
        <h2 className="text-sm font-medium text-text-primary">{title} <span className="text-text-muted">({items.length})</span></h2>
      </div>
      <div className="zebra-list">
      {items.map(p => (
        <div key={p.problemId} onClick={() => onOpen(p.problemId)} className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-border-default last:border-0 hover:bg-hover transition-colors items-start cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="font-mono text-text-primary">{p.number}</span>
            <Badge variant={priorityVariant(p.priorityCode)}>{p.priorityCode}</Badge>
          </div>
          <div className="col-span-2">
            <div className="font-medium text-text-primary">{p.title}</div>
            {p.rootCause && <div className="text-text-secondary mt-0.5 line-clamp-1">{p.rootCause}</div>}
            {p.isKnownError && <span className="inline-flex mt-1 text-xs bg-[#fdf3e3] text-[#d97706] border border-[#f3d9a4] px-1.5 py-0.5 rounded">Known error</span>}
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-text-secondary">{p.stateName}</div>
            <StateProgress stateCode={p.stateCode} />
          </div>
          <div className="flex items-center gap-2">
            {p.assigneeName ? (
              <>
                <Avatar initials={p.assigneeInitials} color={p.assigneeColor} size="sm" />
                <span className="text-text-secondary">{p.assigneeName}</span>
              </>
            ) : <span className="text-text-muted">Unassigned</span>}
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}
