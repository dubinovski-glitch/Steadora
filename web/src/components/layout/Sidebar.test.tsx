import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import type { CurrentUser } from '../../types'

const adminUser: CurrentUser = {
  userId: 42, externalId: 'me', username: 'me', email: 'a@b.com',
  displayName: 'Alex Carter', roleCode: 'admin', roleDisplayName: 'Admin', serviceIds: [],
}

describe('Sidebar — Incidents sub-nodes', () => {
  beforeEach(() => {
    useAppStore.setState({ view: 'dashboard', incidentsScope: 'all', showNewIncident: false, openIncidentId: null })
    useAuthStore.setState({ token: 't', user: adminUser, workspaceName: 'WS' })
  })

  it('renders the three Incidents sub-nodes (expanded by default)', () => {
    render(<Sidebar counts={{ incidents: 3, problems: 0, changes: 0 }} />)
    expect(screen.getByText('Create New')).toBeInTheDocument()
    expect(screen.getByText('Assigned to me')).toBeInTheDocument()
    expect(screen.getByText('Assigned to my Group')).toBeInTheDocument()
  })

  it('"Assigned to me" navigates to incidents with scope=mine', () => {
    render(<Sidebar counts={{ incidents: 3, problems: 0, changes: 0 }} />)
    fireEvent.click(screen.getByText('Assigned to me'))
    const s = useAppStore.getState()
    expect(s.view).toBe('incidents')
    expect(s.incidentsScope).toBe('mine')
  })

  it('"Assigned to my Group" sets scope=mygroup', () => {
    render(<Sidebar counts={{ incidents: 3, problems: 0, changes: 0 }} />)
    fireEvent.click(screen.getByText('Assigned to my Group'))
    expect(useAppStore.getState().incidentsScope).toBe('mygroup')
  })

  it('"Create New" opens the new-incident form', () => {
    render(<Sidebar counts={{ incidents: 3, problems: 0, changes: 0 }} />)
    fireEvent.click(screen.getByText('Create New'))
    const s = useAppStore.getState()
    expect(s.view).toBe('incidents')
    expect(s.showNewIncident).toBe(true)
  })
})
