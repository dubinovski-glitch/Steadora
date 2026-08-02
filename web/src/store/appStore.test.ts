import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './appStore'

const reset = () =>
  useAppStore.setState({
    view: 'dashboard',
    openIncidentId: null,
    openProblemId: null,
    openChangeId: null,
    showNewIncident: false,
    showNewProblem: false,
    showNewChange: false,
    incidentsScope: 'all',
  })

describe('appStore', () => {
  beforeEach(reset)

  it('starts on dashboard with scope "all"', () => {
    const s = useAppStore.getState()
    expect(s.view).toBe('dashboard')
    expect(s.incidentsScope).toBe('all')
  })

  it('setView switches view and clears open record ids', () => {
    useAppStore.setState({ openIncidentId: 5, openProblemId: 9 })
    useAppStore.getState().setView('problems')
    const s = useAppStore.getState()
    expect(s.view).toBe('problems')
    expect(s.openIncidentId).toBeNull()
    expect(s.openProblemId).toBeNull()
  })

  it('goToIncidents sets view+scope and clears the new-incident flag', () => {
    useAppStore.setState({ showNewIncident: true, openIncidentId: 3 })
    useAppStore.getState().goToIncidents('mine')
    const s = useAppStore.getState()
    expect(s.view).toBe('incidents')
    expect(s.incidentsScope).toBe('mine')
    expect(s.showNewIncident).toBe(false)
    expect(s.openIncidentId).toBeNull()
  })

  it('goToIncidents supports the mygroup scope', () => {
    useAppStore.getState().goToIncidents('mygroup')
    expect(useAppStore.getState().incidentsScope).toBe('mygroup')
  })

  it('newIncident opens the incidents view with the create form', () => {
    useAppStore.getState().newIncident()
    const s = useAppStore.getState()
    expect(s.view).toBe('incidents')
    expect(s.showNewIncident).toBe(true)
    expect(s.openIncidentId).toBeNull()
  })

  it('setView away from incidents does NOT reset the scope (state leaks across views)', () => {
    // Documents current behaviour: scope persists even when leaving the incidents view.
    useAppStore.getState().goToIncidents('mine')
    useAppStore.getState().setView('dashboard')
    expect(useAppStore.getState().incidentsScope).toBe('mine')
  })
})
