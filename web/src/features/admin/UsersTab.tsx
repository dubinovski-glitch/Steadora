import { useState, useEffect } from 'react'
import { UserPlus, Eye, EyeOff, X } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { SkeletonTableRows } from '../../components/primitives/Skeleton'
import { Badge } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import type { User, Group, Role, AdminService } from '../../types'

interface Props { addToast: (msg: string) => void }

// Roles and status route through the shared Badge palette (no inline off-palette hex)
const ROLE_VARIANT: Record<string, 'critical' | 'medium' | 'success' | 'default'> = {
  admin: 'critical', manager: 'medium', agent: 'success', requester: 'default',
}

interface FormState {
  externalId: string
  email: string
  username: string
  displayName: string
  title: string
  roleId: number
  isActive: boolean
  password: string
  serviceIds: number[]
  groupIds: number[]
}

// Build a blank form for creating a new user (defaults to the first role, active).
function emptyForm(roles: Role[]): FormState {
  return {
    externalId: '', email: '', username: '', displayName: '', title: '',
    roleId: roles[0]?.roleId ?? 0,
    isActive: true, password: '', serviceIds: [], groupIds: [],
  }
}

// Build a form pre-populated from an existing user (password blank; services/groups loaded separately).
function fromUser(u: User, roles: Role[]): FormState {
  return {
    externalId: u.externalId,
    email: u.email,
    username: u.username ?? '',
    displayName: u.displayName,
    title: u.title ?? '',
    roleId: u.roleId ?? roles[0]?.roleId ?? 0,
    isActive: u.isActive,
    password: '',
    serviceIds: [],
    groupIds: [],
  }
}

