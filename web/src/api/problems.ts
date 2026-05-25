import { api } from './client'
import type { Incident, Problem } from '../types'

export interface ProblemPage { items: Problem[]; total: number; page: number; pageSize: number }

export const problemApi = {
  getAll: (includeResolved = false, myGroupsOnly = false, page = 1, pageSize = 25) =>
    api.get<ProblemPage>(`/problems?includeResolved=${includeResolved}&myGroupsOnly=${myGroupsOnly}&page=${page}&pageSize=${pageSize}`),
  getAllItems: (includeResolved = false) =>
    api.get<ProblemPage>(`/problems?includeResolved=${includeResolved}&myGroupsOnly=false&page=1&pageSize=1000`).then(r => r.items),
  getById: (id: number) => api.get<Problem>(`/problems/${id}`),
  create: (body: object) => api.post<{ id: number }>('/problems', body),
  update: (id: number, body: object) => api.put<void>(`/problems/${id}`, body),
  setState: (id: number, stateCode: string, actorUserId?: number) =>
    api.patch(`/problems/${id}/state`, { stateCode, actorUserId }),
  getComments: (id: number) => api.get(`/problems/${id}/comments`),
  postComment: (id: number, authorExtId: string, body: string, isInternal = false) =>
    api.post(`/problems/${id}/comments`, { authorExtId, body, isInternal }),
  getTimeline: (id: number) => api.get(`/problems/${id}/timeline`),
  getLinkedIncidents: (id: number) => api.get<Incident[]>(`/problems/${id}/incidents`),
  getWatchers: (id: number) => api.get<{ userId: number; userName: string }[]>(`/problems/${id}/watchers`),
  watch: (id: number) => api.post<void>(`/problems/${id}/watchers`, {}),
  unwatch: (id: number) => api.delete<void>(`/problems/${id}/watchers`),
}
