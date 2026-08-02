import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IncidentsView } from './IncidentsView'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import type { CurrentUser } from '../../types'

const getQueue = vi.fn()

vi.mock('../../api/incidents', () => ({
  incidentApi: {
    getQueue: (f: unknown) => getQueue(f),
    bulkClose: vi.fn(),
  },
}))
vi.mock('../../api/lookups', () => ({
  lookupsApi: { getPriorities: () => Promise.resolve([]) },
}))
vi.mock('../../api/client', () => ({
  api: { get: () => Promise.resolve([]) },
}))

const user: CurrentUser = {
  userId: 42, externalId: 'me', username: 'me', email: 'a@b.com',
  displayName: 'Alex', roleCode: 'admin', roleDisplayName: 'Admin', serviceIds: [],
}

const emptyPage = { items: [], total: 0, page: 1, pageSize: 25 }

describe('IncidentsView — scope filtering', () => {
  beforeEach(() => {
    getQueue.mockReset()
    getQueue.mockResolvedValue(emptyPage)
    useAuthStore.setState({ token: 't', user, workspaceId: 1 })
    window.history.replaceState(null, '', '/')
  })

  it('applies assigneeUserId when scope = mine', async () => {
    useAppStore.setState({ incidentsScope: 'mine' })
    render(<IncidentsView addToast={() => {}} />)
    await waitFor(() => expect(getQueue).toHaveBeenCalled())
    const arg = getQueue.mock.calls[getQueue.mock.calls.length - 1][0]
    expect(arg.assigneeUserId).toBe(42)
    expect(arg.myGroupsOnly).toBeUndefined()
  })

  it('applies myGroupsOnly when scope = mygroup', async () => {
    useAppStore.setState({ incidentsScope: 'mygroup' })
    render(<IncidentsView addToast={() => {}} />)
    await waitFor(() => expect(getQueue).toHaveBeenCalled())
    const arg = getQueue.mock.calls[getQueue.mock.calls.length - 1][0]
    expect(arg.myGroupsOnly).toBe(true)
    expect(arg.assigneeUserId).toBeUndefined()
  })

  it('sends neither scope filter when scope = all', async () => {
    useAppStore.setState({ incidentsScope: 'all' })
    render(<IncidentsView addToast={() => {}} />)
    await waitFor(() => expect(getQueue).toHaveBeenCalled())
    const arg = getQueue.mock.calls[getQueue.mock.calls.length - 1][0]
    expect(arg.assigneeUserId).toBeUndefined()
    expect(arg.myGroupsOnly).toBeUndefined()
  })

  it('reflects the sidebar scope as the active tab, and syncs scope back on tab change', async () => {
    useAppStore.setState({ incidentsScope: 'mine' })
    render(<IncidentsView addToast={() => {}} />)
    await waitFor(() => expect(getQueue).toHaveBeenCalled())
    // "Assigned to me" tab is the active one (accent styling)
    expect(screen.getByRole('button', { name: 'Assigned to me' }).className).toMatch(/text-accent-text/)
    // Clicking the "All" tab resets the sidebar scope to 'all'
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(useAppStore.getState().incidentsScope).toBe('all')
  })
})
