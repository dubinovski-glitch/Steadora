import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { api } from './client'
import { useAuthStore } from '../store/authStore'

function mockFetch(status: number, body: unknown, opts: { json?: boolean } = {}) {
  const json = opts.json ?? true
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: `HTTP ${status}`,
    json: json
      ? () => Promise.resolve(body)
      : () => Promise.reject(new SyntaxError('not json')),
  } as Response)
}

describe('api client', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'tok', workspaceId: 1 })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { hello: 'world' }))
    await expect(api.get('/x')).resolves.toEqual({ hello: 'world' })
  })

  it('returns undefined on 204 No Content', async () => {
    vi.stubGlobal('fetch', mockFetch(204, null))
    await expect(api.delete('/x')).resolves.toBeUndefined()
  })

  it('surfaces a server { error } message on failure', async () => {
    vi.stubGlobal('fetch', mockFetch(409, { error: "Username 'dubi' is already taken." }))
    await expect(api.post('/admin/users', {})).rejects.toThrow("Username 'dubi' is already taken.")
  })

  it('falls back to a { title } message (ASP.NET ProblemDetails)', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { title: 'Validation failed' }))
    await expect(api.post('/x', {})).rejects.toThrow('Validation failed')
  })

  it('falls back to a generic message when the body is not JSON', async () => {
    vi.stubGlobal('fetch', mockFetch(500, null, { json: false }))
    await expect(api.get('/x')).rejects.toThrow(/API error 500/)
  })

  it('logs out and throws on 401', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { error: 'nope' }))
    await expect(api.get('/x')).rejects.toThrow(/Session expired/)
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('sends Authorization and X-Workspace-Id headers', async () => {
    const f = mockFetch(200, {})
    vi.stubGlobal('fetch', f)
    await api.get('/x')
    const headers = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok')
    expect(headers['X-Workspace-Id']).toBe('1')
  })
})
