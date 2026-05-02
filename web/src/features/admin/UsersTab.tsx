import { useState, useEffect } from 'react'
import { UserPlus, Pencil } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { User, Group, Role } from '../../types'

interface Props { addToast: (msg: string) => void }

const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-[#fde8e8] text-[#c8252b]',
  manager:   'bg-[#e8f0fd] text-[#1d4ed8]',
  agent:     'bg-[#e8fdf0] text-[#1a7a40]',
  requester: 'bg-subtle text-text-secondary',
}

export function UsersTab({ addToast }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([adminApi.getUsers(), adminApi.getGroups(), adminApi.getRoles()])
      .then(([u, g, r]) => { setUsers(u); setGroups(g); setRoles(r) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter(u => {
    const matchSearch = !search || u.displayName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = !filterRole || u.roleCode === filterRole
    const matchStatus = !filterStatus || (filterStatus === 'active' ? u.isActive : !u.isActive)
    return matchSearch && matchRole && matchStatus
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Users</h2>
          <p className="text-sm text-text-muted">{users.length} users · {users.filter(u => u.isActive).length} active</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          <UserPlus size={14} />
          Invite user
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 max-w-xs px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus"
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

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-subtle">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">NAME</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">ROLE</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">TEAM</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">STATUS</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-text-muted">No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.userId} className="border-b border-border-default last:border-0 hover:bg-hover transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {u.avatarInitials ?? u.displayName[0]}
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{u.displayName}</div>
                      <div className="text-xs text-text-muted">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.roleCode] ?? 'bg-subtle text-text-secondary'}`}>
                    {u.roleCode}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{u.primaryGroupName ?? <span className="text-text-muted">—</span>}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-subtle text-text-muted'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(u)} className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors">
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <UserModal
          user={editing ?? undefined}
          groups={groups}
          roles={roles}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={(msg) => { addToast(msg); load(); setCreating(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

interface ModalProps {
  user?: User
  groups: Group[]
  roles: Role[]
  onClose: () => void
  onSaved: (msg: string) => void
}

function UserModal({ user, groups, roles, onClose, onSaved }: ModalProps) {
  const [form, setForm] = useState({
    externalId: user?.externalId ?? '',
    email: user?.email ?? '',
    displayName: user?.displayName ?? '',
    title: user?.title ?? '',
    roleId: user?.roleId ?? roles[0]?.roleId ?? 0,
    primaryGroupId: user?.primaryGroupId ?? '',
    isActive: user?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const submit = async () => {
    if (!form.displayName.trim() || !form.email.trim()) return
    setSaving(true)
    try {
      if (user) {
        await adminApi.updateUser(user.userId, {
          email: form.email,
          displayName: form.displayName,
          title: form.title || undefined,
          roleId: Number(form.roleId),
          primaryGroupId: form.primaryGroupId ? Number(form.primaryGroupId) : undefined,
          isActive: form.isActive,
        })
        onSaved(`Updated user ${form.displayName}`)
      } else {
        await adminApi.createUser({
          externalId: form.externalId || form.email.split('@')[0],
          email: form.email,
          displayName: form.displayName,
          title: form.title || undefined,
          roleId: Number(form.roleId),
          primaryGroupId: form.primaryGroupId ? Number(form.primaryGroupId) : undefined,
        })
        onSaved(`Invited ${form.displayName}`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-lg w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">{user ? 'Edit user' : 'Invite user'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Display name <span className="text-[#c8252b]">*</span></label>
              <input value={form.displayName} onChange={set('displayName')} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
              <input value={form.title} onChange={set('title')} placeholder="e.g. Service Desk Lead" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Email <span className="text-[#c8252b]">*</span></label>
            <input value={form.email} onChange={set('email')} type="email" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          {!user && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">External ID</label>
              <input value={form.externalId} onChange={set('externalId')} placeholder="Auto-derived from email if blank" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Role</label>
              <select value={form.roleId} onChange={set('roleId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
                {roles.map(r => <option key={r.roleId} value={r.roleId}>{r.displayName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Primary team</label>
              <select value={form.primaryGroupId} onChange={set('primaryGroupId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
                <option value="">None</option>
                {groups.filter(g => g.isActive).map(g => <option key={g.groupId} value={g.groupId}>{g.name}</option>)}
              </select>
            </div>
          </div>
          {user && (
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={set('isActive')} className="rounded" />
              Active
            </label>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.displayName.trim() || !form.email.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving ? 'Saving…' : user ? 'Save changes' : 'Invite user'}
          </button>
        </div>
      </div>
    </div>
  )
}
