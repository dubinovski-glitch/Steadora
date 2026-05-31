import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CurrentUser, WorkspaceField } from '../types'

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      workspaceId: null,
      workspaceName: null,
      workspaceFields: [],
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null, workspaceId: null, workspaceName: null, workspaceFields: [] }),
      selectWorkspace: (workspaceId, workspaceName, workspaceFields) =>
        set({ workspaceId, workspaceName, workspaceFields }),
    }),
    { name: 'aperture-auth' }
  )
)
