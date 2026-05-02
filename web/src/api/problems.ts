import { api } from './client'
import type { Problem } from '../types'

export const problemApi = {
  getAll: (includeResolved = false) =>
    api.get<Problem[]>(`/problems?includeResolved=${includeResolved}`),
  getById: (id: number) => api.get<Problem>(`/problems/${id}`),
  create: (body: object) => api.post<{ id: number }>('/problems', body),
  setState: (id: number, stateCode: string, actorUserId?: number) =>
    api.patch(`/problems/${id}/state`, { stateCode, actorUserId }),
  getComments: (id: number) => api.get(`/problems/${id}/comments`),
  postComment: (id: number, authorExtId: string, body: string, isInternal = false) =>
    api.post(`/problems/${id}/comments`, { authorExtId, body, isInternal }),
  getTimeline: (id: number) => api.get(`/problems/${id}/timeline`),
}
