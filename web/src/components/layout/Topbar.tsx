import { useState, useEffect, useRef } from 'react'
import { ChevronRight, HelpCircle, Bell } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { ADMIN_SECTION_LABELS } from '../../features/admin/sections'
import { modKey, modEnter } from '../../utils/platform'
import type { View } from '../../types'

const VIEW_LABELS: Record<View, string> = {
  dashboard: 'Dashboard',
  incidents: 'Incidents',
  problems:  'Problem management',
  changes:   'Change management',
  sla:       'SLA & reporting',
  admin:     'Administration',
  tasks:     'Tasks',
}

const TASK_TYPE_LABEL: Record<string, string> = {
  incident: 'Incident', problem: 'Problem', change: 'Change', general: 'General',
}

interface Props { unreadCount?: number; onMarkAllRead?: () => void }

// Keyboard shortcuts listed in the Help popover. Mirrors useKeyboard.ts and the
// per-view save/submit handlers; modifier labels adapt to the user's platform.
const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: [`${modKey}K`, '/'],  label: 'Search / command palette' },
  { keys: ['C'],                label: 'New incident' },
  { keys: ['G', 'then', 'D'],   label: 'Go to Dashboard' },
  { keys: ['G', 'then', 'I'],   label: 'Go to Incidents' },
  { keys: ['G', 'then', 'P'],   label: 'Go to Problems' },
  { keys: ['G', 'then', 'C'],   label: 'Go to Changes' },
  { keys: [`${modKey}S`],       label: 'Save changes (detail views)' },
  { keys: [modEnter],           label: 'Add note / submit' },
  { keys: ['Esc'],              label: 'Close open record' },
]

// Small anchored popover listing keyboard shortcuts (presentational; the parent
// owns open/close state and outside-click handling).
function HelpPopover() {
  return (
    <div className="modal-enter absolute right-0 top-10 w-72 bg-surface border border-border-default rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border-default bg-subtle">
        <span className="text-xs font-semibold text-text-primary">Keyboard shortcuts</span>
      </div>
      <div className="py-1.5">
        {SHORTCUTS.map(s => (
          <div key={s.label} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className="text-xs text-text-secondary">{s.label}</span>
            <span className="flex items-center gap-1 shrink-0">
              {s.keys.map((k, i) =>
                k === 'then' ? (
                  <span key={i} className="text-[10px] text-text-muted">then</span>
                ) : (
                  <kbd
                    key={i}
                    className="text-[11px] px-1.5 py-0.5 rounded border border-border-strong bg-subtle text-text-secondary font-medium"
                    style={{ fontFamily: 'inherit' }}
                  >
                    {k}
                  </kbd>
                )
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Top application bar. Renders a context-aware breadcrumb (derived from the current
// view / open incident / admin section / task mode), an optional workspace pill, and
// the right-hand actions: help, a notifications bell (with unread badge) and user identity.
export function Topbar({ unreadCount = 0, onMarkAllRead }: Props) {
  const { view, openIncidentId, closeIncident, adminSection, adminAtHome, goAdminHome, taskType, taskMode } = useAppStore()
  const { user, workspaceName } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)

  // Close the help popover on outside click or Escape while it is open.
  useEffect(() => {
    if (!showHelp) return
    const onDown = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setShowHelp(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowHelp(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showHelp])

  // Build breadcrumb parts by priority: an open incident wins, then a drilled-in admin
  // section, then the tasks view (with optional "New task" leaf), else the plain view label.
  // Parts with an onClick are clickable (navigate up); the last part is the current page.
  const parts = openIncidentId
    ? [
        { label: 'Incidents', onClick: closeIncident },
        { label: `INC-${openIncidentId}`, onClick: null },
      ]
    : view === 'admin' && !adminAtHome
      ? [
          { label: 'Administration', onClick: goAdminHome },
          { label: ADMIN_SECTION_LABELS[adminSection], onClick: null },
        ]
      : view === 'tasks'
        ? [
            { label: `${TASK_TYPE_LABEL[taskType]} Tasks`, onClick: null },
            ...(taskMode === 'new' ? [{ label: 'New task', onClick: null }] : []),
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
        {/* Help — toggles the keyboard shortcuts popover */}
        <div className="relative" ref={helpRef}>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${showHelp ? 'bg-active text-text-primary' : 'hover:bg-hover text-text-muted hover:text-text-secondary'}`}
            title="Keyboard shortcuts"
            onClick={() => setShowHelp(s => !s)}
          >
            <HelpCircle size={15} />
          </button>
          {showHelp && <HelpPopover />}
        </div>

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
