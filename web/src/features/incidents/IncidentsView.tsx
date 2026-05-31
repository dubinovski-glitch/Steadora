import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Plus, Trash2, Download, Columns3, ChevronUp, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, X, Inbox, Flame } from 'lucide-react'
import { incidentApi } from '../../api/incidents'
import { lookupsApi } from '../../api/lookups'
import { api } from '../../api/client'
import { useAppStore } from '../../store/appStore'
import { Badge, priorityVariant, statusVariant } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { SlaBar } from '../../components/primitives/SlaBar'
import { Pagination } from '../../components/primitives/Pagination'
import { exportIncidentsToCsv } from '../../utils/exportCsv'
import type { Incident, Priority, Group } from '../../types'

const PAGE_SIZE = 25
const COL_STORAGE_KEY = 'inc-columns'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

const STATUS_LABEL: Record<string, string> = {
  new: 'New', progress: 'In Progress', pending: 'Pending',
  resolved: 'Resolved', closed: 'Closed',
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: '', label: 'All' },
  { key: 'progress', label: 'Assigned to me' },
  { key: 'new', label: 'Unassigned' },
  { key: 'sla', label: 'SLA risk' },
  { key: 'resolved', label: 'Resolved' },
]

// ── Column definitions ────────────────────────────────────────────────────────

type ColKey =
  | 'priority' | 'title' | 'status' | 'assignee' | 'service' | 'sla' | 'updated'
  | 'severity' | 'category' | 'group' | 'caller'
  | 'location' | 'contactMethod' | 'openedAt' | 'comments' | 'majorIncident'

interface ColDef {
  key: ColKey
  label: string
  thClass: string
  sortKey?: string
  renderCell: (inc: Incident) => React.ReactNode
}

const ALL_COLUMNS: ColDef[] = [
  {
    key: 'priority', label: 'Priority', thClass: 'w-24', sortKey: 'PriorityId',
    renderCell: inc => (
      <Badge variant={priorityVariant(inc.priorityCode)}>
        {inc.priorityCode.charAt(0).toUpperCase() + inc.priorityCode.slice(1)}
      </Badge>
    ),
  },
  {
    key: 'title', label: 'Title', thClass: '', sortKey: 'Title',
    renderCell: inc => (
      <div className="flex items-center gap-1.5 min-w-0">
        {inc.isMajorIncident && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-[#fdecec] text-[#c8252b] border border-[#f5c2c4] shrink-0">
            <Flame size={10} /> MI
          </span>
        )}
        <span className="text-text-primary font-medium truncate">{inc.title}</span>
      </div>
    ),
  },
  {
    key: 'status', label: 'Status', thClass: 'w-28', sortKey: 'StatusId',
    renderCell: inc => (
      <Badge variant={statusVariant(inc.statusCode)}>
        {STATUS_LABEL[inc.statusCode] ?? inc.statusCode}
      </Badge>
    ),
  },
  {
    key: 'assignee', label: 'Assignee', thClass: 'w-36',
    renderCell: inc => inc.assigneeName ? (
      <div className="flex items-center gap-1.5">
        <Avatar initials={inc.assigneeInitials} color={inc.assigneeColor} size="sm" />
        <span className="text-text-secondary truncate">{inc.assigneeName.split(' ')[0]}</span>
      </div>
    ) : <span className="text-xs text-text-muted italic">Unassigned</span>,
  },
  {
    key: 'service', label: 'Service', thClass: 'w-28', sortKey: 'ServiceName',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.serviceName ?? '—'}</span>,
  },
  {
    key: 'sla', label: 'SLA', thClass: 'w-28',
    renderCell: inc => (
      <SlaBar percent={inc.slaPercent} breachedAt={inc.slaBreachedAt} targetMinutes={inc.slaTargetMinutes}
        startedAt={inc.slaStartedAt} pausedSeconds={inc.slaPausedSeconds} compact />
    ),
  },
  {
    key: 'updated', label: 'Updated', thClass: 'w-24', sortKey: 'UpdatedAt',
    renderCell: inc => (
      <span className="text-text-tertiary tabular" title={new Date(inc.updatedAt).toLocaleString()}>
        {relativeTime(inc.updatedAt)}
      </span>
    ),
  },
  {
    key: 'severity', label: 'Severity', thClass: 'w-24',
    renderCell: inc => <span className="text-text-secondary">{inc.severityCode ?? '—'}</span>,
  },
  {
    key: 'category', label: 'Category', thClass: 'w-32',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.categoryName ?? '—'}</span>,
  },
  {
    key: 'group', label: 'Group', thClass: 'w-32',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.groupName ?? '—'}</span>,
  },
  {
    key: 'caller', label: 'Caller', thClass: 'w-32',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.callerName ?? '—'}</span>,
  },
  {
    key: 'location', label: 'Location', thClass: 'w-32',
    renderCell: inc => <span className="text-text-secondary truncate">{inc.location ?? '—'}</span>,
  },
  {
    key: 'contactMethod', label: 'Contact', thClass: 'w-24',
    renderCell: inc => <span className="text-text-secondary">{inc.contactMethodCode ?? '—'}</span>,
  },
  {
    key: 'openedAt', label: 'Opened', thClass: 'w-24', sortKey: 'OpenedAt',
    renderCell: inc => (
      <span className="text-text-tertiary tabular" title={new Date(inc.openedAt).toLocaleString()}>
        {relativeTime(inc.openedAt)}
      </span>
    ),
  },
  {
    key: 'comments', label: 'Comments', thClass: 'w-20',
    renderCell: inc => <span className="text-text-secondary tabular">{inc.commentCount}</span>,
  },
  {
    key: 'majorIncident', label: 'Major', thClass: 'w-16',
    renderCell: inc => inc.isMajorIncident
      ? <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#c8252b]"><Flame size={12} /> Yes</span>
      : <span className="text-text-muted">—</span>,
  },
]

