import { useState } from 'react'
import {
  LayoutDashboard, AlertCircle, GitBranch, AlertTriangle,
  BarChart2, Search, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, ChevronDown, Plus, User, Users,
  ListTodo, ClipboardList,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { modKey } from '../../utils/platform'
import type { View, TaskType } from '../../types'

interface NavLeaf { label: string; icon: React.ReactNode; onClick: () => void; active?: boolean }
interface NavSubGroup { key: string; label: string; icon: React.ReactNode; active?: boolean; children: NavLeaf[] }
type NavChild = NavLeaf | NavSubGroup
interface NavItem { label: string; icon: React.ReactNode; view: View; key?: string; count?: number; children?: NavChild[]; onSelect?: () => void; active?: boolean }
interface NavGroup { title: string; items: NavItem[] }

interface Props { counts: { incidents: number; problems: number; changes: number } }

const EXPANDED_W = 220
const COLLAPSED_W = 56

// Left navigation rail. Renders the brand header, a search shortcut, the grouped
// nav tree (Overview / ITIL / Operations / System), and the user footer.
// Drives view switching via the app store and reflects the active view/scope/task mode
// as highlighted nav nodes. Collapsible to an icon-only rail.
export function Sidebar({ counts }: Props) {
  const {
    view, setView, goToIncidents, newIncident, incidentsScope, showNewIncident,
    goToProblems, newProblem, problemsScope, showNewProblem,
    openTasks, taskType, taskMode,
  } = useAppStore()
  const { user, logout, workspaceName } = useAuthStore()

  const onIncidents = view === 'incidents'
  const onProblems = view === 'problems'
  const onTasks = view === 'tasks'
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['incidents']))

  const isAdmin = user?.roleCode === 'admin'

  // Toggle a collapsible nav node open/closed by its key (tracked in the `expanded` set)
  const toggleExpand = (key: string) =>
    setExpanded(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  // Type guard: a NavChild is a sub-group if it has its own `children`
  const isGroup = (c: NavChild): c is NavSubGroup => 'children' in c
  // A child is "active" if it (or, for a sub-group, any of its leaves) is the current selection
  const childActive = (c: NavChild): boolean => isGroup(c) ? (!!c.active || c.children.some(l => !!l.active)) : !!c.active

  // Task sub-nav shared by Incident/Problem/Change/General Tasks
  const taskLeaves = (type: TaskType): NavLeaf[] => [
    { label: 'Create New',           icon: <Plus size={13} />,  onClick: () => openTasks(type, 'new'),     active: onTasks && taskType === type && taskMode === 'new' },
    { label: 'Assigned to me',       icon: <User size={13} />,  onClick: () => openTasks(type, 'mine'),    active: onTasks && taskType === type && taskMode === 'mine' },
    { label: 'Assigned to my Group', icon: <Users size={13} />, onClick: () => openTasks(type, 'mygroup'), active: onTasks && taskType === type && taskMode === 'mygroup' },
  ]
  // Wrap the task leaves in a collapsible sub-group (e.g. "Incident Tasks") for a given task type
  const tasksSubGroup = (type: TaskType, key: string, label: string): NavSubGroup =>
    ({ key, label, icon: <ListTodo size={14} />, active: onTasks && taskType === type, children: taskLeaves(type) })

  // A single sub-nav leaf button (used directly and inside Tasks sub-groups)
  const renderLeaf = (leaf: NavLeaf) => (
    <button
      key={leaf.label}
      onClick={leaf.onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors"
      style={leaf.active
        ? { background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)', fontWeight: 500 }
        : { color: 'var(--sb-text-muted)' }}
      onMouseEnter={e => { if (!leaf.active) { e.currentTarget.style.background = 'var(--sb-hover)'; e.currentTarget.style.color = 'var(--sb-text)' } }}
      onMouseLeave={e => { if (!leaf.active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sb-text-muted)' } }}
    >
      <span className="shrink-0" style={{ color: leaf.active ? 'var(--sb-accent)' : undefined }}>{leaf.icon}</span>
      <span className="flex-1 text-left whitespace-nowrap">{leaf.label}</span>
    </button>
  )

  // Declarative nav tree consumed by the render below. Admin-only "System" group is
  // conditionally appended. Active flags and onSelect/onClick wire each node to the app store.
  const groups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', icon: <LayoutDashboard size={16} />, view: 'dashboard' },
      ],
    },
    {
      title: 'ITIL',
      items: [
        {
          label: 'Incidents', icon: <AlertCircle size={16} />, view: 'incidents', count: counts.incidents,
          // Parent highlights for the general incidents list (no sub-node selected)
          onSelect: () => goToIncidents('all'),
          active: onIncidents && incidentsScope === 'all' && !showNewIncident,
          children: [
            { label: 'Create New',           icon: <Plus size={14} />,  onClick: () => newIncident(),         active: onIncidents && showNewIncident },
            { label: 'Assigned to me',       icon: <User size={14} />,  onClick: () => goToIncidents('mine'), active: onIncidents && !showNewIncident && incidentsScope === 'mine' },
            { label: 'Assigned to my Group', icon: <Users size={14} />, onClick: () => goToIncidents('mygroup'), active: onIncidents && !showNewIncident && incidentsScope === 'mygroup' },
            tasksSubGroup('incident', 'incident-tasks', 'Incident Tasks'),
          ],
        },
        {
          label: 'Problems', icon: <AlertTriangle size={16} />, view: 'problems', count: counts.problems,
          // Parent highlights for the general problems list (no sub-node selected)
          onSelect: () => goToProblems('all'),
          active: onProblems && problemsScope === 'all' && !showNewProblem,
          children: [
            { label: 'Create New',           icon: <Plus size={14} />,  onClick: () => newProblem(),          active: onProblems && showNewProblem },
            { label: 'Assigned to me',       icon: <User size={14} />,  onClick: () => goToProblems('mine'),  active: onProblems && !showNewProblem && problemsScope === 'mine' },
            { label: 'Assigned to my Group', icon: <Users size={14} />, onClick: () => goToProblems('mygroup'), active: onProblems && !showNewProblem && problemsScope === 'mygroup' },
            tasksSubGroup('problem', 'problem-tasks', 'Problem Tasks'),
          ],
        },
        {
          label: 'Changes', icon: <GitBranch size={16} />, view: 'changes', count: counts.changes,
          children: [ tasksSubGroup('change', 'change-tasks', 'Change Tasks') ],
        },
        {
          label: 'General Tasks', icon: <ClipboardList size={16} />, view: 'tasks', key: 'general-tasks',
          onSelect: () => openTasks('general', 'mine'),
          active: false,   // a leaf carries the active state
          children: taskLeaves('general'),
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'SLA & reporting', icon: <BarChart2 size={16} />, view: 'sla' },
      ],
    },
    ...(isAdmin ? [{
      title: 'System',
      items: [
        { label: 'Administration', icon: <Settings size={16} />, view: 'admin' as View },
      ],
    }] : []),
  ]

  const initials = user?.avatarInitials ?? user?.displayName?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <nav
      className="sidebar"
      style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W, transition: 'width 200ms ease' }}
    >
      {/* ── Brand + collapse button ─────────────────────────────────────────── */}
      <div
        className="h-14 flex items-center shrink-0 gap-2 px-3"
        style={{ borderBottom: '1px solid var(--sb-border)' }}
      >
        {/* Logo mark */}
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
          A
        </div>

        {/* App + workspace name */}
        {!collapsed && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="font-semibold text-sm leading-tight whitespace-nowrap" style={{ color: 'var(--sb-text)' }}>
              Aperture ITSM
            </div>
            {workspaceName && (
              <div
                className="text-[11px] whitespace-nowrap truncate mt-0.5"
                style={{ color: 'var(--sb-text-muted)' }}
                title={workspaceName}
              >
                {workspaceName}
              </div>
            )}
          </div>
        )}

        {/* Inline collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors shrink-0"
          style={{ color: 'var(--sb-text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--sb-text)'; e.currentTarget.style.background = 'var(--sb-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--sb-text-muted)'; e.currentTarget.style.background = '' }}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* ── Search shortcut ─────────────────────────────────────────────────── */}
      <div className={`${collapsed ? 'px-2' : 'px-3'} pt-3 pb-1`}>
        <button
          onClick={() => useAppStore.getState().setShowCommandPalette(true)}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2 px-2.5'} py-1.5 rounded-md text-sm transition-colors`}
          style={{ background: 'var(--sb-hover)', color: 'var(--sb-text-muted)' }}
          title={collapsed ? `Search (${modKey}K)` : undefined}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--sb-active-bg)'; e.currentTarget.style.color = 'var(--sb-text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--sb-hover)'; e.currentTarget.style.color = 'var(--sb-text-muted)' }}
        >
          <Search size={14} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left whitespace-nowrap">Search</span>
              <kbd
                className="text-[11px] px-1 py-0.5 rounded"
                style={{ border: '1px solid var(--sb-border)', color: 'var(--sb-text-muted)', fontFamily: 'inherit' }}
              >
                {modKey}K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* ── Nav groups ──────────────────────────────────────────────────────── */}
      <div className="flex-1 px-2 py-2 overflow-y-auto flex flex-col gap-1">
        {groups.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? 'mt-2' : ''}>
            {/* Group label / divider */}
            {collapsed ? (
              gi > 0 && <div className="h-px mx-2 mb-1" style={{ background: 'var(--sb-border)' }} />
            ) : (
              <div
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 mb-0.5"
                style={{ color: 'var(--sb-text-label)' }}
              >
                {group.title}
              </div>
            )}

            {/* Items — each top-level nav node, with optional collapsible children */}
            {group.items.map(item => {
              const itemKey = item.key ?? item.view
              // Active either via an explicit flag or by matching the current view
              const active = item.active ?? (view === item.view)
              const hasChildren = !collapsed && !!item.children?.length
              const hasActiveChild = !!item.children?.some(childActive)
              // Auto-expand a node whose child is currently active
              const isOpen = expanded.has(itemKey) || hasActiveChild
              return (
                <div key={itemKey}>
                  <button
                    // Click runs the node's onSelect (or switches view); also expands children on first open
                    onClick={() => { item.onSelect ? item.onSelect() : setView(item.view); if (hasChildren && !isOpen) toggleExpand(itemKey) }}
                    title={collapsed ? item.label : undefined}
                    className={`relative w-full flex items-center ${collapsed ? 'justify-center py-2.5' : 'gap-2.5 px-2.5 py-2'} rounded-md text-sm transition-colors`}
                    style={active
                      ? { background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)', fontWeight: 500 }
                      : { color: 'var(--sb-text-muted)' }
                    }
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--sb-hover)'; e.currentTarget.style.color = 'var(--sb-text)' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sb-text-muted)' } }}
                  >
                    <span style={{ color: active ? 'var(--sb-accent)' : undefined, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                        {item.count !== undefined && item.count > 0 && (
                          <span
                            className="text-[11px] px-1.5 py-0.5 rounded-full tabular font-medium"
                            style={active
                              ? { background: 'var(--sb-accent)', color: '#fff' }
                              : { background: 'var(--sb-badge-bg)', color: 'var(--sb-badge-text)' }
                            }
                          >
                            {item.count}
                          </span>
                        )}
                        {hasChildren && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={e => { e.stopPropagation(); toggleExpand(itemKey) }}
                            className="shrink-0 flex items-center justify-center w-4 h-4 rounded transition-transform"
                            style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                            title={isOpen ? 'Collapse' : 'Expand'}
                          >
                            <ChevronDown size={13} />
                          </span>
                        )}
                      </>
                    )}
                    {/* Dot indicator when collapsed + count > 0 */}
                    {collapsed && item.count !== undefined && item.count > 0 && (
                      <span
                        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                        style={{ background: 'var(--sb-accent)' }}
                      />
                    )}
                  </button>

                  {/* Sub-nodes (leaves and collapsible Tasks sub-groups) */}
                  {hasChildren && isOpen && (
                    <div className="mt-0.5 flex flex-col gap-0.5" style={{ marginLeft: 18, paddingLeft: 10, borderLeft: '1px solid var(--sb-border)' }}>
                      {item.children!.map(child => {
                        if (!isGroup(child)) return renderLeaf(child)
                        const subOpen = expanded.has(child.key) || child.children.some(l => !!l.active) || !!child.active
                        return (
                          <div key={child.key}>
                            <button
                              onClick={() => toggleExpand(child.key)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors"
                              style={child.active
                                ? { color: 'var(--sb-accent)', fontWeight: 500 }
                                : { color: 'var(--sb-text-muted)' }}
                              onMouseEnter={e => { if (!child.active) { e.currentTarget.style.background = 'var(--sb-hover)'; e.currentTarget.style.color = 'var(--sb-text)' } }}
                              onMouseLeave={e => { if (!child.active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sb-text-muted)' } }}
                            >
                              <span className="shrink-0" style={{ color: child.active ? 'var(--sb-accent)' : undefined }}>{child.icon}</span>
                              <span className="flex-1 text-left whitespace-nowrap">{child.label}</span>
                              <span className="shrink-0 flex items-center justify-center w-4 h-4 transition-transform" style={{ transform: subOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                <ChevronDown size={12} />
                              </span>
                            </button>
                            {subOpen && (
                              <div className="mt-0.5 flex flex-col gap-0.5" style={{ marginLeft: 13, paddingLeft: 10, borderLeft: '1px solid var(--sb-border)' }}>
                                {child.children.map(renderLeaf)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── User footer ─────────────────────────────────────────────────────── */}
      <div
        className={`shrink-0 ${collapsed ? 'p-2' : 'px-3 py-2.5'}`}
        style={{ borderTop: '1px solid var(--sb-border)' }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: user?.avatarColor ?? 'var(--sb-accent)' }}
              title={user?.displayName}
            >
              {initials}
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--sb-text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--sb-hover)'; e.currentTarget.style.color = 'var(--sb-text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sb-text-muted)' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ background: user?.avatarColor ?? 'var(--sb-accent)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate leading-tight" style={{ color: 'var(--sb-text)' }}>
                {user?.displayName ?? ''}
              </div>
              <div className="text-[11px] truncate leading-tight mt-0.5" style={{ color: 'var(--sb-text-muted)' }}>
                {user?.roleDisplayName ?? ''}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors shrink-0"
              style={{ color: 'var(--sb-text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--sb-hover)'; e.currentTarget.style.color = 'var(--sb-text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sb-text-muted)' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
