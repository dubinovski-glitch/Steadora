import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CurrentUser, WorkspaceField } from '../types'

// Auth + active-workspace state. token/user identify the signed-in user; workspace* hold the
// currently selected tenant and its per-field visibility config used across forms.
interface AuthState {
  token: string | null
  user: CurrentUser | null
  workspaceId: number | null
  workspaceName: string | null
  workspaceFields: WorkspaceField[]
  login: (token: string, user: CurrentUser) => void
  logout: () => void
  selectWorkspace: (id: number, name: string, fields: WorkspaceField[]) => void
}

// Auth store, persisted to localStorage (key 'aperture-auth') so the session survives reloads.
// The API client reads token + workspaceId from here to build request headers.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      workspaceId: null,
      workspaceName: null,
      workspaceFields: [],
      // Store the session after a successful login (called by LoginPage).
      login: (token, user) => set({ token, user }),
      // Clear all auth + workspace state; triggered on sign-out and on any 401 from the API client.
      logout: () => set({ token: null, user: null, workspaceId: null, workspaceName: null, workspaceFields: [] }),
      // Set the active workspace (tenant) and its field-config; the X-Workspace-Id header follows this.
      selectWorkspace: (workspaceId, workspaceName, workspaceFields) =>
        set({ workspaceId, workspaceName, workspaceFields }),
    }),
    { name: 'aperture-auth' }
  )
)
