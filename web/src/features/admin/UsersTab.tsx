import { useState, useEffect } from 'react'
import { UserPlus, Eye, EyeOff, X } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { User, Group, Role, AdminService } from '../../types'

interface Props { addToast: (msg: string) => void }

const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-[#fde8e8] text-[#c8252b]',
  manager:   'bg-[#e8f0fd] text-[#1d4ed8]',
  agent:     'bg-[#e8fdf0] text-[#1a7a40]',
  requester: 'bg-subtle text-text-secondary',
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

function emptyForm(roles: Role[]): FormState {
  return {
    externalId: '', email: '', username: '', displayName: '', title: '',
    roleId: roles[0]?.roleId ?? 0,
    isActive: true, password: '', serviceIds: [], groupIds: [],
  }
}

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

  useEffect(() => { load() }, [])

  const openNew = () => {
    setPanel('new')
    setForm(emptyForm(roles))
    setShowPw(false)
  }

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

  const closePanel = () => { setPanel(null); setForm(null) }

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => prev ? { ...prev, [k]: v } : prev)

  const toggleService = (id: number) =>
    setForm(prev => {
      if (!prev) return prev
      const has = prev.serviceIds.includes(id)
      return { ...prev, serviceIds: has ? prev.serviceIds.filter(x => x !== id) : [...prev.serviceIds, id] }
    })

  const toggleGroup = (id: number) =>
    setForm(prev => {
      if (!prev) return prev
      const has = prev.groupIds.includes(id)
      return { ...prev, groupIds: has ? prev.groupIds.filter(x => x !== id) : [...prev.groupIds, id] }
    })

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
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.username ?? '').toLowerCase().includes(q)
    const matchRole   = !filterRole   || u.roleCode === filterRole
    const matchStatus = !filterStatus || (filterStatus === 'active' ? u.isActive : !u.isActive)
    return matchSearch && matchRole && matchStatus
  })

  const inp = 'w-full px-2.5 py-1.5 border border-border-default rounded-md text-sm bg-surface focus:outline-none focus:border-border-focus disabled:opacity-50'
  const sel = inp
  const lbl = 'block text-xs font-medium text-text-secondary mb-1'

  return (
    <div className="flex gap-0 h-full -mx-6 -mt-4 overflow-hidden">

      {/* ── LEFT: list ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-border-default">

        {/* Header */}
        <div className="px-6 pt-4 pb-3 border-b border-border-default shrink-0 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Users</h2>
              <p className="text-sm text-text-muted">{users.length} users · {users.filter(u => u.isActive).length} active</p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
            >
              <UserPlus size={14} />
              Add user
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or username…"
              className="flex-1 min-w-0 px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus"
            />
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
              <option value="">All roles</option>
              {roles.map(r => <option key={r.roleId} value={r.code}>{r.displayName}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">NAME</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">USERNAME</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">ROLE</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">TEAM</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-text-muted">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-text-muted">No users found</td></tr>
              ) : filtered.map(u => {
                const isSelected = typeof panel === 'object' && panel !== null && (panel as User).userId === u.userId
                return (
                  <tr
                    key={u.userId}
                    onClick={() => openEdit(u)}
                    className={`border-b border-border-default last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-accent/5 border-l-2 border-l-accent' : 'hover:bg-hover'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {u.avatarInitials ?? u.displayName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-text-primary text-sm">{u.displayName}</div>
                          <div className="text-text-muted text-xs">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary font-mono">{u.username || <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.roleCode] ?? 'bg-subtle text-text-secondary'}`}>
                        {u.roleCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{u.groupNames ?? <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-subtle text-text-muted'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
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
        <div className="w-[420px] shrink-0 flex flex-col overflow-hidden bg-surface">

          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-default shrink-0">
            <h3 className="text-base font-semibold text-text-primary">
              {panel === 'new' ? 'New User' : (panel as User).displayName}
            </h3>
            <button onClick={closePanel} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted">
              <X size={16} />
            </button>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

            {/* Row 1: Display name + Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Display name <span className="text-red-500">*</span></label>
                <input value={form.displayName} onChange={e => setField('displayName', e.target.value)} className={inp} autoFocus />
              </div>
              <div>
                <label className={lbl}>Title</label>
                <input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. Service Desk Lead" className={inp} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={lbl}>Email <span className="text-red-500">*</span></label>
              <input value={form.email} onChange={e => setField('email', e.target.value)} type="email" className={inp} />
            </div>

            {/* Username */}
            <div>
              <label className={lbl}>Username <span className="text-red-500">*</span></label>
              <input value={form.username} onChange={e => setField('username', e.target.value)} className={inp} placeholder="Login username" />
            </div>

            {/* Password */}
            <div>
              <label className={lbl}>
                Password
                {panel === 'new' && <span className="text-red-500"> *</span>}
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
              <p className="text-xs font-medium text-text-secondary mb-2">Teams / Groups</p>
              {groups.filter(g => g.isActive).length === 0 ? (
                <p className="text-xs text-text-muted">No groups available.</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {groups.filter(g => g.isActive).map(g => (
                    <label key={g.groupId} className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={form.groupIds.includes(g.groupId)}
                        onChange={() => toggleGroup(g.groupId)}
                        className="w-4 h-4 accent-accent shrink-0"
                      />
                      <span className="text-sm text-text-primary">{g.name}</span>
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
                <span className="text-sm text-text-secondary">Active</span>
              </label>
            )}

            {/* Services */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">Services</p>
              {services.length === 0 ? (
                <p className="text-xs text-text-muted">No services available.</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {services.filter(s => s.isActive ?? true).map(s => (
                    <label key={s.serviceId} className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={form.serviceIds.includes(s.serviceId)}
                        onChange={() => toggleService(s.serviceId)}
                        className="w-4 h-4 accent-accent shrink-0"
                      />
                      <span className="text-sm text-text-primary group-hover:text-text-primary">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default shrink-0 bg-subtle">
            <button onClick={closePanel} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
            >
              {saving ? 'Saving…' : panel === 'new' ? 'Create user' : 'Save changes'}
            </button>
          </div>

        </div>
      ) : (
        <div className="w-[420px] shrink-0 flex items-center justify-center bg-surface border-l border-border-default">
          <div className="text-center text-text-muted px-8">
            <UserPlus size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a user to edit, or click <strong>Add user</strong> to create one.</p>
          </div>
        </div>
      )}

    </div>
  )
}
