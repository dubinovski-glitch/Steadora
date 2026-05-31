import type { Workspace, WorkspaceField } from '../types'

const BASE = '/api'

async function req<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...init,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

// Called from the API client (token already in auth store)
import { api } from './client'

export const workspaceApi = {
  getAll: () => api.get<Workspace[]>('/workspaces'),
  getById: (id: number) => api.get<Workspace>(`/workspaces/${id}`),
  create: (body: { name: string; description?: string }) =>
    api.post<Workspace>('/workspaces', body),
  update: (id: number, body: { name: string; description?: string; isActive: boolean }) =>
    api.put<Workspace>(`/workspaces/${id}`, body),
  setFields: (id: number, fields: Array<{ entityType: string; fieldKey: string; isVisible: boolean; isMandatory: boolean }>) =>
    api.put<Workspace>(`/workspaces/${id}/fields`, fields),
  setUsers: (id: number, userIds: number[]) =>
    api.put<Workspace>(`/workspaces/${id}/users`, { userIds }),
  delete: (id: number) => api.delete<void>(`/workspaces/${id}`),
}

// Used in LoginPage before token is in the store (raw fetch)
export async function fetchWorkspacesForUser(token: string): Promise<Workspace[]> {
  return req<Workspace[]>('/workspaces/mine', token)
}

export async function fetchWorkspace(token: string, id: number): Promise<Workspace> {
  return req<Workspace>(`/workspaces/${id}`, token)
}
