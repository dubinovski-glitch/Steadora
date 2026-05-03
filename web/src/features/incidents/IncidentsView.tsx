import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Trash2 } from 'lucide-react'
import { incidentApi } from '../../api/incidents'
import { useAppStore } from '../../store/appStore'
import { Badge, priorityVariant, statusVariant } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { SlaBar } from '../../components/primitives/SlaBar'
import type { Incident } from '../../types'

const TABS = [
  { key: '', label: 'All' },
  { key: 'progress', label: 'Assigned to me' },
  { key: 'new', label: 'Unassigned' },
  { key: 'sla', label: 'SLA risk' },
  { key: 'resolved', label: 'Resolved' },
]

interface Props { addToast: (t: string) => void }

export function IncidentsView({ addToast }: Props) {
  const { openIncident, setShowNewIncident } = useAppStore()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const res = await incidentApi.getQueue({
        search: search || undefined,
        status: tab && tab !== 'sla' ? tab : undefined,
        slaAtRisk: tab === 'sla',
        unassigned: tab === 'new',
        includeResolved: tab === 'resolved',
      })
      setIncidents(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab, search])

  const toggleSelect = (id: number) => {
    setSelected(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const bulkClose = async () => {
    await incidentApi.bulkClose([...selected])
    addToast(`Closed ${selected.size} incident${selected.size !== 1 ? 's' : ''}`)
    setSelected(new Set())
    load()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-text-primary">Incidents</h1>
          <span className="text-xs bg-[#e7eefc] text-[#2563c9] px-2 py-0.5 rounded-full font-medium">Live</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover text-text-secondary">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowNewIncident(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={14} /> New incident
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-border-default">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${
              tab === t.key
                ? 'border-accent text-accent-text font-medium'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search incidents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-border-default bg-surface text-sm focus:outline-none focus:border-border-focus"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border-default bg-surface shadow-sm">
        <table className="w-full zebra-table">
          <thead>
            <tr className="bg-subtle border-b border-border-default">
              <th className="w-8 px-3 py-2"><input type="checkbox" className="rounded" onChange={e => setSelected(e.target.checked ? new Set(incidents.map(i => i.incidentId)) : new Set())} /></th>
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs w-24">ID</th>
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs w-16">Priority</th>
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs">Title</th>
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs w-24">Status</th>
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs w-28">Assignee</th>
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs w-20">Service</th>
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs w-28">SLA</th>
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs w-28">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-text-muted">Loading…</td></tr>
            ) : incidents.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-text-muted">No incidents found</td></tr>
            ) : incidents.map(inc => (
              <tr
                key={inc.incidentId}
                className={`table-row border-b border-border-default last:border-0 hover:bg-hover cursor-pointer transition-colors ${selected.has(inc.incidentId) ? 'row-selected' : ''}`}
                onClick={() => openIncident(inc.incidentId)}
              >
                <td className="px-3" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" className="rounded" checked={selected.has(inc.incidentId)} onChange={() => toggleSelect(inc.incidentId)} />
                </td>
                <td className="px-3 tabular text-text-primary font-mono">{inc.number}</td>
                <td className="px-3"><Badge variant={priorityVariant(inc.priorityCode)}>{inc.priorityCode}</Badge></td>
                <td className="px-3 text-text-primary font-medium max-w-xs truncate">{inc.title}</td>
                <td className="px-3"><Badge variant={statusVariant(inc.statusCode)}>{inc.statusCode}</Badge></td>
                <td className="px-3">
                  {inc.assigneeName ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar initials={inc.assigneeInitials} color={inc.assigneeColor} size="sm" />
                      <span className="text-text-secondary truncate">{inc.assigneeName.split(' ')[0]}</span>
                    </div>
                  ) : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-3 text-text-secondary truncate">{inc.serviceName ?? '—'}</td>
                <td className="px-3">
                  <SlaBar percent={inc.slaPercent} breachedAt={inc.slaBreachedAt} targetMinutes={inc.slaTargetMinutes} startedAt={inc.slaStartedAt} pausedSeconds={inc.slaPausedSeconds} compact />
                </td>
                <td className="px-3 text-text-tertiary tabular">
                  {new Date(inc.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bulk-enter fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-inverse text-white px-5 py-3 rounded-xl shadow-lg z-40 text-sm">
          <span>{selected.size} selected</span>
          <button onClick={bulkClose} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md transition-colors">
            <Trash2 size={14} /> Close
          </button>
          <button onClick={() => setSelected(new Set())} className="text-white/60 hover:text-white transition-colors">Clear</button>
        </div>
      )}
    </div>
  )
}
