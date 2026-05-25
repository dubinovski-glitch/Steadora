import { api } from './client'
import type { Incident, Problem } from '../types'

export const problemApi = {
  getAll: (includeResolved = false, myGroupsOnly = false) =>
    api.get<Problem[]>(`/problems?includeResolved=${includeResolved}&myGroupsOnly=${myGroupsOnly}`),
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
}
