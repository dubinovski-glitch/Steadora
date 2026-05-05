import type { CurrentUser } from '../types'

const BASE = '/api'

export const authApi = {
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

  me: async (token: string): Promise<CurrentUser> => {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Session expired')
    return res.json()
  },
}
