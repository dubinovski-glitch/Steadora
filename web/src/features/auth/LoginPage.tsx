import { useState } from 'react'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const { token, user } = await authApi.login(username.trim(), password)
      login(token, user)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

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
