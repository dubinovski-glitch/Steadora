import { api } from './client'
import type {
  User, Group, AdminCategory, Role, AdminService,
  SlaTier, BusinessCalendar, Automation,
} from '../types'

export const adminApi = {
  // Users
  getUsers: () => api.get<User[]>('/admin/users'),
  createUser: (body: { externalId: string; email: string; username: string; displayName: string; title?: string; roleId: number; password?: string; serviceIds?: number[]; groupIds?: number[] }) =>
    api.post<{ id: number }>('/admin/users', body),
  updateUser: (id: number, body: { email: string; username: string; displayName: string; title?: string; roleId: number; isActive: boolean; password?: string }) =>
    api.put<void>(`/admin/users/${id}`, body),
  getUserServices: (id: number) => api.get<number[]>(`/admin/users/${id}/services`),
  setUserServices: (id: number, serviceIds: number[]) => api.put<void>(`/admin/users/${id}/services`, serviceIds),
  getUserGroups: (id: number) => api.get<number[]>(`/admin/users/${id}/groups`),
  setUserGroups: (id: number, groupIds: number[]) => api.put<void>(`/admin/users/${id}/groups`, groupIds),

  // Groups
  getGroups: () => api.get<Group[]>('/admin/groups'),
  createGroup: (body: { name: string; description?: string }) =>
    api.post<{ id: number }>('/admin/groups', body),
  updateGroup: (id: number, body: { name: string; description?: string; isActive: boolean }) =>
    api.put<void>(`/admin/groups/${id}`, body),

  // Categories
  getCategories: () => api.get<AdminCategory[]>('/admin/categories'),
  createCategory: (body: { displayName: string; serviceId?: number }) =>
    api.post<{ id: number }>('/admin/categories', body),
  updateCategory: (id: number, body: { displayName: string; serviceId?: number }) =>
    api.put<void>(`/admin/categories/${id}`, body),
  deleteCategory: (id: number) =>
    api.delete<void>(`/admin/categories/${id}`),
  createSubCategory: (body: { categoryId: number; displayName: string }) =>
    api.post<{ id: number }>('/admin/subcategories', body),
  updateSubCategory: (id: number, body: { categoryId: number; displayName: string }) =>
    api.put<void>(`/admin/subcategories/${id}`, body),
  deleteSubCategory: (id: number) =>
    api.delete<void>(`/admin/subcategories/${id}`),

  // Roles
  getRoles: () => api.get<Role[]>('/admin/roles'),
  updateRole: (id: number, body: { displayName: string; description?: string }) =>
    api.put<void>(`/admin/roles/${id}`, body),

  // Services
  getServices: () => api.get<AdminService[]>('/admin/services'),
  createService: (body: { name: string; owningGroupId?: number; healthCode: string; slaTierId?: number }) =>
    api.post<{ id: number }>('/admin/services', body),
  updateService: (id: number, body: { name: string; owningGroupId?: number; healthCode: string; slaTierId?: number; isActive: boolean }) =>
    api.put<void>(`/admin/services/${id}`, body),

  // SLA Tiers
  getSlaTiers: () => api.get<SlaTier[]>('/admin/sla-tiers'),
  createSlaTier: (body: { name: string; description?: string; calculate247: boolean; autoEscalate: boolean }) =>
    api.post<{ id: number }>('/admin/sla-tiers', body),
  updateSlaTier: (id: number, body: { name: string; description?: string; isActive: boolean; calculate247: boolean; autoEscalate: boolean }) =>
    api.put<void>(`/admin/sla-tiers/${id}`, body),
  saveSlaTierTargets: (id: number, targets: { priorityId: number; responseMinutes: number; resolutionMinutes: number }[]) =>
    api.put<void>(`/admin/sla-tiers/${id}/targets`, targets),

  // Business Calendars
  getBusinessCalendars: () => api.get<BusinessCalendar[]>('/admin/business-calendars'),
  createBusinessCalendar: (body: { name: string; timezone: string }) =>
    api.post<{ id: number }>('/admin/business-calendars', body),
  saveBusinessDays: (calendarId: number, days: { dayOfWeek: number; startTime?: string; endTime?: string }[]) =>
    api.put<void>(`/admin/business-calendars/${calendarId}/days`, days),
  addHoliday: (calendarId: number, body: { holidayDate: string; name: string }) =>
    api.post<{ id: number }>(`/admin/business-calendars/${calendarId}/holidays`, body),
  deleteHoliday: (holidayId: number) =>
    api.delete<void>(`/admin/business-holidays/${holidayId}`),

  // Automations
  getAutomations: () => api.get<Automation[]>('/admin/automations'),
  createAutomation: (body: { name: string; whenDescription: string; thenDescription: string }) =>
    api.post<{ id: number }>('/admin/automations', body),
  updateAutomation: (id: number, body: { name: string; whenDescription: string; thenDescription: string }) =>
    api.put<void>(`/admin/automations/${id}`, body),
  toggleAutomation: (id: number, enabled: boolean) =>
    api.patch<void>(`/admin/automations/${id}/toggle`, { enabled }),
}