const COL_MAP = Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c])) as Record<ColKey, ColDef>
const DEFAULT_VISIBLE: ColKey[] = ['priority', 'title', 'status', 'assignee', 'service', 'sla', 'updated']

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadSavedColumns(): ColKey[] {
  try {
    const raw = localStorage.getItem(COL_STORAGE_KEY)
    if (!raw) return DEFAULT_VISIBLE
    const parsed = JSON.parse(raw) as ColKey[]
    const valid = parsed.filter(k => k in COL_MAP)
    return valid.length > 0 ? valid : DEFAULT_VISIBLE
  } catch {
    return DEFAULT_VISIBLE
  }
}

function readUrl() {
  const p = new URLSearchParams(window.location.search)
  return {
    tab:      p.get('tab') ?? '',
    search:   p.get('q') ?? '',
    page:     Math.max(1, parseInt(p.get('page') ?? '1', 10)),
    sortBy:   p.get('sort') ?? 'UpdatedAt',
    sortDesc: p.get('dir') !== 'asc',
    priority: p.get('priority') ?? '',
    groupId:  p.get('group') ? parseInt(p.get('group')!, 10) : ('' as number | ''),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { addToast: (t: string) => void }

export function IncidentsView({ addToast }: Props) {
  const { openIncident, setShowNewIncident } = useAppStore()

  // Filter state — initialised from URL on mount
  const [tab,           setTabRaw]       = useState(() => readUrl().tab)
  const [searchInput,   setSearchInput]  = useState(() => readUrl().search)
  const [debouncedSearch, setDebounced]  = useState(() => readUrl().search)
  const [page,          setPage]         = useState(() => readUrl().page)
  const [sortBy,        setSortBy]       = useState(() => readUrl().sortBy)
  const [sortDesc,      setSortDesc]     = useState(() => readUrl().sortDesc)
  const [filterPriority, setFilterPriority] = useState(() => readUrl().priority)
  const [filterGroupId,  setFilterGroupId]  = useState<number | ''>(() => readUrl().groupId)

  // Data
  const [incidents,     setIncidents]    = useState<Incident[]>([])
  const [total,         setTotal]        = useState(0)
  const [loading,       setLoading]      = useState(true)
  const [selected,      setSelected]     = useState<Set<number>>(new Set())
  const [refreshTick,   setRefreshTick]  = useState(0)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  // Lookup data for quick filters
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [groups,     setGroups]     = useState<Group[]>([])

  // Column picker
  const [visibleOrder,  setVisibleOrder]  = useState<ColKey[]>(loadSavedColumns)
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)
  const skipFirstDebounce = useRef(true)

  // ── Lookups ───────────────────────────────────────────────────────────────

  useEffect(() => {
    lookupsApi.getPriorities().then(setPriorities).catch(() => {})
    api.get<Group[]>('/users/groups').then(setGroups).catch(() => {})
  }, [])

  // ── Search debounce ───────────────────────────────────────────────────────

  useEffect(() => {
    if (skipFirstDebounce.current) { skipFirstDebounce.current = false; return }
    const t = setTimeout(() => { setDebounced(searchInput); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // ── Main fetch ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await incidentApi.getQueue({
          search:         debouncedSearch || undefined,
          status:         tab && tab !== 'sla' ? tab : undefined,
          slaAtRisk:      tab === 'sla',
          unassigned:     tab === 'new',
          includeResolved: tab === 'resolved',
          priority:       filterPriority || undefined,
          groupId:        filterGroupId || undefined,
          sortBy,
          sortDesc,
          page,
          pageSize:       PAGE_SIZE,
        })
        if (!cancelled) {
          setIncidents(res.items)
          setTotal(res.total)
          setLastRefreshed(new Date())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [tab, debouncedSearch, page, sortBy, sortDesc, filterPriority, filterGroupId, refreshTick])

  // ── Auto-refresh every 30s ────────────────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => setRefreshTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // ── URL sync ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const p = new URLSearchParams()
    if (tab)            p.set('tab',      tab)
    if (debouncedSearch) p.set('q',       debouncedSearch)
    if (page > 1)       p.set('page',     String(page))
    if (sortBy !== 'UpdatedAt') p.set('sort', sortBy)
    if (!sortDesc)      p.set('dir',      'asc')
    if (filterPriority) p.set('priority', filterPriority)
    if (filterGroupId)  p.set('group',    String(filterGroupId))
    const qs = p.toString()
    history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [tab, debouncedSearch, page, sortBy, sortDesc, filterPriority, filterGroupId])

  // ── Save column prefs ─────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(visibleOrder))
  }, [visibleOrder])

  // ── Col-picker click-outside ──────────────────────────────────────────────

  useEffect(() => {
    if (!showColPicker) return
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node))
        setShowColPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColPicker])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const setTab = (t: string) => { setTabRaw(t); setPage(1) }

  const toggleSort = (key: string) => {
    if (sortBy === key) { setSortDesc(d => !d); setPage(1) }
    else { setSortBy(key); setSortDesc(true); setPage(1) }
  }

  const toggleSelect = (id: number) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const bulkClose = async () => {
    await incidentApi.bulkClose([...selected])
    addToast(`Closed ${selected.size} incident${selected.size !== 1 ? 's' : ''}`)
    setSelected(new Set())
    setRefreshTick(t => t + 1)
  }

  const clearFilters = () => { setFilterPriority(''); setFilterGroupId(''); setPage(1) }
  const hasActiveFilters = !!(filterPriority || filterGroupId)

  const showCol = (key: ColKey) => setVisibleOrder(prev => [...prev, key])
  const hideCol = (key: ColKey) => setVisibleOrder(prev => prev.filter(k => k !== key))
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

  const visibleSet  = new Set(visibleOrder)
  const hiddenCols  = ALL_COLUMNS.filter(c => !visibleSet.has(c.key))
  const activeCols  = visibleOrder.map(k => COL_MAP[k]).filter(Boolean)
  const totalCols   = activeCols.length + 2

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-text-primary">Incidents</h1>
          <span className="text-xs bg-[#e7eefc] text-[#2563c9] px-2 py-0.5 rounded-full font-medium">Live</span>
          {!loading && <span className="text-sm text-text-muted">{total} total</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted hidden sm:block">
            {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={() => setRefreshTick(t => t + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover text-text-secondary"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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
                <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-border-default">
                  <span className="text-[17px] font-bold uppercase tracking-widest text-text-muted">Columns</span>
                  <button onClick={() => setVisibleOrder([...DEFAULT_VISIBLE])} className="text-[17px] text-accent hover:underline">Reset</button>
                </div>
                {visibleOrder.length > 0 && (
                  <>
                    <p className="px-3 pt-1 pb-1 text-[17px] font-semibold uppercase tracking-wider text-text-muted">Shown</p>
                    {visibleOrder.map((key, idx) => {
                      const col = COL_MAP[key]
                      if (!col) return null
                      return (
                        <div key={key} className="flex items-center gap-1 px-2 py-1 hover:bg-hover group">
                          <input type="checkbox" checked onChange={() => hideCol(key)} className="w-3.5 h-3.5 accent-accent shrink-0" />
                          <span className="flex-1 text-sm text-text-primary ml-1 truncate">{col.label}</span>
                          <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveCol(key, -1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-border-default disabled:opacity-30 text-text-muted hover:text-text-primary"><ChevronUp size={11} /></button>
                            <button onClick={() => moveCol(key, 1)} disabled={idx === visibleOrder.length - 1} className="p-0.5 rounded hover:bg-border-default disabled:opacity-30 text-text-muted hover:text-text-primary"><ChevronDown size={11} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
                {hiddenCols.length > 0 && (
                  <>
                    <p className="px-3 pt-3 pb-1 text-[17px] font-semibold uppercase tracking-wider text-text-muted border-t border-border-default mt-2">Hidden</p>
                    {hiddenCols.map(col => (
                      <div key={col.key} className="flex items-center gap-1 px-2 py-1 hover:bg-hover">
                        <input type="checkbox" checked={false} onChange={() => showCol(col.key)} className="w-3.5 h-3.5 accent-accent shrink-0" />
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
              tab === t.key ? 'border-accent text-accent-text font-medium' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + quick filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          type="text"
          placeholder="Search incidents..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 rounded-md border border-border-default bg-surface text-sm focus:outline-none focus:border-border-focus"
        />
        <select
          value={filterPriority}
          onChange={e => { setFilterPriority(e.target.value); setPage(1) }}
          className="px-2 py-2 rounded-md border border-border-default bg-surface text-sm focus:outline-none focus:border-border-focus text-text-secondary"
        >
          <option value="">All priorities</option>
          {priorities.map(p => (
            <option key={p.priorityId} value={p.code}>{p.priorityId} – {p.displayName}</option>
          ))}
        </select>
        <select
          value={filterGroupId}
          onChange={e => { setFilterGroupId(e.target.value ? parseInt(e.target.value, 10) : ''); setPage(1) }}
          className="px-2 py-2 rounded-md border border-border-default bg-surface text-sm focus:outline-none focus:border-border-focus text-text-secondary"
        >
          <option value="">All groups</option>
          {groups.map(g => (
            <option key={g.groupId} value={g.groupId}>{g.name}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-2 py-2 rounded-md border border-border-default hover:bg-hover text-text-muted text-sm flex items-center gap-1"
            title="Clear filters"
          >
            <X size={14} /> Clear
          </button>
        )}
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
              <th className="px-3 py-2 text-left font-medium text-text-tertiary text-xs w-32">Number</th>
              {activeCols.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left text-xs ${col.thClass} ${col.sortKey ? 'cursor-pointer select-none hover:text-text-primary text-text-tertiary' : 'font-medium text-text-tertiary'}`}
                  onClick={() => col.sortKey && toggleSort(col.sortKey)}
                >
                  <span className="flex items-center gap-1 font-medium">
                    {col.label}
                    {col.sortKey && (
                      sortBy === col.sortKey
                        ? sortDesc
                          ? <ArrowDown size={11} className="text-accent shrink-0" />
                          : <ArrowUp size={11} className="text-accent shrink-0" />
                        : <ArrowUpDown size={11} className="opacity-30 shrink-0" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={totalCols} className="px-3 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw size={20} className="animate-spin text-text-muted" />
                    <span className="text-text-muted text-sm">Loading incidents…</span>
                  </div>
                </td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="px-3 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox size={24} className="text-text-muted" />
                    <span className="text-text-muted text-sm">No incidents found</span>
                  </div>
                </td>
              </tr>
            ) : incidents.map(inc => (
              <tr
                key={inc.incidentId}
                className={`table-row border-b border-border-default last:border-0 hover:bg-hover cursor-pointer transition-colors ${selected.has(inc.incidentId) ? 'row-selected' : ''}`}
                onClick={() => openIncident(inc.incidentId)}
              >
                <td className="px-3" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" className="rounded" checked={selected.has(inc.incidentId)} onChange={() => toggleSelect(inc.incidentId)} />
                </td>
                <td className="px-3 whitespace-nowrap">
                  <span className="font-mono text-sm text-text-tertiary bg-subtle px-1.5 py-0.5 rounded">#{inc.number}</span>
                </td>
                {activeCols.map(col => (
                  <td key={col.key} className="px-3">{col.renderCell(inc)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      )}

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
