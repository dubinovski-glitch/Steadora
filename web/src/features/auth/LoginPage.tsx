import { useState } from 'react'
import { authApi } from '../../api/auth'
import { fetchWorkspacesForUser, fetchWorkspace } from '../../api/workspaces'
import { useAuthStore } from '../../store/authStore'
import type { CurrentUser, Workspace } from '../../types'

interface PendingLogin {
  token: string
  user: CurrentUser
  workspaces: Workspace[]
}

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<PendingLogin | null>(null)
  const [selecting, setSelecting] = useState(false)

  const { login, selectWorkspace } = useAuthStore()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const { token, user } = await authApi.login(username.trim(), password)
      const workspaces = await fetchWorkspacesForUser(token)

      if (workspaces.length <= 1) {
        // Auto-select the single (or default) workspace
        const ws = workspaces[0] ?? null
        login(token, user)
        if (ws) selectWorkspace(ws.workspaceId, ws.name, ws.fields)
      } else {
        // Multiple workspaces — let user choose
        setPending({ token, user, workspaces })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const choose = async (ws: Workspace) => {
    if (!pending) return
    setSelecting(true)
    try {
      // Re-fetch to get the full field config (already available in ws.fields)
      const full = await fetchWorkspace(pending.token, ws.workspaceId)
      login(pending.token, pending.user)
      selectWorkspace(full.workspaceId, full.name, full.fields)
    } catch {
      setError('Failed to load workspace. Please try again.')
      setPending(null)
    } finally {
      setSelecting(false)
    }
  }

  // ── Workspace selector step ──────────────────────────────────────────────────
  if (pending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-subtle">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">A</div>
            <h1 className="text-xl font-semibold text-text-primary">Select a workspace</h1>
            <p className="text-sm text-text-muted mt-1">
              Welcome, <strong>{pending.user.displayName}</strong>. Choose the workspace to continue.
            </p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 bg-[#fde8e8] border border-[#f5c2c2] rounded-md text-sm text-[#c8252b]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {pending.workspaces.map(ws => (
              <button
                key={ws.workspaceId}
                onClick={() => choose(ws)}
                disabled={selecting}
                className="text-left w-full px-5 py-4 bg-surface border border-border-default hover:border-accent/60 hover:shadow-sm rounded-xl transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0 group-hover:bg-accent/20 transition-colors">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary text-sm">{ws.name}</span>
                      {ws.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">Default</span>
                      )}
                    </div>
                    {ws.description && (
                      <p className="text-xs text-text-muted mt-0.5 truncate">{ws.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => { setPending(null); setError(null) }}
            className="mt-4 w-full text-xs text-text-muted hover:text-text-secondary text-center"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    )
  }

  // ── Credentials form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">A</div>
          <h1 className="text-xl font-semibold text-text-primary">Aperture ITSM</h1>
          <p className="text-sm text-text-muted mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={submit} className="bg-surface rounded-xl border border-border-default shadow-sm p-6 flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 bg-[#fde8e8] border border-[#f5c2c2] rounded-md text-sm text-[#c8252b]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors mt-1"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
