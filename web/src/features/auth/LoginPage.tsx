import { useState } from 'react'
import { authApi } from '../../api/auth'
import { fetchWorkspacesForUser, fetchWorkspace } from '../../api/workspaces'
import { useAuthStore } from '../../store/authStore'
import type { CurrentUser, Workspace } from '../../types'

// Two-step login screen: step 1 collects credentials; if the authenticated user
// belongs to multiple workspaces, step 2 lets them pick one before entering the
// app. Renders the brand header, an error banner, and the active step's form.
export function LoginPage() {
  // Step 1 — credentials
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Step 2 — workspace selection
  const [step, setStep] = useState<'credentials' | 'workspace'>('credentials')
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [pendingUser, setPendingUser] = useState<CurrentUser | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { login, selectWorkspace } = useAuthStore()

  // ── Step 1: validate credentials, fetch workspaces ─────────────────────────
  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const { token, user } = await authApi.login(username.trim(), password)
      const wss = await fetchWorkspacesForUser(token)

      if (wss.length <= 1) {
        // Single (or no) workspace — auto-select and enter app immediately
        login(token, user)
        if (wss[0]) selectWorkspace(wss[0].workspaceId, wss[0].name, wss[0].fields)
      } else {
        // Multiple workspaces — show selector dropdown
        setPendingToken(token)
        setPendingUser(user)
        setWorkspaces(wss)
        setSelectedId(String(wss[0]?.workspaceId ?? ''))
        setStep('workspace')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: load selected workspace and enter app ──────────────────────────
  const submitWorkspace = async () => {
    if (!pendingToken || !pendingUser || !selectedId) return
    setLoading(true)
    setError(null)
    try {
      const ws = await fetchWorkspace(pendingToken, Number(selectedId))
      login(pendingToken, pendingUser)
      selectWorkspace(ws.workspaceId, ws.name, ws.fields)
    } catch {
      setError('Failed to load workspace. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Return to the credentials step, clearing any pending auth/workspace state.
  const goBack = () => {
    setStep('credentials')
    setError(null)
    setPendingToken(null)
    setPendingUser(null)
    setWorkspaces([])
    setSelectedId('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle">
      <div className="w-full max-w-sm px-4">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
            A
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Aperture ITSM</h1>
          <p className="text-sm text-text-muted mt-1">Sign in to your account</p>
        </div>

        <div className="bg-surface rounded-xl border border-border-default shadow-sm p-6 flex flex-col gap-4">

          {/* Error banner */}
          {error && (
            <div className="px-3 py-2 bg-[#fde8e8] border border-[#f5c2c2] rounded-md text-sm text-[#c8252b]">
              {error}
            </div>
          )}

          {/* ── Step 1: credentials ─────────────────────────────────────────── */}
          {step === 'credentials' && (
            <form onSubmit={submitCredentials} className="flex flex-col gap-4">
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
          )}

          {/* ── Step 2: workspace dropdown ──────────────────────────────────── */}
          {step === 'workspace' && (
            <div className="flex flex-col gap-4">

              {/* Greeting */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-subtle border border-border-default">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ background: pendingUser?.avatarColor ?? 'var(--accent)' }}
                >
                  {pendingUser?.avatarInitials ?? pendingUser?.displayName?.slice(0, 2).toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary truncate">{pendingUser?.displayName}</div>
                  <div className="text-xs text-text-muted truncate">{pendingUser?.email}</div>
                </div>
              </div>

              {/* Workspace dropdown */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Select workspace
                </label>
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus bg-surface text-text-primary"
                >
                  {workspaces.map(ws => (
                    <option key={ws.workspaceId} value={ws.workspaceId}>
                      {ws.name}{ws.isDefault ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
                {workspaces.find(w => String(w.workspaceId) === selectedId)?.description && (
                  <p className="text-xs text-text-muted mt-1.5 px-0.5">
                    {workspaces.find(w => String(w.workspaceId) === selectedId)!.description}
                  </p>
                )}
              </div>

              <button
                onClick={submitWorkspace}
                disabled={loading || !selectedId}
                className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
              >
                {loading ? 'Loading workspace…' : 'Continue'}
              </button>

              <button
                onClick={goBack}
                className="text-xs text-text-muted hover:text-text-secondary text-center transition-colors"
              >
                ← Sign in as a different user
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