// Users admin tab: searchable/filterable user list on the left with an inline create/edit
// panel on the right (role, password, group memberships, service access, active flag).
export function UsersTab({ addToast }: Props) {
  const [users, setUsers]     = useState<User[]>([])
  const [groups, setGroups]   = useState<Group[]>([])
  const [roles, setRoles]     = useState<Role[]>([])
  const [services, setServices] = useState<AdminService[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch]           = useState('')
  const [filterRole, setFilterRole]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // panel state: null = closed, 'new' = create, User = edit
  const [panel, setPanel]   = useState<null | 'new' | User>(null)
  const [form, setForm]     = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  // Fetch users plus the lookups (groups, roles, services) needed by the edit panel.
  const load = () => {
    setLoading(true)
    Promise.all([
      adminApi.getUsers(),
      adminApi.getGroups(),
      adminApi.getRoles(),
      adminApi.getServices(),
    ])
      .then(([u, g, r, s]) => {
        setUsers(u); setGroups(g); setRoles(r)
        setServices(s as AdminService[])
      })
      .finally(() => setLoading(false))
  }

  // Load data once on mount.
  useEffect(() => { load() }, [])

  // Open the panel in create mode with a blank form.
  const openNew = () => {
    setPanel('new')
    setForm(emptyForm(roles))
    setShowPw(false)
  }

  // Open the panel in edit mode, then async-load the user's service/group assignments.
  const openEdit = async (u: User) => {
    const f = fromUser(u, roles)
    setPanel(u)
    setForm(f)
    setShowPw(false)
    try {
      const [svcIds, grpIds] = await Promise.all([
        adminApi.getUserServices(u.userId),
        adminApi.getUserGroups(u.userId),
      ])
      setForm(prev => prev ? { ...prev, serviceIds: svcIds, groupIds: grpIds } : prev)
    } catch { /* non-critical */ }
  }

  // Close the edit/create panel and clear the form.
  const closePanel = () => { setPanel(null); setForm(null) }

  // Update a single field on the current form state.
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => prev ? { ...prev, [k]: v } : prev)

  // Add/remove a service id from the form's selected services.
  const toggleService = (id: number) =>
    setForm(prev => {
      if (!prev) return prev
      const has = prev.serviceIds.includes(id)
      return { ...prev, serviceIds: has ? prev.serviceIds.filter(x => x !== id) : [...prev.serviceIds, id] }
    })

  // Add/remove a group id from the form's selected groups.
  const toggleGroup = (id: number) =>
    setForm(prev => {
      if (!prev) return prev
      const has = prev.groupIds.includes(id)
      return { ...prev, groupIds: has ? prev.groupIds.filter(x => x !== id) : [...prev.groupIds, id] }
    })

  // Validate required fields, then create or update the user (plus service/group assignments
  // on edit); on success close and reload, otherwise keep the panel open with an error toast.
  const submit = async () => {
    if (!form) return
    if (!form.displayName.trim()) { addToast('Display name is required'); return }
    if (!form.email.trim())       { addToast('Email is required'); return }
    if (!form.username.trim())    { addToast('Username is required'); return }
    if (panel === 'new' && !form.password.trim()) { addToast('Password is required for new users'); return }

    setSaving(true)
    try {
      if (panel === 'new') {
        await adminApi.createUser({
          externalId:  form.externalId || form.email.split('@')[0],
          email:       form.email,
          username:    form.username,
          displayName: form.displayName,
          title:       form.title || undefined,
          roleId:      Number(form.roleId),
          password:    form.password || undefined,
          serviceIds:  form.serviceIds,
          groupIds:    form.groupIds,
        })
        addToast(`Created user ${form.displayName}`)
      } else {
        const u = panel as User
        await adminApi.updateUser(u.userId, {
          email:       form.email,
          username:    form.username,
          displayName: form.displayName,
          title:       form.title || undefined,
          roleId:      Number(form.roleId),
          isActive:    form.isActive,
          password:    form.password || undefined,
        })
        await Promise.all([
          adminApi.setUserServices(u.userId, form.serviceIds),
          adminApi.setUserGroups(u.userId, form.groupIds),
        ])
        addToast(`Updated user ${form.displayName}`)
      }
      closePanel()
      load()
    } catch (e) {
      // Keep the panel open so the user can correct the input (e.g. a duplicate username/email).
      addToast(e instanceof Error ? e.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  // Apply the search box plus role/status filters to the user list.
  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.username ?? '').toLowerCase().includes(q)
    const matchRole   = !filterRole   || u.roleCode === filterRole
    const matchStatus = !filterStatus || (filterStatus === 'active' ? u.isActive : !u.isActive)
    return matchSearch && matchRole && matchStatus
  })

  // Resolve a role code to its display name (falls back to the raw code).
  const roleLabel = (code: string) => roles.find(r => r.code === code)?.displayName ?? code

  const inp = 'w-full px-3 py-2 border-2 border-[#9aa3b2] rounded-md text-[16px] bg-surface focus:outline-none focus:border-accent disabled:opacity-50'
  const sel = inp
  const lbl = 'block text-[14px] font-medium text-text-secondary mb-1'
  const req = <span className="text-[#dc2626]"> *</span>

  return (
    <div className="flex h-full overflow-hidden bg-surface">

      {/* ── LEFT: list ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-border-default">

        {/* List header */}
        <div className="px-6 pt-4 pb-3.5 border-b border-border-default shrink-0 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[20px] font-semibold text-text-primary leading-tight">Users</h2>
              <p className="text-[15px] text-text-muted mt-0.5">{users.length} users · {users.filter(u => u.isActive).length} active</p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[16px] font-medium rounded-md transition-colors"
            >
              <UserPlus size={15} />
              Add user
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or username…"
              className="flex-1 min-w-0 px-3 py-2 border-2 border-[#9aa3b2] rounded-md text-[16px] bg-surface focus:outline-none focus:border-accent"
            />
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border-2 border-[#9aa3b2] rounded-md text-[16px] bg-surface text-text-secondary focus:outline-none focus:border-accent">
              <option value="">All roles</option>
              {roles.map(r => <option key={r.roleId} value={r.code}>{r.displayName}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border-2 border-[#9aa3b2] rounded-md text-[16px] bg-surface text-text-secondary focus:outline-none focus:border-accent">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-subtle z-10">
              <tr className="border-b border-border-default">
                {['Name', 'Username', 'Role', 'Team', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold tracking-[0.6px] text-text-tertiary uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={5} cols={5} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-text-muted">No users found</td></tr>
              ) : filtered.map(u => {
                const isSelected = typeof panel === 'object' && panel !== null && (panel as User).userId === u.userId
                return (
                  <tr
                    key={u.userId}
                    onClick={() => openEdit(u)}
                    className={`border-b border-[#eef0f4] last:border-0 cursor-pointer transition-colors ${isSelected ? '' : 'hover:bg-canvas'}`}
                    style={isSelected ? { background: 'var(--accent-subtle)', boxShadow: 'inset 2px 0 0 var(--accent)' } : undefined}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar initials={u.avatarInitials} color={u.avatarColor} name={u.displayName} size="md" />
                        <div className="min-w-0">
                          <div className="font-medium text-text-primary text-[17px] leading-tight truncate">{u.displayName}</div>
                          <div className="text-text-muted text-[14px] leading-tight truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[14px] text-text-secondary font-mono">{u.username || <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={ROLE_VARIANT[u.roleCode] ?? 'default'}>{roleLabel(u.roleCode)}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-[16px] text-text-secondary">{u.groupNames ?? <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={u.isActive ? 'success' : 'default'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RIGHT: inline form panel ── */}
      {panel !== null && form !== null ? (
        <div className="w-[430px] shrink-0 flex flex-col overflow-hidden bg-surface">

          {/* Panel header */}
          <div className="flex items-center justify-between px-[22px] py-4 border-b border-border-default shrink-0">
            <h3 className="text-[19px] font-semibold text-text-primary">
              {panel === 'new' ? 'New user' : (panel as User).displayName}
            </h3>
            <button onClick={closePanel} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted">
              <X size={16} />
            </button>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-[22px] py-[18px] flex flex-col gap-4">

            {/* Row 1: Display name + Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Display name{req}</label>
                <input value={form.displayName} onChange={e => setField('displayName', e.target.value)} className={inp} autoFocus />
              </div>
              <div>
                <label className={lbl}>Title</label>
                <input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. Service Desk Lead" className={inp} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={lbl}>Email{req}</label>
              <input value={form.email} onChange={e => setField('email', e.target.value)} type="email" className={inp} />
            </div>

            {/* Username */}
            <div>
              <label className={lbl}>Username{req}</label>
              <input value={form.username} onChange={e => setField('username', e.target.value)} className={inp} placeholder="Login username" />
            </div>

            {/* Password */}
            <div>
              <label className={lbl}>
                Password
                {panel === 'new' && req}
                {panel !== 'new' && <span className="text-text-muted font-normal"> (leave blank to keep current)</span>}
              </label>
              <div className="relative">
                <input
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  type={showPw ? 'text' : 'password'}
                  placeholder={panel === 'new' ? 'Set a password' : '••••••••'}
                  className={`${inp} pr-9`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* External ID — only on create */}
            {panel === 'new' && (
              <div>
                <label className={lbl}>External ID <span className="text-text-muted font-normal">(auto-derived from email if blank)</span></label>
                <input value={form.externalId} onChange={e => setField('externalId', e.target.value)} placeholder="e.g. jsmith" className={inp} />
              </div>
            )}

            {/* Role */}
            <div>
              <label className={lbl}>Role</label>
              <select value={form.roleId} onChange={e => setField('roleId', Number(e.target.value))} className={sel}>
                {roles.map(r => <option key={r.roleId} value={r.roleId}>{r.displayName}</option>)}
              </select>
            </div>

            {/* Group memberships */}
            <div>
              <p className="text-[14px] font-medium text-text-secondary mb-2">Teams / Groups</p>
              {groups.filter(g => g.isActive).length === 0 ? (
                <p className="text-[14px] text-text-muted">No groups available.</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1">
                  {groups.filter(g => g.isActive).map(g => (
                    <label key={g.groupId} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.groupIds.includes(g.groupId)}
                        onChange={() => toggleGroup(g.groupId)}
                        className="w-4 h-4 accent-accent shrink-0"
                      />
                      <span className="text-[16px] text-text-primary">{g.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Active toggle — edit only */}
            {panel !== 'new' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setField('isActive', e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-[16px] text-text-secondary">Active</span>
              </label>
            )}

            {/* Services */}
            <div>
              <p className="text-[14px] font-medium text-text-secondary mb-2">Services</p>
              {services.length === 0 ? (
                <p className="text-[14px] text-text-muted">No services available.</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {services.filter(s => s.isActive ?? true).map(s => (
                    <label key={s.serviceId} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.serviceIds.includes(s.serviceId)}
                        onChange={() => toggleService(s.serviceId)}
                        className="w-4 h-4 accent-accent shrink-0"
                      />
                      <span className="text-[16px] text-text-primary">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-[22px] py-3.5 border-t border-border-default shrink-0 bg-canvas">
            <button onClick={closePanel} className="px-4 py-2 text-[16px] text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-[16px] font-medium rounded-md transition-colors"
            >
              {saving ? 'Saving…' : panel === 'new' ? 'Create user' : 'Save changes'}
            </button>
          </div>

        </div>
      ) : (
        <div className="w-[430px] shrink-0 flex items-center justify-center bg-surface border-l border-border-default">
          <div className="text-center text-text-muted px-8">
            <UserPlus size={34} className="mx-auto mb-3 opacity-[0.35]" />
            <p className="text-[16px]">Select a user to edit, or click <strong>Add user</strong> to create one.</p>
          </div>
        </div>
      )}

    </div>
  )
}
