import { useState, useEffect } from 'react'
import { AlertCircle, Clock, GitBranch, TrendingUp, CheckCircle } from 'lucide-react'
import { dashboardApi } from '../../api/dashboard'
import { Badge, priorityVariant, statusVariant } from '../../components/primitives/Badge'
import { SlaBar } from '../../components/primitives/SlaBar'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import type { SlaStats, Incident, Service } from '../../types'

function KpiCard({ label, value, sub, icon, onClick }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-surface rounded-lg border border-border-default p-5 shadow-sm ${onClick ? 'cursor-pointer hover:border-accent/50 hover:shadow-md transition-all' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-text-secondary">{label}</span>
        <div className="text-text-muted">{icon}</div>
      </div>
      <div className="text-3xl font-semibold tabular text-text-primary">{value}</div>
      {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
    </div>
  )
}

export function DashboardView() {
  const { setView } = useAppStore()
  const { user: authUser } = useAuthStore()
  const [stats, setStats] = useState<SlaStats | null>(null)
  const [atRisk, setAtRisk] = useState<Incident[]>([])
  const [services, setServices] = useState<Service[]>([])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  useEffect(() => {
    dashboardApi.getKpis().then(setStats).catch(console.error)
    dashboardApi.getSlaAtRisk().then(setAtRisk).catch(console.error)
    dashboardApi.getServices().then(setServices).catch(console.error)
  }, [])

  const healthColor = (code: string) => ({
    healthy:  'text-[#1f8a4c] bg-[#e6f4ec]',
    degraded: 'text-[#d97706] bg-[#fdf3e3]',
    incident: 'text-[#c8252b] bg-[#fdecec]',
  }[code] ?? 'text-text-muted bg-subtle')

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {greeting}, {authUser?.displayName ?? 'there'} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {(() => {
          const hasIncident = services.some(s => s.healthCode === 'incident')
          const hasDegraded = services.some(s => s.healthCode === 'degraded')
          if (hasIncident) return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#f5c6c8] bg-[#fdecec] text-[#c8252b] text-sm">
              <AlertCircle size={14} /> Active incidents
            </div>
          )
          if (hasDegraded) return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#f3d9a4] bg-[#fdf3e3] text-[#d97706] text-sm">
              <Clock size={14} /> Service degradation
            </div>
          )
          return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#b6dcc4] bg-[#e6f4ec] text-[#1f8a4c] text-sm">
              <CheckCircle size={14} /> All systems operational
            </div>
          )
        })()}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Open incidents" value={stats?.openIncidents ?? '—'} icon={<AlertCircle size={16} />} onClick={() => setView('incidents')} />
        <KpiCard label="SLA at risk" value={stats?.slaAtRisk ?? '—'} sub={`${stats?.slaBreachCount ?? 0} breached`} icon={<Clock size={16} />} onClick={() => setView('incidents')} />
        <KpiCard label="Changes this week" value={stats?.changesThisWeek ?? '—'} icon={<GitBranch size={16} />} onClick={() => setView('changes')} />
        <KpiCard label="Avg resolution" value={stats?.avgResolutionMinutes ? `${Math.round(stats.avgResolutionMinutes)}m` : '—'} sub={`${stats?.slaMetPercent ?? 0}% SLA met`} icon={<TrendingUp size={16} />} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Attention table */}
        <div className="col-span-2 bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-medium text-text-primary">Tickets needing attention</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle border-b border-border-default">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">Title</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">Priority</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">SLA</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-text-muted">No tickets at SLA risk</td></tr>
              ) : atRisk.map(inc => (
                <tr key={inc.incidentId} className="border-b border-border-default last:border-0 hover:bg-hover transition-colors">
                  <td className="px-3 py-2 tabular font-mono text-xs text-text-tertiary">{inc.number}</td>
                  <td className="px-3 py-2 text-text-primary truncate max-w-[200px]">{inc.title}</td>
                  <td className="px-3 py-2"><Badge variant={priorityVariant(inc.priorityCode)}>{inc.priorityCode}</Badge></td>
                  <td className="px-3 py-2">
                    <SlaBar percent={inc.slaPercent} breachedAt={inc.slaBreachedAt} targetMinutes={inc.slaTargetMinutes} startedAt={inc.slaStartedAt} pausedSeconds={inc.slaPausedSeconds} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Service health */}
        <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-medium text-text-primary">Service portfolio</h2>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {services.slice(0, 12).map(s => (
              <div key={s.serviceId} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border-default">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.healthCode === 'healthy' ? 'bg-[#1f8a4c]' : s.healthCode === 'degraded' ? 'bg-[#d97706]' : 'bg-[#c8252b]'}`} />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-text-primary truncate">{s.name}</div>
                  {s.openIncidentCount > 0 && <div className="text-xs text-text-muted">{s.openIncidentCount} open</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
