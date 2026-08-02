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
import { SlaView } from './features/sla/SlaView'
import { AdminView } from './features/admin/AdminView'
import { NewIncidentForm } from './features/incidents/NewIncidentForm'
import { TasksView } from './features/tasks/TasksView'
import { NewTaskForm } from './features/tasks/NewTaskForm'
import { TaskDetailView } from './features/tasks/TaskDetailView'

// Root component and central router. There is no react-router here: which view renders is
// driven entirely by the zustand appStore (`view` + the various open*/show* flags). App reads
// that navigation state, gates on auth, and conditionally renders the matching feature screen.
export default function App() {
  // Navigation + UI state from the app store (current view, which detail record is open, theme, etc.).
  const { view, setView, openIncidentId, openProblemId, theme, density, showNewIncident, showNewProblem, taskMode, openTaskId } = useAppStore()
  // Auth state: token gates the whole app; user drives role-based access (e.g. admin).
  const { token, user } = useAuthStore()
  // Local toast queue plus the addToast callback passed down to feature views.
  const { toasts, addToast } = useToast()
  // Unread notification badge count, polled by the hook; markAllRead clears it.
  const { unreadCount, markAllRead } = useNotifications()
  // Register global keyboard shortcuts (command palette, quick-create, view navigation).
  useKeyboard(addToast)

  // Reflect theme/density choices onto <html> data-* attributes so global CSS can react.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-density', density)
  }, [theme, density])

  // Redirect non-admins away from the admin view
  useEffect(() => {
    if (view === 'admin' && user?.roleCode !== 'admin') setView('dashboard')
  }, [view, user?.roleCode, setView])

  // Auth gate: with no token, show only the login screen and skip the authenticated shell.
  if (!token) return <LoginPage />

  const counts = { incidents: 0, problems: 0, changes: 0 }

  // Authenticated shell: command palette + sidebar + topbar, with the active feature view in
  // the content area. Each line below maps a combination of view/open*/show* flags to a screen.
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
          {view === 'sla' && <SlaView />}
          {view === 'admin' && <AdminView addToast={addToast} />}
          {view === 'tasks' && openTaskId && <TaskDetailView taskId={openTaskId} addToast={addToast} />}
          {view === 'tasks' && !openTaskId && taskMode === 'new' && <NewTaskForm addToast={addToast} />}
          {view === 'tasks' && !openTaskId && taskMode !== 'new' && <TasksView addToast={addToast} />}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  )
}
