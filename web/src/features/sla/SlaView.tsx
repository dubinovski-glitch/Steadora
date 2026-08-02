import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { dashboardApi } from '../../api/dashboard'
import type { SlaStats, SlaByPriority, TeamLoad, DailyVolume } from '../../types'

const DAYS_OPTIONS = [7, 14, 30] as const

// SLA & reporting view: renders a day-range selector, a KPI strip, and four
// charts (incident volume bar chart, SLA-met-by-priority bars, a team load
// table, and an incidents-by-priority donut). Data is fetched per selected range.
export function SlaView() {
  const [days, setDays] = useState<7 | 14 | 30>(7)
  const [stats, setStats] = useState<SlaStats | null>(null)
  const [byPriority, setByPriority] = useState<SlaByPriority[]>([])
  const [teamLoad, setTeamLoad] = useState<TeamLoad[]>([])
  const [volume, setVolume] = useState<DailyVolume[]>([])

  // Fetch all dashboard datasets (KPIs, SLA-by-priority, team load, daily
  // volume) whenever the selected day range changes; errors are logged.
  useEffect(() => {
    dashboardApi.getKpis(days).then(setStats).catch(console.error)
    dashboardApi.getSlaByPriority(days).then(setByPriority).catch(console.error)
    dashboardApi.getTeamLoad().then(setTeamLoad).catch(console.error)
    dashboardApi.getDailyVolume(days).then(setVolume).catch(console.error)
  }, [days])

  // Shape priority breakdown into name/value pairs for the donut chart.
  const pieData = byPriority.map(p => ({ name: p.priority, value: p.totalIncidents }))
  const COLORS = ['#c8252b', '#d97706', '#2563c9', '#5b6473']

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">SLA & reporting</h1>
        <div className="flex gap-1 border border-border-default rounded-lg p-1 bg-surface">
          {DAYS_OPTIONS.map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${days === d ? 'bg-accent text-white font-medium' : 'text-text-secondary hover:bg-hover'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          ['SLA met', `${stats?.slaMetPercent ?? 0}%`],
          ['Open incidents', stats?.openIncidents ?? '—'],
          ['SLA at risk', stats?.slaAtRisk ?? '—'],
          ['Avg resolution', stats?.avgResolutionMinutes ? `${Math.round(stats.avgResolutionMinutes)}m` : '—'],
        ].map(([l, v]) => (
          <div key={String(l)} className="bg-surface rounded-lg border border-border-default p-4 shadow-sm">
            <div className="text-xs text-text-secondary mb-1">{l}</div>
            <div className="text-2xl font-semibold tabular text-text-primary">{v}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Volume */}
        <div className="bg-surface rounded-lg border border-border-default p-4 shadow-sm">
          <h3 className="text-sm font-medium text-text-primary mb-3">Incident volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volume} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="bucketDate" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="openedCount" name="Opened" fill="#2b5fff" radius={[2, 2, 0, 0]} />
              <Bar dataKey="sameDayResolved" name="Resolved" fill="#1f8a4c" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA by priority */}
        <div className="bg-surface rounded-lg border border-border-default p-4 shadow-sm">
          <h3 className="text-sm font-medium text-text-primary mb-3">SLA by priority</h3>
          <div className="flex flex-col gap-3">
            {byPriority.map(p => {
              // Color the SLA-met bar green/amber/red by how close pctMet is to target.
              const color = p.pctMet >= 95 ? '#1f8a4c' : p.pctMet >= 90 ? '#d97706' : '#c8252b'
              return (
                <div key={p.priority} className="flex items-center gap-3">
                  <span className="text-xs w-16 text-text-secondary capitalize">{p.priority}</span>
                  <div className="flex-1 h-3 bg-subtle rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.pctMet}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs tabular w-10 text-right" style={{ color }}>{p.pctMet}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Team load */}
        <div className="bg-surface rounded-lg border border-border-default p-4 shadow-sm">
          <h3 className="text-sm font-medium text-text-primary mb-3">Team load & performance</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left text-xs text-text-tertiary py-1.5">Team</th>
                <th className="text-right text-xs text-text-tertiary py-1.5">Load</th>
                <th className="text-right text-xs text-text-tertiary py-1.5">SLA met</th>
                <th className="text-right text-xs text-text-tertiary py-1.5">Breaches</th>
              </tr>
            </thead>
            <tbody>
              {teamLoad.map(t => (
                <tr key={t.teamName} className="border-b border-border-default last:border-0">
                  <td className="py-2 text-text-primary text-xs">{t.teamName}</td>
                  <td className="py-2 text-right tabular text-xs text-text-secondary">{t.openIncidents}</td>
                  <td className="py-2 text-right tabular text-xs" style={{ color: t.pctMet >= 90 ? '#1f8a4c' : '#c8252b' }}>{t.pctMet}%</td>
                  <td className="py-2 text-right tabular text-xs text-[#c8252b]">{t.breaches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Category donut */}
        <div className="bg-surface rounded-lg border border-border-default p-4 shadow-sm">
          <h3 className="text-sm font-medium text-text-primary mb-3">Incidents by priority</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
