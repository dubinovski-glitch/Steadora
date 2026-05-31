import { useState } from 'react'
import {
  LayoutDashboard, AlertCircle, GitBranch, AlertTriangle,
  BookOpen, BarChart2, Search, Settings, LogOut,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import type { View } from '../../types'

interface NavItem { label: string; icon: React.ReactNode; view: View; count?: number }
interface NavGroup { title: string; items: NavItem[] }

interface Props { counts: { incidents: number; problems: number; changes: number } }

const EXPANDED_W = 220
const COLLAPSED_W = 56

export function Sidebar({ counts }: Props) {
  const { view, setView } = useAppStore()
  const { user, logout, workspaceName } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  const isAdmin = user?.roleCode === 'admin'

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
        { label: 'Incidents',  icon: <AlertCircle size={16} />,  view: 'incidents', count: counts.incidents },
        { label: 'Problems',   icon: <AlertTriangle size={16} />, view: 'problems',  count: counts.problems },
        { label: 'Changes',    icon: <GitBranch size={16} />,    view: 'changes',   count: counts.changes },
      ],
    },
    {
      title: 'Knowledge',
      items: [
        { label: 'Knowledge base', icon: <BookOpen size={16} />, view: 'knowledge' },
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
          title={collapsed ? 'Search (⌘K)' : undefined}
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
                ⌘K
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

            {/* Items */}
            {group.items.map(item => {
              const active = view === item.view
              return (
                <button
                  key={item.view}
                  onClick={() => setView(item.view)}
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
