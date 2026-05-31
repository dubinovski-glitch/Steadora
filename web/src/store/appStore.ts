import { create } from 'zustand'
import type { View } from '../types'

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
  setView: (v: View) => void
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
  setView: (view) => set({ view, openIncidentId: null, openProblemId: null, openChangeId: null }),
  openIncident: (id) => set({ view: 'incidents', openIncidentId: id }),
  closeIncident: () => set({ openIncidentId: null }),
  openProblem: (id) => set({ view: 'problems', openProblemId: id }),
  closeProblem: () => set({ openProblemId: null }),
  openChange: (id) => set({ view: 'changes', openChangeId: id }),
  closeChange: () => set({ openChangeId: null }),
  setTheme: (theme) => set({ theme }),
  setDensity: (density) => set({ density }),
  setShowNewIncident: (showNewIncident) => set({ showNewIncident }),
  setShowNewProblem: (showNewProblem) => set({ showNewProblem }),
  setShowNewChange: (showNewChange) => set({ showNewChange }),
  setShowCommandPalette: (showCommandPalette) => set({ showCommandPalette }),
}))
