import { useState } from 'react'
import {
  Users, UsersRound, Folder, Shield, Server, Clock,
  GitBranch, Zap, Layers,
} from 'lucide-react'
import { UsersTab }         from './UsersTab'
import { TeamsTab }         from './TeamsTab'
import { CategoriesTab }    from './CategoriesTab'
import { RolesTab }         from './RolesTab'
import { ServicesTab }      from './ServicesTab'
import { SlaPoliciesTab }   from './SlaPoliciesTab'
import { BusinessHoursTab } from './BusinessHoursTab'
import { WorkflowTab }      from './WorkflowTab'
import { AutomationsTab }   from './AutomationsTab'
import { WorkspacesTab }    from './WorkspacesTab'
import type { AdminSection } from '../../types'

interface Props { addToast: (msg: string) => void }

// ── Section metadata ──────────────────────────────────────────────────────────
interface SectionMeta {
  id: AdminSection
  label: string
  icon: React.ReactNode
  description: string
}

// ── Nav groups (only implemented sections) ────────────────────────────────────
interface NavGroup {
  title: string
  color: string   // left-border accent color
  items: SectionMeta[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'General',
    color: '#6366f1',
    items: [
      {
        id: 'workspaces',
        label: 'Workspaces',
        icon: <Layers size={15} />,
        description: 'Define field visibility and mandatory rules per workspace',
      },
    ],
  },
  {
    title: 'People',
    color: '#8b5cf6',
    items: [
      {
        id: 'users',
        label: 'Users',
        icon: <Users size={15} />,
        description: 'Manage user accounts, roles, and service access',
      },
      {
        id: 'teams',
        label: 'Teams & groups',
        icon: <UsersRound size={15} />,
        description: 'Organise staff into teams and assignment groups',
      },
      {
        id: 'roles',
        label: 'Roles & permissions',
        icon: <Shield size={15} />,
        description: 'Define roles and their system-wide permission levels',
      },
    ],
  },
  {
    title: 'Service taxonomy',
    color: '#10b981',
    items: [
      {
        id: 'categories',
        label: 'Categories',
        icon: <Folder size={15} />,
        description: 'Manage incident and request classification categories',
      },
      {
        id: 'services',
        label: 'Services & CIs',
        icon: <Server size={15} />,
        description: 'Configure IT services and configuration items',
      },
    ],
  },
  {
    title: 'Policies',
    color: '#f59e0b',
    items: [
      {
        id: 'sla-policies',
        label: 'SLA policies',
        icon: <Clock size={15} />,
        description: 'Define SLA tiers, response targets, and breach rules',
      },
      {
        id: 'business-hours',
        label: 'Business hours',
        icon: <Clock size={15} />,
        description: 'Configure working hours, holidays, and time zones',
      },
      {
        id: 'workflow',
        label: 'Workflow & states',
        icon: <GitBranch size={15} />,
        description: 'Configure lifecycle states for incidents, changes, and problems',
      },
      {
        id: 'automations',
        label: 'Automations',
        icon: <Zap size={15} />,
        description: 'Build rules that automatically trigger actions on events',
      },
    ],
  },
]

// Flat lookup: sectionId → meta
const ALL_SECTIONS: Record<string, SectionMeta & { groupColor: string }> = {}
for (const group of NAV_GROUPS)
  for (const item of group.items)
    ALL_SECTIONS[item.id] = { ...item, groupColor: group.color }

export function AdminView({ addToast }: Props) {
  const [section, setSection] = useState<AdminSection>('users')

  const meta = ALL_SECTIONS[section]

  return (
    <div className="flex h-full -mx-6 -mt-4 overflow-hidden">

      {/* ── Left nav ─────────────────────────────────────────────────────────── */}
      <nav className="w-56 shrink-0 bg-subtle border-r border-border-default flex flex-col overflow-y-auto py-4">

        {/* App-area label */}
        <div className="px-4 mb-4">
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Administration</span>
        </div>

        {NAV_GROUPS.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? 'mt-3 pt-3 border-t border-border-default' : ''}>

            {/* Group heading with colored left bar */}
            <div className="flex items-center gap-2 px-4 mb-1">
              <div className="w-1.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">
                {group.title}
              </span>
            </div>

            {/* Items */}
            {group.items.map(item => {
              const active = item.id === section
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`relative w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left ${
                    active
                      ? 'text-text-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-hover'
                  }`}
                >
                  {/* Active left indicator */}
                  {active && (
                    <div
                      className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  {/* Active background tint */}
                  {active && (
                    <div
                      className="absolute inset-0 rounded-r opacity-8"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <span
                    className="relative shrink-0"
                    style={{ color: active ? group.color : undefined }}
                  >
                    {item.icon}
                  </span>
                  <span className="relative">{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Right: header + content ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Sticky section header */}
        {meta && (
          <div className="shrink-0 bg-surface border-b border-border-default px-8 py-4 flex items-center gap-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white"
              style={{ backgroundColor: meta.groupColor }}
            >
              {meta.icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-text-primary leading-tight">{meta.label}</h2>
              <p className="text-xs text-text-muted mt-0.5 leading-snug">{meta.description}</p>
            </div>
          </div>
        )}

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
          {section === 'workspaces'       && <WorkspacesTab    addToast={addToast} />}
          {section === 'users'            && <UsersTab         addToast={addToast} />}
          {section === 'teams'            && <TeamsTab         addToast={addToast} />}
          {section === 'categories'       && <CategoriesTab    addToast={addToast} />}
          {section === 'roles'            && <RolesTab         addToast={addToast} />}
          {section === 'services'         && <ServicesTab      addToast={addToast} />}
          {section === 'sla-policies'     && <SlaPoliciesTab   addToast={addToast} />}
          {section === 'business-hours'   && <BusinessHoursTab addToast={addToast} />}
          {section === 'workflow'         && <WorkflowTab      addToast={addToast} />}
          {section === 'automations'      && <AutomationsTab   addToast={addToast} />}
        </div>
      </div>
    </div>
  )
}
