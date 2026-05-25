import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Plus, Trash2, Download, Columns3, ChevronUp, ChevronDown } from 'lucide-react'
import { incidentApi } from '../../api/incidents'
import { useAppStore } from '../../store/appStore'
import { Badge, priorityVariant, statusVariant } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { SlaBar } from '../../components/primitives/SlaBar'
import { exportIncidentsToCsv } from '../../utils/exportCsv'
import type { Incident } from '../../types'

const TABS = [
  { key: '', label: 'All' },
  { key: 'progress', label: 'Assigned to me' },
  { key: 'new', label: 'Unassigned' },
  { key: 'sla', label: 'SLA risk' },
  { key: 'resolved', label: 'Resolved' },
]

// ── Column definitions ──────────────────────────────────────────────────────

type ColKey =
  | 'priority' | 'title' | 'status' | 'assignee' | 'service' | 'sla' | 'updated'
  | 'severity' | 'category' | 'group' | 'caller'
  | 'location' | 'contactMethod' | 'openedAt' | 'comments' | 'majorIncident'

interface ColDef {
  key: ColKey
  label: string
  thClass: string
  renderCell: (inc: Incident) => React.ReactNode
}

const ALL_COLUMNS: ColDef[] = [
  {
    key: 'priority',
    label: 'Priority',
    thClass: 'w-28',
    renderCell: inc => (
      <Badge variant={priorityVariant(inc.priorityCode)}>
        {inc.priorityId}-{inc.priorityCode.charAt(0).toUpperCase() + inc.priorityCode.slice(1)}
      </Badge>
    ),
  },
  {
    key: 'title',
    label: 'Title',
    thClass: '',
    renderCell: inc => <span className="text-text-primary font-medium">{inc.title}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    thClass: 'w-28',
    renderCell: inc => <Badge variant={statusVariant(inc.statusCode)}>{inc.statusCode}</Badge>,
  },
  {
    key: 'assignee',
    label: 'Assignee',
    thClass: 'w-32',
    renderCell: inc => inc.assigneeName ? (
      <div className="flex items-center gap-1.5">
        <Avatar initials={inc.assigneeInitials} color={inc.assigneeColor} size="sm" />
        <span className="text-text-secondary truncate">{inc.assigneeName.split(' ')[0]}</span>
      </div>
    ) : <span className="text-text-muted">—</span>,
  },
  {
    key: 'service',
    label: 'Service',
    thClass: 'w-28',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.serviceName ?? '—'}</span>,
  },
  {
    key: 'sla',
    label: 'SLA',
    thClass: 'w-28',
    renderCell: inc => (
      <SlaBar percent={inc.slaPercent} breachedAt={inc.slaBreachedAt} targetMinutes={inc.slaTargetMinutes}
        startedAt={inc.slaStartedAt} pausedSeconds={inc.slaPausedSeconds} compact />
    ),
  },
  {
    key: 'updated',
    label: 'Updated',
    thClass: 'w-28',
    renderCell: inc => <span className="text-text-tertiary tabular">{new Date(inc.updatedAt).toLocaleDateString()}</span>,
  },
  {
    key: 'severity',
    label: 'Severity',
    thClass: 'w-24',
    renderCell: inc => <span className="text-text-secondary">{inc.severityCode ?? '—'}</span>,
  },
  {
    key: 'category',
    label: 'Category',
    thClass: 'w-32',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.categoryName ?? '—'}</span>,
  },
  {
    key: 'group',
    label: 'Group',
    thClass: 'w-32',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.groupName ?? '—'}</span>,
  },
  {
    key: 'caller',
    label: 'Caller',
    thClass: 'w-32',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.callerName ?? '—'}</span>,
  },
  {
    key: 'location',
    label: 'Location',
    thClass: 'w-32',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.location ?? '—'}</span>,
  },
  {
    key: 'contactMethod',
    label: 'Contact',
    thClass: 'w-24',
    renderCell: inc => <span className="text-text-secondary">{inc.contactMethodCode ?? '—'}</span>,
  },
  {
    key: 'openedAt',
    label: 'Opened',
    thClass: 'w-28',
    renderCell: inc => <span className="text-text-tertiary tabular">{new Date(inc.openedAt).toLocaleDateString()}</span>,
  },
  {
    key: 'comments',
    label: 'Comments',
    thClass: 'w-20',
    renderCell: inc => <span className="text-text-secondary tabular">{inc.commentCount}</span>,
  },
  {
    key: 'majorIncident',
    label: 'Major',
    thClass: 'w-16',
    renderCell: inc => inc.isMajorIncident
      ? <span className="text-xs font-medium text-red-600">Yes</span>
      : <span className="text-text-muted">—</span>,
  },
]

const COL_MAP = Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c])) as Record<ColKey, ColDef>
const DEFAULT_VISIBLE: ColKey[] = ['priority', 'title', 'status', 'assignee', 'service', 'sla', 'updated']

// ── Component ───────────────────────────────────────────────────────────────

interface Props { addToast: (t: string) => void }

