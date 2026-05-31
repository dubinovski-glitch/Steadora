import { ChevronRight, HelpCircle, Bell } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import type { View } from '../../types'

const VIEW_LABELS: Record<View, string> = {
  dashboard: 'Dashboard',
  incidents: 'Incidents',
  problems:  'Problem management',
  changes:   'Change management',
  knowledge: 'Knowledge base',
  sla:       'SLA & reporting',
  admin:     'Administration',
}

interface Props { unreadCount?: number; onMarkAllRead?: () => void }

export function Topbar({ unreadCount = 0, onMarkAllRead }: Props) {
  const { view, openIncidentId, closeIncident, setView } = useAppStore()
  const { user, workspaceName } = useAuthStore()

  // Build breadcrumb parts
  const parts = openIncidentId
    ? [
        { label: 'Incidents', onClick: closeIncident },
        { label: `INC-${openIncidentId}`, onClick: null },
      ]
    : [{ label: VIEW_LABELS[view] ?? view, onClick: null }]

  const initials = user?.avatarInitials ?? user?.displayName?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="topbar">
      {/* ── Left: breadcrumb + workspace chip ─────────────────────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        <nav className="flex items-center gap-1 text-sm">
          {parts.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-text-muted" />}
              <span
                className={p.onClick
                  ? 'text-text-secondary cursor-pointer hover:text-text-primary transition-colors'
                  : 'text-text-primary font-semibold'
                }
                onClick={p.onClick ?? undefined}
              >
                {p.label}
              </span>
            </span>
          ))}
        </nav>

        {/* Workspace pill — only when not on the default workspace */}
        {workspaceName && workspaceName !== 'Default Workspace' && (
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-border-default text-text-muted bg-subtle font-medium whitespace-nowrap">
            {workspaceName}
          </span>
        )}
      </div>

      {/* ── Right: actions + user ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {/* Help */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover text-text-muted hover:text-text-secondary transition-colors"
          title="Help"
        >
          <HelpCircle size={15} />
        </button>

        {/* Notifications */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover text-text-muted hover:text-text-secondary transition-colors relative"
          onClick={onMarkAllRead}
          title={unreadCount > 0 ? `${unreadCount} unread — click to mark all read` : 'Notifications'}
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center text-[10px] font-bold rounded-full bg-[#dc2626] text-white px-0.5 leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border-default mx-1" />

        {/* User identity */}
        <div className="flex items-center gap-2 pl-1 pr-0.5">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-text-primary leading-tight">{user?.displayName ?? ''}</div>
            <div className="text-[11px] text-text-muted leading-tight">{user?.roleDisplayName ?? ''}</div>
          </div>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ background: user?.avatarColor ?? 'var(--accent)' }}
            title={user?.displayName}
          >
            {initials}
          </div>
        </div>
      </div>
    </div>
  )
}
