import { useState } from 'react'
import { LayoutDashboard, AlertCircle, GitBranch, AlertTriangle, BookOpen, BarChart2, Search, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import type { View } from '../../types'

interface NavItem { label: string; icon: React.ReactNode; view: View; count?: number }
interface NavGroup { title: string; items: NavItem[] }

interface Props { counts: { incidents: number; problems: number; changes: number } }

const EXPANDED_W = 300
const COLLAPSED_W = 64

export function Sidebar({ counts }: Props) {
  const { view, setView } = useAppStore()
  const { user, logout } = useAuthStore()
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
        { label: 'Incidents',  icon: <AlertCircle size={16} />,   view: 'incidents', count: counts.incidents },
        { label: 'Problems',   icon: <AlertTriangle size={16} />,  view: 'problems',  count: counts.problems },
        { label: 'Changes',    icon: <GitBranch size={16} />,      view: 'changes',   count: counts.changes },
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
      style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W, transition: 'width 220ms ease' }}
    >
      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          right: -26,
          bottom: '25%',
          zIndex: 50,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--sb-bg)',
          border: '2px solid var(--sb-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--sb-text-muted)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--sb-accent)'
          e.currentTarget.style.borderColor = 'var(--sb-accent)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--sb-text-muted)'
          e.currentTarget.style.borderColor = 'var(--sb-border)'
        }}
      >
        {collapsed ? <ChevronRight size={26} /> : <ChevronLeft size={26} />}
      </button>

      {/* ── Brand ── */}
      <div className="h-14 flex items-center px-4 shrink-0" style={{ borderBottom: '1px solid var(--sb-border)' }}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">A</div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-semibold text-base leading-tight whitespace-nowrap" style={{ color: 'var(--sb-text)' }}>Aperture</div>
              <div className="text-xs whitespace-nowrap" style={{ color: 'var(--sb-text-muted)' }}>ITSM</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Search ── */}
      <div className={`${collapsed ? 'px-2' : 'px-3'} py-2`}>
        <button
          onClick={() => useAppStore.getState().setShowCommandPalette(true)}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2 px-3'} py-2 rounded-md text-sm transition-colors`}
          style={{ background: 'var(--sb-hover)', color: 'var(--sb-text-muted)' }}
          title={collapsed ? 'Search (⌘K)' : undefined}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--sb-active-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--sb-hover)')}
        >
          <Search size={14} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left whitespace-nowrap">Search</span>
              <span className="text-xs rounded px-1 py-0.5" style={{ border: '1px solid var(--sb-border)', color: 'var(--sb-text-muted)' }}>⌘K</span>
            </>
          )}
        </button>
      </div>

      {/* ── Nav ── */}
      <div className="flex-1 px-2 py-1 space-y-3 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={group.title}>
            {collapsed
              ? gi > 0 && <div className="h-px mx-1 mb-2" style={{ background: 'var(--sb-border)' }} />
              : <div className="text-[17px] font-semibold uppercase tracking-wider px-3 mb-1 whitespace-nowrap" style={{ color: 'var(--sb-text-label)' }}>
                  {group.title}
                </div>
            }
            {group.items.map(item => {
              const active = view === item.view
              return (
                <button
                  key={item.view}
                  onClick={() => setView(item.view)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2 rounded-md text-sm transition-colors`}
                  style={active
                    ? { background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)', fontWeight: 500 }
                    : { color: 'var(--sb-text-muted)' }
                  }
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--sb-hover)'; e.currentTarget.style.color = 'var(--sb-text)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sb-text-muted)' } }}
                >
                  <span style={{ color: active ? 'var(--sb-accent)' : 'var(--sb-text-muted)', flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full tabular"
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
                  {collapsed && item.count !== undefined && item.count > 0 && (
                    <span
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--sb-accent)' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className={`${collapsed ? 'p-2' : 'p-3'} shrink-0`} style={{ borderTop: '1px solid var(--sb-border)' }}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold">
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
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--sb-text)' }}>{user?.displayName ?? ''}</div>
              <div className="text-xs whitespace-nowrap" style={{ color: 'var(--sb-text-muted)' }}>{user?.roleDisplayName ?? ''}</div>
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
