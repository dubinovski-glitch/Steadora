import { api } from './client'
import type { Change } from '../types'

export const changeApi = {
  getAll: (state?: string) => api.get<Change[]>(`/changes${state ? `?state=${state}` : ''}`),
  getById: (id: number) => api.get<Change>(`/changes/${id}`),
  create: (body: object) => api.post<{ id: number }>('/changes', body),
  update: (id: number, body: object) => api.put(`/changes/${id}`, body),
  setState: (id: number, stateCode: string, actorUserId?: number) =>
    api.patch(`/changes/${id}/state`, { stateCode, actorUserId }),
  vote: (id: number, userExtId: string, voteCode: string, comment?: string) =>
    api.post(`/changes/${id}/vote`, { userExtId, voteCode, comment }),
  getComments: (id: number) => api.get(`/changes/${id}/comments`),
  postComment: (id: number, authorExtId: string, body: string, isInternal = false) =>
    api.post(`/changes/${id}/comments`, { authorExtId, body, isInternal }),
}
