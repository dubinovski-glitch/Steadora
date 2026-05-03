import { api } from './client'
import type { Priority, ContactMethod, Severity, ResolutionCode, CategoryLookup, SubCategoryLookup, Impact, Urgency } from '../types'

export const lookupsApi = {
  getPriorities: () => api.get<Priority[]>('/lookups/priorities'),
  getCategories: () => api.get<CategoryLookup[]>('/lookups/categories'),
  getSubCategories: (categoryId: number) => api.get<SubCategoryLookup[]>(`/lookups/subcategories?categoryId=${categoryId}`),
  getContactMethods: () => api.get<ContactMethod[]>('/lookups/contact-methods'),
  getSeverities: () => api.get<Severity[]>('/lookups/severities'),
  getResolutionCodes: () => api.get<ResolutionCode[]>('/lookups/resolution-codes'),
  getImpacts: () => api.get<Impact[]>('/lookups/impacts'),
  getUrgencies: () => api.get<Urgency[]>('/lookups/urgencies'),
}
