import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { UsersTab } from './UsersTab'
import type { Role } from '../../types'

const roles: Role[] = [{ roleId: 4, code: 'admin', displayName: 'Admin', userCount: 1 }]

const createUser = vi.fn()
vi.mock('../../api/admin', () => ({
  adminApi: {
    getUsers: () => Promise.resolve([]),
    getGroups: () => Promise.resolve([]),
    getRoles: () => Promise.resolve(roles),
    getServices: () => Promise.resolve([]),
    createUser: (b: unknown) => createUser(b),
    getUserServices: () => Promise.resolve([]),
    getUserGroups: () => Promise.resolve([]),
    setUserServices: vi.fn(),
    setUserGroups: vi.fn(),
  },
}))

async function openCreateForm() {
  const toasts: string[] = []
  render(<UsersTab addToast={m => toasts.push(m)} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add user' })).toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: 'Add user' }))
  await waitFor(() => expect(screen.getByText('New user')).toBeInTheDocument())
  return toasts
}

describe('UsersTab — create user', () => {
  beforeEach(() => createUser.mockReset())

  it('validates required fields before calling the API', async () => {
    const toasts = await openCreateForm()
    fireEvent.click(screen.getByText('Create user'))
    await waitFor(() => expect(toasts).toContain('Display name is required'))
    expect(createUser).not.toHaveBeenCalled()
  })

  it('submits the create form with the entered field values', async () => {
    createUser.mockResolvedValue({ id: 99 })
    const toasts = await openCreateForm()

    const fieldInput = (labelText: RegExp) =>
      screen.getByText(labelText).closest('div')!.querySelector('input') as HTMLInputElement
    fireEvent.change(fieldInput(/^Display name/), { target: { value: 'Dubi User' } })
    fireEvent.change(document.querySelector('input[type="email"]') as HTMLInputElement, { target: { value: 'dubi@x.com' } })
    fireEvent.change(screen.getByPlaceholderText('Login username'), { target: { value: 'dubi' } })
    fireEvent.change(screen.getByPlaceholderText('Set a password'), { target: { value: 'pw' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Create user'))
    })

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'dubi@x.com', username: 'dubi', displayName: 'Dubi User', password: 'pw' }),
    )
    await waitFor(() => expect(toasts).toContain('Created user Dubi User'))
  })
})
