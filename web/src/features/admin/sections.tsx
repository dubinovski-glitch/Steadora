import {
  Layers, Users, UsersRound, Shield, Folder, Server,
  Clock, CalendarDays, GitBranch, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AdminSection } from '../../types'

// Shared metadata for the Administration area. Used by both the admin home hub /
// section rail (AdminView) and the topbar breadcrumb (Topbar) so labels and icons
// stay in one place. No per-group accent colours — the app's single blue accent
// is used for the active state everywhere.

export interface SectionMeta {
  id: AdminSection
  label: string
  Icon: LucideIcon
  description: string
}

export interface AdminGroup {
  title: string
  items: SectionMeta[]
}

// Source-of-truth list of admin sections, grouped into rail headings (General, People,
// Service taxonomy, Policies). Each item carries its route id, label, icon, and description.
export const ADMIN_GROUPS: AdminGroup[] = [
  {
    title: 'General',
    items: [
      { id: 'workspaces', label: 'Workspaces', Icon: Layers, description: 'Define field visibility and mandatory rules per workspace' },
    ],
  },
  {
    title: 'People',
    items: [
      { id: 'users', label: 'Users', Icon: Users, description: 'Manage user accounts, roles, and service access' },
      { id: 'teams', label: 'Teams & groups', Icon: UsersRound, description: 'Organise staff into teams and assignment groups' },
      { id: 'roles', label: 'Roles & permissions', Icon: Shield, description: 'Define roles and their system-wide permission levels' },
    ],
  },
  {
    title: 'Service taxonomy',
    items: [
      { id: 'categories', label: 'Categories', Icon: Folder, description: 'Manage incident and request classification categories' },
      { id: 'services', label: 'Services & CIs', Icon: Server, description: 'Configure IT services and configuration items' },
    ],
  },
  {
    title: 'Policies',
    items: [
      { id: 'sla-policies', label: 'SLA policies', Icon: Clock, description: 'Define SLA tiers, response targets, and breach rules' },
      { id: 'business-hours', label: 'Business hours', Icon: CalendarDays, description: 'Configure working hours, holidays, and time zones' },
      { id: 'workflow', label: 'Workflow & states', Icon: GitBranch, description: 'Configure lifecycle states for incidents, changes, and problems' },
      { id: 'automations', label: 'Automations', Icon: Zap, description: 'Build rules that automatically trigger actions on events' },
    ],
  },
]

// Flattened lookup from section id to its full metadata (for header/breadcrumb rendering).
export const ADMIN_SECTIONS = Object.fromEntries(
  ADMIN_GROUPS.flatMap(g => g.items.map(i => [i.id, i])),
) as Record<AdminSection, SectionMeta>

// Flattened lookup from section id to just its label.
export const ADMIN_SECTION_LABELS = Object.fromEntries(
  ADMIN_GROUPS.flatMap(g => g.items.map(i => [i.id, i.label])),
) as Record<AdminSection, string>
