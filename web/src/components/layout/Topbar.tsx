import { ChevronRight, HelpCircle, Bell, Settings } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import type { View } from '../../types'

const labels: Record<View, string[]> = {
  dashboard: ['Dashboard'],
  incidents: ['Incidents'],
  problems: ['Problem management'],
  changes: ['Change management'],
  knowledge: ['Knowledge base'],
  sla: ['SLA & reporting'],
  admin: ['Administration'],
}

interface Props { unreadCount?: number; onMarkAllRead?: () => void }

export function Topbar({ unreadCount = 0, onMarkAllRead }: Props) {
  const { view, openIncidentId, closeIncident, setView } = useAppStore()
  const parts = openIncidentId
    ? [{ label: 'Incidents', onClick: closeIncident }, { label: `INC-${openIncidentId}`, onClick: null }]
    : (labels[view] ?? [view]).map((l, i, arr) => ({ label: l, onClick: i < arr.length - 1 ? () => setView(view) : null }))

  return (
    <div className="topbar">
      <nav className="flex items-center gap-1 text-sm">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="text-text-muted" />}
            <span
              className={p.onClick ? 'text-text-secondary cursor-pointer hover:text-text-primary' : 'text-text-primary font-medium'}
              onClick={p.onClick ?? undefined}
            >
              {p.label}
            </span>
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-1">
        <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover text-text-secondary">
          <HelpCircle size={16} />
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover text-text-secondary relative"
          onClick={onMarkAllRead}
          title={unreadCount > 0 ? `${unreadCount} unread — click to mark all read` : 'Notifications'}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center text-[14px] font-bold rounded-full bg-[#dc2626] text-white px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover text-text-secondary">
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}
