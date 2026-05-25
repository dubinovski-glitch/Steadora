import { useState } from 'react'
import { Users, UsersRound, Folder, Settings, Palette, Shield, Server, Clock, GitBranch, Zap, Link, FileText, LayoutGrid } from 'lucide-react'
import { UsersTab } from './UsersTab'
import { TeamsTab } from './TeamsTab'
import { CategoriesTab } from './CategoriesTab'
import { RolesTab } from './RolesTab'
import { ServicesTab } from './ServicesTab'
import { PriorityMatrixTab } from './PriorityMatrixTab'
import { SlaPoliciesTab } from './SlaPoliciesTab'
import { BusinessHoursTab } from './BusinessHoursTab'
import { WorkflowTab } from './WorkflowTab'
import { AutomationsTab } from './AutomationsTab'
import type { AdminSection } from '../../types'

interface Props { addToast: (msg: string) => void }

interface NavItem {
  id: AdminSection | string
  label: string
  icon: React.ReactNode
  implemented: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'General',
    items: [
      { id: 'general-settings', label: 'General settings', icon: <Settings size={14} />, implemented: false },
      { id: 'branding',         label: 'Branding & appearance', icon: <Palette size={14} />, implemented: false },
    ],
  },
  {
    title: 'People',
    items: [
      { id: 'users',  label: 'Users',               icon: <Users size={14} />,      implemented: true },
      { id: 'teams',  label: 'Teams & groups',      icon: <UsersRound size={14} />, implemented: true },
      { id: 'roles',  label: 'Roles & permissions', icon: <Shield size={14} />,     implemented: true },
    ],
  },
  {
    title: 'Service taxonomy',
    items: [
      { id: 'categories',      label: 'Categories',       icon: <Folder size={14} />,      implemented: true },
      { id: 'services',        label: 'Services & CIs',   icon: <Server size={14} />,      implemented: true },
      { id: 'priority-matrix', label: 'Priority matrix',  icon: <LayoutGrid size={14} />,  implemented: true },
    ],
  },
  {
    title: 'Policies',
    items: [
      { id: 'sla-policies',   label: 'SLA policies',     icon: <Clock size={14} />,     implemented: true },
      { id: 'business-hours', label: 'Business hours',   icon: <Clock size={14} />,     implemented: true },
      { id: 'workflow',       label: 'Workflow & states', icon: <GitBranch size={14} />, implemented: true },
      { id: 'automations',    label: 'Automations',       icon: <Zap size={14} />,       implemented: true },
    ],
  },
  {
    title: 'Integration',
    items: [
      { id: 'integrations', label: 'Integrations', icon: <Link size={14} />,     implemented: false },
      { id: 'audit-log',    label: 'Audit log',    icon: <FileText size={14} />, implemented: false },
    ],
  },
]

export function AdminView({ addToast }: Props) {
  const [section, setSection] = useState<AdminSection>('users')

  return (
    <div className="flex flex-col gap-1 h-full">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-xl font-semibold text-text-primary">Administration</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#fde8e8] text-[#c8252b] font-medium">Admin only</span>
      </div>
      <p className="text-sm text-text-muted mb-4">Configure your ITSM environment, manage users and policies, and connect external systems.</p>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Sub-nav */}
        <nav className="w-48 shrink-0 flex flex-col gap-4">
          {NAV_GROUPS.map(group => (
            <div key={group.title}>
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-2 mb-1">{group.title}</div>
              {group.items.map(item => {
                const active = item.id === section
                return item.implemented ? (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id as AdminSection)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left ${
                      active ? 'bg-accent-subtle text-accent-text font-medium' : 'text-text-secondary hover:bg-hover hover:text-text-primary'
                    }`}
                  >
                    <span className={active ? 'text-accent' : 'text-text-muted'}>{item.icon}</span>
                    {item.label}
                  </button>
                ) : (
                  <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-muted cursor-not-allowed opacity-50">
                    {item.icon}
                    {item.label}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {section === 'users'          && <UsersTab addToast={addToast} />}
          {section === 'teams'          && <TeamsTab addToast={addToast} />}
          {section === 'categories'     && <CategoriesTab addToast={addToast} />}
          {section === 'roles'          && <RolesTab addToast={addToast} />}
          {section === 'services'       && <ServicesTab addToast={addToast} />}
          {section === 'priority-matrix' && <PriorityMatrixTab addToast={addToast} />}
          {section === 'sla-policies'   && <SlaPoliciesTab addToast={addToast} />}
          {section === 'business-hours' && <BusinessHoursTab addToast={addToast} />}
          {section === 'workflow'       && <WorkflowTab addToast={addToast} />}
          {section === 'automations'    && <AutomationsTab addToast={addToast} />}
        </div>
      </div>
    </div>
  )
}
