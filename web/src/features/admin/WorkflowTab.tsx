import { SkeletonRows } from '../../components/primitives/Skeleton'
import { useState, useEffect } from 'react'
import { ArrowRight, Plus, GitBranch } from 'lucide-react'
import { api } from '../../api/client'
import type { IncidentStatus } from '../../types'

interface Props { addToast: (msg: string) => void }

const REQUIRED_FIELDS = [
  { transition: 'New → In Progress', fields: ['Assignee'] },
  { transition: 'Resolved → Closed', fields: ['Resolution code', 'Resolution notes'] },
]

// Workflow & states admin tab: read-only visualisation of the incident lifecycle states
// (with terminal / pauses-SLA badges) and the required-fields-per-transition table.
export function WorkflowTab({ addToast: _addToast }: Props) {
  const [statuses, setStatuses] = useState<IncidentStatus[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch the incident status lookup once on mount to render the lifecycle flow.
  useEffect(() => {
    api.get<IncidentStatus[]>('/lookups/incident-statuses')
      .then(data => setStatuses(data))
      .finally(() => setLoading(false))
  }, [])

  // Pick the border/text/background colour classes for a status node based on its flags.
  const getStateStyle = (status: IncidentStatus) => {
    if (status.isTerminal && status.code === 'closed') return 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400'
    if (status.isTerminal) return 'border-green-400 text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400'
    if (status.pausesSla) return 'border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400'
    return 'border-accent text-accent bg-accent-subtle'
  }

  if (loading) return <SkeletonRows rows={5} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Workflow &amp; states</h2>
          <p className="text-sm text-text-muted">Incident lifecycle states and transition rules.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted border border-border-default rounded-md opacity-50 cursor-not-allowed"
            >
              <Plus size={14} />
              Add state
            </button>
            <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block bg-surface border border-border-default rounded-md px-2 py-1 text-xs text-text-muted shadow whitespace-nowrap">
              Coming soon
            </div>
          </div>
          <div className="relative group">
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted border border-border-default rounded-md opacity-50 cursor-not-allowed"
            >
              <GitBranch size={14} />
              Edit transitions
            </button>
            <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block bg-surface border border-border-default rounded-md px-2 py-1 text-xs text-text-muted shadow whitespace-nowrap">
              Coming soon
            </div>
          </div>
        </div>
      </div>

      {/* Incident workflow card */}
      <div className="bg-surface rounded-lg border border-border-default p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Incident workflow</h3>
        {statuses.length === 0 ? (
          <p className="text-sm text-text-muted">No statuses loaded</p>
        ) : (
          <div className="flex items-center flex-wrap gap-2">
            {statuses.map((status, i) => (
              <div key={status.statusId} className="flex items-center gap-2">
                <div className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-lg border-2 min-w-[90px] ${getStateStyle(status)}`}>
                  <span className="text-sm font-semibold">{status.displayName}</span>
                  <div className="flex gap-1">
                    {status.isTerminal && (
                      <span className="text-[14px] px-1 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-medium">terminal</span>
                    )}
                    {status.pausesSla && (
                      <span className="text-[14px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-medium">pauses SLA</span>
                    )}
                  </div>
                </div>
                {i < statuses.length - 1 && (
                  <ArrowRight size={16} className="text-text-muted shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-default">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-accent bg-accent-subtle" />
            <span className="text-xs text-text-muted">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30" />
            <span className="text-xs text-text-muted">Pauses SLA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-50 dark:bg-green-950/30" />
            <span className="text-xs text-text-muted">Terminal</span>
          </div>
        </div>
      </div>

      {/* Required fields per state */}
      <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <h3 className="text-sm font-semibold text-text-primary">Required fields per transition</h3>
        </div>
        <div className="divide-y divide-border-default">
          {REQUIRED_FIELDS.map(row => (
            <div key={row.transition} className="flex items-center gap-4 px-4 py-3">
              <span className="text-sm w-48 shrink-0 font-mono text-xs text-text-secondary">{row.transition}</span>
              <div className="flex gap-2 flex-wrap">
                {row.fields.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded bg-subtle border border-border-default text-xs text-text-secondary">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
