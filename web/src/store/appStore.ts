import { create } from 'zustand'
import type { View } from '../types'

interface AppState {
  view: View
  openIncidentId: number | null
  theme: 'light' | 'dark'
  density: 'compact' | 'default' | 'comfortable'
  showNewIncident: boolean
  showCommandPalette: boolean
  setView: (v: View) => void
  openIncident: (id: number) => void
  closeIncident: () => void
  setTheme: (t: 'light' | 'dark') => void
  setDensity: (d: 'compact' | 'default' | 'comfortable') => void
  setShowNewIncident: (v: boolean) => void
  setShowCommandPalette: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  openIncidentId: null,
  theme: 'light',
  density: 'default',
  showNewIncident: false,
  showCommandPalette: false,
  setView: (view) => set({ view, openIncidentId: null }),
  openIncident: (id) => set({ view: 'incidents', openIncidentId: id }),
  closeIncident: () => set({ openIncidentId: null }),
  setTheme: (theme) => set({ theme }),
  setDensity: (density) => set({ density }),
  setShowNewIncident: (showNewIncident) => set({ showNewIncident }),
  setShowCommandPalette: (showCommandPalette) => set({ showCommandPalette }),
}))
