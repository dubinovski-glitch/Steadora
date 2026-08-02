import { api } from './client'
import type { SlaStats, Incident, Service, SlaByPriority, TeamLoad, DailyVolume } from '../types'

// Dashboard / SLA reporting endpoints. Each method is a typed GET returning aggregated stats;
// the `days` params scope the reporting window. Consumed by the dashboard and SLA views.
export const dashboardApi = {
  getKpis: (days = 7) => api.get<SlaStats>(`/dashboard/kpis?days=${days}`),
  getSlaAtRisk: () => api.get<Incident[]>('/dashboard/sla-at-risk'),
  getServices: () => api.get<Service[]>('/dashboard/services'),
  getSlaByPriority: (days = 7) => api.get<SlaByPriority[]>(`/sla/by-priority?days=${days}`),
  getTeamLoad: () => api.get<TeamLoad[]>('/sla/team-load'),
  getDailyVolume: (days = 14) => api.get<DailyVolume[]>(`/sla/daily-volume?days=${days}`),
}
