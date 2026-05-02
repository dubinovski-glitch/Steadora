import { api } from './client'
import type { Incident, Comment, ActivityEvent } from '../types'

export interface IncidentPage { items: Incident[]; total: number; page: number; pageSize: number }

export interface IncidentFilter {
  search?: string; status?: string; priority?: string
  assigneeUserId?: number; slaAtRisk?: boolean
  unassigned?: boolean; includeResolved?: boolean
  page?: number; pageSize?: number
}

function qs(f: IncidentFilter) {
  const p = new URLSearchParams()
  if (f.search) p.set('search', f.search)
  if (f.status) p.set('status', f.status)
  if (f.priority) p.set('priority', f.priority)
  if (f.assigneeUserId) p.set('assigneeUserId', String(f.assigneeUserId))
  if (f.slaAtRisk) p.set('slaAtRisk', 'true')
  if (f.unassigned) p.set('unassigned', 'true')
  if (f.includeResolved) p.set('includeResolved', 'true')
  p.set('page', String(f.page ?? 1))
  p.set('pageSize', String(f.pageSize ?? 50))
  return p.toString()
}

export const incidentApi = {
  getQueue: (f: IncidentFilter = {}) => api.get<IncidentPage>(`/incidents?${qs(f)}`),
  getById: (id: number) => api.get<Incident>(`/incidents/${id}`),
  create: (body: object) => api.post<{ id: number }>('/incidents', body),
  setStatus: (id: number, statusCode: string, actorUserId?: number) =>
    api.patch(`/incidents/${id}/status`, { statusCode, actorUserId }),
  assign: (id: number, assigneeExtId: string | null, actorUserId?: number) =>
    api.patch(`/incidents/${id}/assignee`, { assigneeExtId, actorUserId }),
  setPriority: (id: number, priorityCode: string, actorUserId?: number) =>
    api.patch(`/incidents/${id}/priority`, { priorityCode, actorUserId }),
  linkProblem: (id: number, problemId: number) =>
    api.patch(`/incidents/${id}/problem`, { problemId }),
  close: (id: number) => api.delete(`/incidents/${id}`),
  bulkClose: (ids: number[]) => api.post('/incidents/bulk/close', { incidentIds: ids }),
  getComments: (id: number) => api.get<Comment[]>(`/incidents/${id}/comments`),
  postComment: (id: number, authorExtId: string, body: string, isInternal = false) =>
    api.post(`/incidents/${id}/comments`, { authorExtId, body, isInternal }),
  getTimeline: (id: number) => api.get<ActivityEvent[]>(`/incidents/${id}/timeline`),
  getWatchers: (id: number) => api.get(`/incidents/${id}/watchers`),
}
