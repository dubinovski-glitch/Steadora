import type { Workspace } from '../types'
import { api } from './client'

const BASE = '/api'

// Raw fetch — used in LoginPage before the token is stored in authStore
async function req<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...init,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

// Workspace (tenant) admin endpoints used once the user is logged in: list/create/update,
// configure per-entity field visibility, manage membership, and delete.
// Standard API calls (token already in authStore)
export const workspaceApi = {
  getAll:   ()                                          => api.get<Workspace[]>('/workspaces'),
  getById:  (id: number)                               => api.get<Workspace>(`/workspaces/${id}`),
  create:   (body: { name: string; description?: string }) =>
    api.post<Workspace>('/workspaces', body),
  update:   (id: number, body: { name: string; description?: string; isActive: boolean }) =>
    api.put<Workspace>(`/workspaces/${id}`, body),
  setFields: (id: number, fields: Array<{ entityType: string; fieldKey: string; isVisible: boolean; isMandatory: boolean }>) =>
    api.put<Workspace>(`/workspaces/${id}/fields`, fields),
  setUsers: (id: number, userIds: number[]) =>
    api.put<Workspace>(`/workspaces/${id}/users`, { userIds }),
  delete:   (id: number)                               => api.delete<void>(`/workspaces/${id}`),
}

// Login-time workspace fetch (before token is in the store)
// List the workspaces the just-authenticated user may enter, so LoginPage can prompt/select one.
export async function fetchWorkspacesForUser(token: string): Promise<Workspace[]> {
  return req<Workspace[]>('/workspaces/mine', token)
}

// Fetch a single workspace (with its field config) at login, before it's stored in authStore.
export async function fetchWorkspace(token: string, id: number): Promise<Workspace> {
  return req<Workspace>(`/workspaces/${id}`, token)
}
