import { useAuthStore } from '../store/authStore'

const BASE = '/api'

// Central request pipeline for all authenticated API calls. Every method in `api` funnels
// through here so auth/workspace headers, 401 logout, and error→message mapping happen once.
// Generic <T> is the expected JSON response type.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Pull the live token + active workspace straight from the store (getState, not a hook,
  // so this works outside React). These become request headers below.
  const { token, workspaceId } = useAuthStore.getState()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // Inject the bearer token and active-workspace id when present; caller headers win last.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(workspaceId ? { 'X-Workspace-Id': String(workspaceId) } : {}),
      ...init?.headers,
    },
    ...init,
  })
  // 401 = token rejected/expired: clear the session (drops user back to login) and abort.
  if (res.status === 401) {
    useAuthStore.getState().logout()
    throw new Error('Session expired. Please sign in again.')
  }
  // Any other non-2xx: map to the best human-readable error message we can find.
  if (!res.ok) {
    // Surface a server-provided error message (e.g. { error: "Username 'x' is already taken." })
    // so the UI can show something meaningful instead of a bare status code.
    let message = `API error ${res.status}: ${res.statusText}`
    try {
      const body = await res.json()
      if (body && typeof body.error === 'string' && body.error.trim()) message = body.error
      else if (body && typeof body.title === 'string' && body.title.trim()) message = body.title
    } catch { /* response had no JSON body */ }
    throw new Error(message)
  }
  // 204 No Content: nothing to parse, return undefined (cast to satisfy the generic).
  if (res.status === 204) return undefined as T
  return res.json()
}

// Thin verb helpers over `request`. JSON-encodes bodies and infers the method; all share the
// header injection + error handling above. This is the object every api/*.ts module imports.
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
