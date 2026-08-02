import { useState, useEffect } from 'react'
import { AlertCircle, Clock, GitBranch, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react'
import { dashboardApi } from '../../api/dashboard'
import { Badge, priorityVariant, statusVariant } from '../../components/primitives/Badge'
import { priorityLabel, statusLabel } from '../../utils/labels'
import { SlaBar } from '../../components/primitives/SlaBar'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import type { SlaStats, Incident, Service } from '../../types'

const kpiTheme = {
  incident: { bar: '#c8252b', icon: 'bg-[#fdecec] text-[#c8252b]' },
  sla:      { bar: '#d97706', icon: 'bg-[#fdf3e3] text-[#d97706]' },
  change:   { bar: 'var(--accent)', icon: 'bg-accent-subtle text-accent' },
  metric:   { bar: '#1f8a4c', icon: 'bg-[#e6f4ec] text-[#1f8a4c]' },
}

// KPI summary card with a colored top accent bar, label, icon, big value, and
// optional sub-text; becomes clickable (with hover affordance) when onClick is given.
function KpiCard({ label, value, sub, icon, theme, onClick }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  theme: keyof typeof kpiTheme; onClick?: () => void
}) {
  const t = kpiTheme[theme]
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div style={{ height: 3, background: t.bar }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-text-secondary">{label}</span>
          <div className={`p-1.5 rounded-md ${t.icon}`}>{icon}</div>
        </div>
        <div className="text-3xl font-semibold tabular text-text-primary">{value}</div>
        {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
      </div>
    </div>
  )
}

// Maps a service health code to the Tailwind class for its status dot color.
const healthDot = (code: string) => ({
  healthy:  'bg-[#1f8a4c]',
  degraded: 'bg-[#d97706]',
  incident: 'bg-[#c8252b]',
}[code] ?? 'bg-text-muted')

// Maps a service health code to the badge's text/background/border classes.
const healthBadge = (code: string) => ({
  healthy:  'text-[#1f8a4c] bg-[#e6f4ec] border border-[#b6dcc4]',
  degraded: 'text-[#d97706] bg-[#fdf3e3] border border-[#f3d9a4]',
  incident: 'text-[#c8252b] bg-[#fdecec] border border-[#f5c6c8]',
}[code] ?? 'text-text-muted bg-subtle border border-border-default')

// Maps a service health code to its human-readable label (falls back to the code).
const healthLabel = (code: string) =>
  ({ healthy: 'Healthy', degraded: 'Degraded', incident: 'Incident' }[code] ?? code)

// Landing dashboard: greets the user, shows an overall system-status pill, a KPI
// strip, a "tickets needing attention" table (SLA-at-risk incidents), and a
// service portfolio health list. KPI cards navigate to other views on click.
export function DashboardView() {
  const { setView } = useAppStore()
  const { user: authUser } = useAuthStore()
  const [stats, setStats] = useState<SlaStats | null>(null)
  const [atRisk, setAtRisk] = useState<Incident[]>([])
  const [services, setServices] = useState<Service[]>([])

  // Pick a time-of-day greeting based on the current hour.
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  // On mount, fetch dashboard KPIs, the SLA-at-risk incident list, and the
  // service portfolio; errors are logged to the console.
  useEffect(() => {
    dashboardApi.getKpis().then(setStats).catch(console.error)
    dashboardApi.getSlaAtRisk().then(setAtRisk).catch(console.error)
    dashboardApi.getServices().then(setServices).catch(console.error)
  }, [])

  // Tally services by health for the portfolio header summary.
  const incidentCount = services.filter(s => s.healthCode === 'incident').length
  const degradedCount = services.filter(s => s.healthCode === 'degraded').length
  const healthyCount  = services.filter(s => s.healthCode === 'healthy').length

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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#f5c6c8] bg-[#fdecec] text-[#c8252b] text-sm font-medium">
              <AlertCircle size={14} /> Active incidents
            </div>
          )
          if (hasDegraded) return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#f3d9a4] bg-[#fdf3e3] text-[#d97706] text-sm font-medium">
              <Clock size={14} /> Service degradation
            </div>
          )
          return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#b6dcc4] bg-[#e6f4ec] text-[#1f8a4c] text-sm font-medium">
              <CheckCircle size={14} /> All systems operational
            </div>
          )
        })()}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard theme="incident" label="Open incidents"    value={stats?.openIncidents ?? '—'}  icon={<AlertCircle size={16} />} onClick={() => setView('incidents')} />
        <KpiCard theme="sla"      label="SLA at risk"       value={stats?.slaAtRisk ?? '—'}       sub={`${stats?.slaBreachCount ?? 0} breached`} icon={<Clock size={16} />} onClick={() => setView('incidents')} />
        <KpiCard theme="change"   label="Changes this week" value={stats?.changesThisWeek ?? '—'} icon={<GitBranch size={16} />} onClick={() => setView('changes')} />
        <KpiCard theme="metric"   label="Avg resolution"    value={stats?.avgResolutionMinutes ? `${Math.round(stats.avgResolutionMinutes)}m` : '—'} sub={`${stats?.slaMetPercent ?? 0}% SLA met`} icon={<TrendingUp size={16} />} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Attention table */}
        <div className="col-span-2 bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-primary">Tickets needing attention</h2>
            <button onClick={() => setView('incidents')} className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle border-b border-border-default">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">Title</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">Priority</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">SLA</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle size={20} className="text-[#1f8a4c]" />
                      <span className="text-text-muted text-sm">No tickets at SLA risk</span>
                    </div>
                  </td>
                </tr>
              ) : atRisk.map(inc => (
                <tr key={inc.incidentId} className="border-b border-border-default last:border-0 hover:bg-hover transition-colors">
                  <td className="px-3 py-2 tabular font-mono text-xs text-text-tertiary">{inc.number}</td>
                  <td className="px-3 py-2 text-text-primary truncate max-w-[180px]">{inc.title}</td>
                  <td className="px-3 py-2"><Badge variant={priorityVariant(inc.priorityCode)}>{priorityLabel(inc.priorityCode)}</Badge></td>
                  <td className="px-3 py-2"><Badge variant={statusVariant(inc.statusCode)}>{statusLabel(inc.statusCode)}</Badge></td>
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
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-text-primary">Service portfolio</h2>
              {services.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  {incidentCount > 0 && <span className="text-[#c8252b] font-medium">{incidentCount} incident</span>}
                  {degradedCount > 0 && <span className="text-[#d97706] font-medium">{degradedCount} degraded</span>}
                  <span className="text-[#1f8a4c] font-medium">{healthyCount} healthy</span>
                </div>
              )}
            </div>
          </div>
          <div className="divide-y divide-border-default">
            {services.slice(0, 10).map(s => (
              <div key={s.serviceId} className="flex items-center justify-between px-4 py-2.5 hover:bg-hover transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${healthDot(s.healthCode)}`} />
                  <span className="text-sm text-text-primary truncate">{s.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {s.openIncidentCount > 0 && (
                    <span className="text-xs tabular text-text-muted">{s.openIncidentCount} open</span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${healthBadge(s.healthCode)}`}>
                    {healthLabel(s.healthCode)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
