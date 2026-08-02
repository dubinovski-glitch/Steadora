import type { CurrentUser } from '../types'

const BASE = '/api'

// Auth endpoints. Unlike other api modules these use raw fetch (not the shared client) because
// they run before a token exists in the store, so there is nothing yet to inject.
export const authApi = {
  // Exchange username/password for a token + user profile; throws server error text on failure.
  login: async (username: string, password: string): Promise<{ token: string; user: CurrentUser }> => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, string>
      throw new Error(body.error ?? 'Login failed')
    }
    return res.json()
  },

  // Validate a stored token and re-fetch the current user (used to restore/verify a session).
  me: async (token: string): Promise<CurrentUser> => {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Session expired')
    return res.json()
  },
}