export function IncidentsView({ addToast }: Props) {
  const { openIncident, setShowNewIncident } = useAppStore()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // visibleOrder = ordered list of visible column keys
  const [visibleOrder, setVisibleOrder] = useState<ColKey[]>([...DEFAULT_VISIBLE])
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await incidentApi.getQueue({
        search: search || undefined,
        status: tab && tab !== 'sla' ? tab : undefined,
        slaAtRisk: tab === 'sla',
        unassigned: tab === 'new',
        includeResolved: tab === 'resolved',
        myGroupsOnly: true,
      })
      setIncidents(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab, search])

  useEffect(() => {
    if (!showColPicker) return
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node))
        setShowColPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColPicker])

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

  // Add a hidden column → append to end of visible list
  const showCol = (key: ColKey) =>
    setVisibleOrder(prev => [...prev, key])

  // Remove a visible column → remove from list
  const hideCol = (key: ColKey) =>
    setVisibleOrder(prev => prev.filter(k => k !== key))

  // Move a visible column up or down
  const moveCol = (key: ColKey, dir: -1 | 1) => {
    setVisibleOrder(prev => {
      const idx = prev.indexOf(key)
      if (idx < 0) return prev
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

  const visibleSet = new Set(visibleOrder)
  const hiddenCols = ALL_COLUMNS.filter(c => !visibleSet.has(c.key))
  const activeCols = visibleOrder.map(k => COL_MAP[k]).filter(Boolean)
  const totalCols = activeCols.length + 2  // +2 for checkbox + ID

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

          {/* Column picker */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium transition-colors ${showColPicker ? 'border-accent text-accent bg-accent/5' : 'border-border-default hover:bg-hover text-text-secondary'}`}
            >
              <Columns3 size={14} /> Columns
            </button>

            {showColPicker && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-border-default rounded-lg shadow-lg w-56 py-2 max-h-[480px] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-border-default">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Columns</span>
                  <button
                    onClick={() => setVisibleOrder([...DEFAULT_VISIBLE])}
                    className="text-[11px] text-accent hover:underline"
                  >
                    Reset
                  </button>
                </div>

                {/* Visible (shown) columns — ordered */}
                {visibleOrder.length > 0 && (
                  <>
                    <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Shown</p>
                    {visibleOrder.map((key, idx) => {
                      const col = COL_MAP[key]
                      if (!col) return null
                      return (
                        <div key={key} className="flex items-center gap-1 px-2 py-1 hover:bg-hover group">
                          <input
                            type="checkbox"
                            checked
                            onChange={() => hideCol(key)}
                            className="w-3.5 h-3.5 accent-accent shrink-0"
                          />
                          <span className="flex-1 text-sm text-text-primary ml-1 truncate">{col.label}</span>
                          <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => moveCol(key, -1)}
                              disabled={idx === 0}
                              className="p-0.5 rounded hover:bg-border-default disabled:opacity-30 text-text-muted hover:text-text-primary"
                            >
                              <ChevronUp size={11} />
                            </button>
                            <button
                              onClick={() => moveCol(key, 1)}
                              disabled={idx === visibleOrder.length - 1}
                              className="p-0.5 rounded hover:bg-border-default disabled:opacity-30 text-text-muted hover:text-text-primary"
                            >
                              <ChevronDown size={11} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Hidden columns — available to add */}
                {hiddenCols.length > 0 && (
                  <>
                    <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted border-t border-border-default mt-2">Hidden</p>
                    {hiddenCols.map(col => (
                      <div key={col.key} className="flex items-center gap-1 px-2 py-1 hover:bg-hover">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => showCol(col.key)}
                          className="w-3.5 h-3.5 accent-accent shrink-0"
                        />
                        <span className="flex-1 text-sm text-text-muted ml-1 truncate">{col.label}</span>
                      </div>
                    ))}
                  </>
                )}

              </div>
            )}
          </div>

          <button
            onClick={() => exportIncidentsToCsv(incidents, `incidents-${new Date().toISOString().slice(0, 10)}.csv`)}
            disabled={incidents.length === 0}
            title="Export to Excel / CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-default hover:bg-hover disabled:opacity-40 rounded-md text-sm font-medium text-text-secondary transition-colors"
          >
            <Download size={14} /> Export
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
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  className="rounded"
                  onChange={e => setSelected(e.target.checked ? new Set(incidents.map(i => i.incidentId)) : new Set())}
                />
              </th>
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs w-36">ID</th>
              {activeCols.map(col => (
                <th key={col.key} className={`px-3 py-2 text-left font-medium text-text-tertiary text-xs ${col.thClass}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={totalCols} className="px-3 py-8 text-center text-text-muted">Loading…</td></tr>
            ) : incidents.length === 0 ? (
              <tr><td colSpan={totalCols} className="px-3 py-8 text-center text-text-muted">No incidents found</td></tr>
            ) : incidents.map(inc => (
              <tr
                key={inc.incidentId}
                className={`table-row border-b border-border-default last:border-0 hover:bg-hover cursor-pointer transition-colors ${selected.has(inc.incidentId) ? 'row-selected' : ''}`}
                onClick={() => openIncident(inc.incidentId)}
              >
                <td className="px-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selected.has(inc.incidentId)}
                    onChange={() => toggleSelect(inc.incidentId)}
                  />
                </td>
                <td className="px-3 text-text-primary font-mono text-sm whitespace-nowrap">{inc.number}</td>
                {activeCols.map(col => (
                  <td key={col.key} className="px-3">
                    {col.renderCell(inc)}
                  </td>
                ))}
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
