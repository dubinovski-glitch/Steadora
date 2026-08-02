import { api } from './client'
import type { Task, TaskType } from '../types'

// Record types a task can be linked to, and the minimal shape returned when searching them.
export type LinkRecordType = 'incident' | 'problem' | 'change'
export interface LinkableRecord { number: string; title: string }

// Payload for creating a task (most fields optional; defaults applied server-side).
export interface CreateTaskBody {
  taskType: TaskType
  title: string
  referenceNumber?: string | null
  priorityCode: string
  assigneeUserId?: number
  groupId?: number
  dueDate?: string | null
  description?: string
  statusCode?: string
  onHoldReason?: string | null
  subtype?: string | null
  plannedStart?: string | null
  plannedEnd?: string | null
}

// Payload for updating an existing task (full editable field set).
export interface UpdateTaskBody {
  title: string
  priorityCode: string
  statusCode: string
  onHoldReason?: string | null
  assigneeUserId?: number | null
  groupId?: number | null
  dueDate?: string | null
  description?: string | null
  referenceNumber?: string | null
  subtype?: string | null
  plannedStart?: string | null
  plannedEnd?: string | null
}

// Task endpoints: list by type+scope, fetch/update one, preview the next task number, search
// linkable records (for the reference field), and create.
export const taskApi = {
  list: (type: TaskType, scope: 'mine' | 'mygroup' | 'all') =>
    api.get<Task[]>(`/tasks?type=${type}&scope=${scope}`),
  get: (id: number) => api.get<Task>(`/tasks/${id}`),
  update: (id: number, body: UpdateTaskBody) => api.put<void>(`/tasks/${id}`, body),
  // Preview the next auto-generated task number for a type (shown before the task is saved).
  nextNumber: (type: TaskType) =>
    api.get<{ number: string }>(`/tasks/next?type=${type}`),
  // Typeahead for linking a task to an existing incident/problem/change by number or title.
  searchRecords: (recordType: LinkRecordType, q: string) =>
    api.get<LinkableRecord[]>(`/tasks/link-search?recordType=${recordType}&q=${encodeURIComponent(q)}`),
  create: (body: CreateTaskBody) =>
    api.post<{ number: string }>('/tasks', body),
}
