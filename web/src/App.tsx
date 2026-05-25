import { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import { useAuthStore } from './store/authStore'
import { useToast } from './hooks/useToast'
import { useKeyboard } from './hooks/useKeyboard'
import { useNotifications } from './hooks/useNotifications'
import { LoginPage } from './features/auth/LoginPage'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { ToastStack } from './components/primitives/Toast'
import { CommandPalette } from './components/CommandPalette'
import { DashboardView } from './features/dashboard/DashboardView'
import { IncidentsView } from './features/incidents/IncidentsView'
import { IncidentDetailView } from './features/incidents/IncidentDetailView'
import { ProblemsView } from './features/problems/ProblemsView'
import { NewProblemForm } from './features/problems/NewProblemForm'
import { ProblemDetailView } from './features/problems/ProblemDetailView'
import { ChangesView } from './features/changes/ChangesView'
import { KnowledgeView } from './features/knowledge/KnowledgeView'
import { SlaView } from './features/sla/SlaView'
import { AdminView } from './features/admin/AdminView'
import { NewIncidentForm } from './features/incidents/NewIncidentForm'

export default function App() {
  const { view, setView, openIncidentId, openProblemId, theme, density, showNewIncident, showNewProblem } = useAppStore()
  const { token, user } = useAuthStore()
  const { toasts, addToast } = useToast()
  const { unreadCount, markAllRead } = useNotifications()
  useKeyboard(addToast)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-density', density)
  }, [theme, density])

  // Redirect non-admins away from the admin view
  useEffect(() => {
    if (view === 'admin' && user?.roleCode !== 'admin') setView('dashboard')
  }, [view, user?.roleCode, setView])

  if (!token) return <LoginPage />

  const counts = { incidents: 0, problems: 0, changes: 0 }

  return (
    <div className="app-shell" data-theme={theme} data-density={density}>
      <CommandPalette />
      <Sidebar counts={counts} />
      <div className="main-content">
        <Topbar unreadCount={unreadCount} onMarkAllRead={markAllRead} />
        <div className="page-content">
          {view === 'dashboard' && <DashboardView />}
          {view === 'incidents' && !openIncidentId && !showNewIncident && <IncidentsView addToast={addToast} />}
          {view === 'incidents' && !openIncidentId && showNewIncident && <NewIncidentForm addToast={addToast} />}
          {view === 'incidents' && openIncidentId && <IncidentDetailView incidentId={openIncidentId} addToast={addToast} />}
          {view === 'problems' && !openProblemId && !showNewProblem && <ProblemsView addToast={addToast} />}
          {view === 'problems' && !openProblemId && showNewProblem && <NewProblemForm addToast={addToast} />}
          {view === 'problems' && openProblemId && <ProblemDetailView problemId={openProblemId} addToast={addToast} />}
          {view === 'changes' && <ChangesView addToast={addToast} />}
          {view === 'knowledge' && <KnowledgeView />}
          {view === 'sla' && <SlaView />}
          {view === 'admin' && <AdminView addToast={addToast} />}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  )
}
