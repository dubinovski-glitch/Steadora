import { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import { useToast } from './hooks/useToast'
import { useKeyboard } from './hooks/useKeyboard'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { ToastStack } from './components/primitives/Toast'
import { DashboardView } from './features/dashboard/DashboardView'
import { IncidentsView } from './features/incidents/IncidentsView'
import { IncidentDetailView } from './features/incidents/IncidentDetailView'
import { ProblemsView } from './features/problems/ProblemsView'
import { ChangesView } from './features/changes/ChangesView'
import { KnowledgeView } from './features/knowledge/KnowledgeView'
import { SlaView } from './features/sla/SlaView'
import { AdminView } from './features/admin/AdminView'
import { NewIncidentModal } from './features/incidents/NewIncidentModal'

export default function App() {
  const { view, openIncidentId, theme, density, showNewIncident } = useAppStore()
  const { toasts, addToast } = useToast()
  useKeyboard(addToast)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-density', density)
  }, [theme, density])

  const counts = { incidents: 0, problems: 0, changes: 0 }

  return (
    <div className="app-shell" data-theme={theme} data-density={density}>
      <Sidebar counts={counts} />
      <div className="main-content">
        <Topbar />
        <div className="page-content">
          {view === 'dashboard' && <DashboardView />}
          {view === 'incidents' && !openIncidentId && <IncidentsView addToast={addToast} />}
          {view === 'incidents' && openIncidentId && <IncidentDetailView incidentId={openIncidentId} addToast={addToast} />}
          {view === 'problems' && <ProblemsView />}
          {view === 'changes' && <ChangesView addToast={addToast} />}
          {view === 'knowledge' && <KnowledgeView />}
          {view === 'sla' && <SlaView />}
          {view === 'admin' && <AdminView addToast={addToast} />}
        </div>
      </div>

      {showNewIncident && <NewIncidentModal addToast={addToast} />}
      <ToastStack toasts={toasts} />
    </div>
  )
}
