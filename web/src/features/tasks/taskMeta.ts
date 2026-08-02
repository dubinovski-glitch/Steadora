// Shared lookup tables and small formatters for tasks (labels, per-type categories,
// statuses, and badge-variant mapping) reused across the tasks list/create/detail views.
import type { TaskType } from '../../types'

// Human label for each task type
export const TYPE_LABEL: Record<TaskType, string> = {
  incident: 'Incident', problem: 'Problem', change: 'Change', general: 'General',
}

// Per-type category (ServiceNow-style). General tasks have none.
export const SUBTYPES: Record<string, { value: string; label: string }[]> = {
  incident: [{ value: 'investigation', label: 'Investigation' }, { value: 'communication', label: 'Communication' }, { value: 'remediation', label: 'Remediation' }],
  problem:  [{ value: 'analysis', label: 'Analysis' }, { value: 'root_cause', label: 'Root cause' }, { value: 'fix', label: 'Fix' }, { value: 'workaround', label: 'Workaround' }],
  change:   [{ value: 'planning', label: 'Planning' }, { value: 'implementation', label: 'Implementation' }, { value: 'testing', label: 'Testing' }, { value: 'review', label: 'Review' }],
  general:  [],
}
export const SUBTYPE_LABEL: Record<string, string> = {
  incident: 'Activity type', problem: 'Problem task type', change: 'Change task type', general: '',
}

// Selectable task states (used by the create/detail State dropdowns)
export const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'progress', label: 'In Progress' },
  { value: 'onhold', label: 'On Hold' },
  { value: 'done', label: 'Done' },
]
export const STATUS_LABEL: Record<string, string> = { open: 'Open', progress: 'In Progress', onhold: 'On Hold', done: 'Done' }

// Map a task status code to a Badge colour variant
export function taskStatusVariant(code: string): 'medium' | 'info' | 'high' | 'success' | 'default' {
  if (code === 'open') return 'medium'
  if (code === 'progress') return 'info'
  if (code === 'onhold') return 'high'
  if (code === 'done') return 'success'
  return 'default'
}

// Turn a snake_case subtype code into a Title Case label (e.g. "root_cause" → "Root Cause")
export const prettySubtype = (s?: string | null) =>
  s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''
