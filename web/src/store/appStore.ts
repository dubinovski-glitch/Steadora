import { create } from 'zustand'
import type { View, AdminSection, TaskType, TaskMode } from '../types'

// Which slice of incidents the queue shows: everything, only mine, or my group's.
export type IncidentScope = 'all' | 'mine' | 'mygroup'

// Which slice of problems the list shows: everything, only mine, or my group's.
export type ProblemScope = 'all' | 'mine' | 'mygroup'

// Shape of the global UI/navigation store. Fields hold the current screen and dialog state;
// the function members are actions that mutate that state (consumed by App and feature views).
interface AppState {
  view: View
  openIncidentId: number | null
  openProblemId: number | null
  openChangeId: number | null
  theme: 'light' | 'dark'
  density: 'compact' | 'default' | 'comfortable'
  showNewIncident: boolean
  showNewProblem: boolean
  showNewChange: boolean
  showCommandPalette: boolean
  incidentsScope: IncidentScope
  problemsScope: ProblemScope
  adminSection: AdminSection
  adminAtHome: boolean
  taskType: TaskType
  taskMode: TaskMode
  openTaskId: number | null
  setView: (v: View) => void
  goToIncidents: (scope: IncidentScope) => void
  newIncident: () => void
  setIncidentsScope: (s: IncidentScope) => void
  goToProblems: (scope: ProblemScope) => void
  newProblem: () => void
  setProblemsScope: (s: ProblemScope) => void
  openAdminSection: (s: AdminSection) => void
  goAdminHome: () => void
  openTasks: (type: TaskType, mode: TaskMode) => void
  openTask: (id: number) => void
  closeTask: () => void
  openIncident: (id: number) => void
  closeIncident: () => void
  openProblem: (id: number) => void
  closeProblem: () => void
  openChange: (id: number) => void
  closeChange: () => void
  setTheme: (t: 'light' | 'dark') => void
  setDensity: (d: 'compact' | 'default' | 'comfortable') => void
  setShowNewIncident: (v: boolean) => void
  setShowNewProblem: (v: boolean) => void
  setShowNewChange: (v: boolean) => void
  setShowCommandPalette: (v: boolean) => void
}

// Global navigation/UI store (zustand). Not persisted: every action calls `set` to update the
// flags App reads when deciding what to render. Acts as the app's in-memory "router".
export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  openIncidentId: null,
  openProblemId: null,
  openChangeId: null,
  theme: 'light',
  density: 'default',
  showNewIncident: false,
  showNewProblem: false,
  showNewChange: false,
  showCommandPalette: false,
  incidentsScope: 'all',
  problemsScope: 'all',
  adminSection: 'users',
  adminAtHome: true,
  taskType: 'incident',
  taskMode: 'mine',
  openTaskId: null,
  // Switch top-level view; always clear any open detail record so we don't show a stale pane.
  // Entering the admin area from the main sidebar lands on the home hub
  setView: (view) =>
    set({ view, openIncidentId: null, openProblemId: null, openChangeId: null, ...(view === 'admin' ? { adminAtHome: true } : {}) }),
  // Open the incidents list filtered to a scope (resets any open detail / new-form state).
  goToIncidents: (scope) =>
    set({ view: 'incidents', incidentsScope: scope, openIncidentId: null, showNewIncident: false }),
  // Jump to the incidents view with the new-incident form shown.
  newIncident: () => set({ view: 'incidents', showNewIncident: true, openIncidentId: null }),
  // Change the incidents queue scope filter in place.
  setIncidentsScope: (incidentsScope) => set({ incidentsScope }),
  // Open the problems list filtered to a scope (resets any open detail / new-form state).
  goToProblems: (scope) =>
    set({ view: 'problems', problemsScope: scope, openProblemId: null, showNewProblem: false }),
  // Jump to the problems view with the new-problem form shown.
  newProblem: () => set({ view: 'problems', showNewProblem: true, openProblemId: null }),
  // Change the problems list scope filter in place.
  setProblemsScope: (problemsScope) => set({ problemsScope }),
  // Drill into a specific admin section (leaves the admin home hub).
  openAdminSection: (adminSection) => set({ adminSection, adminAtHome: false }),
  // Return to the admin home hub from a section.
  goAdminHome: () => set({ adminAtHome: true }),
  // Open the tasks view for a given task type + mode (mine/mygroup/new), clearing other detail panes.
  openTasks: (taskType, taskMode) =>
    set({ view: 'tasks', taskType, taskMode, openTaskId: null, openIncidentId: null, openProblemId: null, openChangeId: null }),
  // Open a single task's detail.
  openTask: (id) => set({ view: 'tasks', openTaskId: id }),
  // Close the task detail pane (back to the task list).
  closeTask: () => set({ openTaskId: null }),
  // Open an incident's detail (and ensure we're on the incidents view).
  openIncident: (id) => set({ view: 'incidents', openIncidentId: id }),
  closeIncident: () => set({ openIncidentId: null }),
  openProblem: (id) => set({ view: 'problems', openProblemId: id }),
  closeProblem: () => set({ openProblemId: null }),
  openChange: (id) => set({ view: 'changes', openChangeId: id }),
  closeChange: () => set({ openChangeId: null }),
  // Simple setters for theme/density (applied to <html> by App) and dialog visibility flags.
  setTheme: (theme) => set({ theme }),
  setDensity: (density) => set({ density }),
  setShowNewIncident: (showNewIncident) => set({ showNewIncident }),
  setShowNewProblem: (showNewProblem) => set({ showNewProblem }),
  setShowNewChange: (showNewChange) => set({ showNewChange }),
  setShowCommandPalette: (showCommandPalette) => set({ showCommandPalette }),
}))
