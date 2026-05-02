import { LayoutDashboard, AlertCircle, GitBranch, AlertTriangle, BookOpen, BarChart2, Search, Settings } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import type { View } from '../../types'

interface NavItem { label: string; icon: React.ReactNode; view: View; count?: number }
interface NavGroup { title: string; items: NavItem[] }

interface Props { counts: { incidents: number; problems: number; changes: number } }

export function Sidebar({ counts }: Props) {
  const { view, setView } = useAppStore()

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
    {
      title: 'System',
      items: [
        { label: 'Administration', icon: <Settings size={16} />, view: 'admin' },
      ],
    },
  ]

  return (
    <nav className="sidebar">
      {/* Brand */}
      <div className="h-14 flex items-center px-5 border-b border-border-default shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">A</div>
          <div>
            <div className="font-semibold text-base text-text-primary leading-tight">Aperture</div>
            <div className="text-xs text-text-muted">ITSM</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <button
          onClick={() => useAppStore.getState().setShowCommandPalette(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-subtle text-text-muted text-sm hover:bg-hover transition-colors"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search</span>
          <span className="text-xs border border-border-default rounded px-1 py-0.5">⌘K</span>
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 px-2 py-1 space-y-3 overflow-y-auto">
        {groups.map(group => (
          <div key={group.title}>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-3 mb-1">{group.title}</div>
            {group.items.map(item => {
              const active = view === item.view
              return (
                <button
                  key={item.view}
                  onClick={() => setView(item.view)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? 'bg-accent-subtle text-accent-text font-medium'
                      : 'text-text-secondary hover:bg-hover hover:text-text-primary'
                  }`}
                >
                  <span className={active ? 'text-accent' : ''}>{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full tabular ${active ? 'bg-accent text-white' : 'bg-subtle text-text-tertiary'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border-default shrink-0">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold">AC</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">Alex Carter</div>
            <div className="text-xs text-text-muted">Agent</div>
          </div>
        </div>
      </div>
    </nav>
  )
}
