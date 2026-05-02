import { api } from './client'
import type { KbArticle, KbCategory } from '../types'

export const kbApi = {
  search: (q?: string, categoryId?: number) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (categoryId) p.set('categoryId', String(categoryId))
    return api.get<KbArticle[]>(`/knowledge/articles?${p}`)
  },
  getById: (id: number) => api.get<KbArticle>(`/knowledge/articles/${id}`),
  getCategories: () => api.get<KbCategory[]>('/knowledge/categories'),
  vote: (id: number, helpful: boolean) =>
    api.post(`/knowledge/articles/${id}/vote`, { helpful }),
}
