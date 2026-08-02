import { api } from './client'

// A single global-search hit; `type` says which entity it is and which *Code fields apply.
export interface SearchResult {
  type: 'incident' | 'problem'
  id: number
  number: string
  title: string
  statusCode?: string
  priorityCode?: string
  stateCode?: string
}

// Global search across incidents/problems; powers the command palette and topbar search.
export const searchApi = {
  search: (q: string) =>
    api.get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
}
