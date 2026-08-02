import { api } from './client'
import type { Priority, ContactMethod, Severity, ResolutionCode, CategoryLookup, SubCategoryLookup, Impact, Urgency, ChangeType, Risk, ChangeState } from '../types'

// Read-only reference-data endpoints (priorities, categories, severities, etc.) used to populate
// select dropdowns across the create/edit forms. Subcategories are scoped to a parent category.
export const lookupsApi = {
  getPriorities: () => api.get<Priority[]>('/lookups/priorities'),
  getCategories: () => api.get<CategoryLookup[]>('/lookups/categories'),
  getSubCategories: (categoryId: number) => api.get<SubCategoryLookup[]>(`/lookups/subcategories?categoryId=${categoryId}`),
  getContactMethods: () => api.get<ContactMethod[]>('/lookups/contact-methods'),
  getSeverities: () => api.get<Severity[]>('/lookups/severities'),
  getResolutionCodes: () => api.get<ResolutionCode[]>('/lookups/resolution-codes'),
  getImpacts: () => api.get<Impact[]>('/lookups/impacts'),
  getUrgencies: () => api.get<Urgency[]>('/lookups/urgencies'),
  getChangeTypes: () => api.get<ChangeType[]>('/lookups/change-types'),
  getRisks: () => api.get<Risk[]>('/lookups/risks'),
  getChangeStates: () => api.get<ChangeState[]>('/lookups/change-states'),
}
