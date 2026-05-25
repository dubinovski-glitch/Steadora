import { api } from './client'

export interface SearchResult {
  type: 'incident' | 'problem' | 'kb'
  id: number
  number: string
  title: string
  statusCode?: string
  priorityCode?: string
  stateCode?: string
}

export const searchApi = {
  search: (q: string) =>
    api.get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
}
