import { SkeletonRows } from '../../components/primitives/Skeleton'
import { useState, useEffect } from 'react'
import { Shield, Pencil } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { Role } from '../../types'

interface Props { addToast: (msg: string) => void }

const ROLE_ICON_COLOR: Record<string, string> = {
  admin:     'bg-[#fde8e8] text-[#c8252b]',
  manager:   'bg-[#e8f0fd] text-[#1d4ed8]',
  agent:     'bg-[#e8fdf0] text-[#1a7a40]',
  requester: 'bg-subtle text-text-secondary',
}

// Static permission matrix — reflects enforced application logic
const AREAS = ['Incidents', 'Problems', 'Changes', 'User management', 'SLA policies', 'System configuration']
const MATRIX: Record<string, string[]> = {
  'Incidents':            ['All',  'All',  'Group', 'Own'],
  'Problems':             ['All',  'All',  'Group', '—'],
  'Changes':              ['All',  'All',  'Read',  '—'],
  'User management':      ['All',  'View', '—',     '—'],
  'SLA policies':         ['All',  'View', '—',     '—'],
  'System configuration': ['All',  '—',    '—',     '—'],
}
const ROLE_ORDER = ['admin', 'manager', 'agent', 'requester']

const VALUE_COLOR: Record<string, string> = {
  'All':   'text-[#1a7a40] font-medium',
  'Edit':  'text-[#1d4ed8]',
  'Group': 'text-[#1d4ed8]',
  'View':  'text-text-secondary',
  'Read':  'text-text-secondary',
  'Vote':  'text-[#d97706]',
  'Own':   'text-text-secondary',
  '—':     'text-text-muted',
}

// Roles & permissions admin tab: lists roles as cards (with user counts) and renders a
// static capability matrix per area. Editing a role opens RoleModal.
export function RolesTab({ addToast }: Props) {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Role | null>(null)

  // Fetch roles from the admin API, capturing any error for the retry UI.
  const load = () => {
    setLoading(true)
    setError(null)
    adminApi.getRoles()
      .then(setRoles)
      .catch(err => setError(err?.message ?? 'Failed to load roles'))
      .finally(() => setLoading(false))
  }

  // Load roles once on mount.
  useEffect(() => { load() }, [])

  // Sorted for matrix columns: admin → manager → agent → requester
  const sorted = [...roles].sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Roles &amp; permissions</h2>
          <p className="text-sm text-text-muted">Define who can do what across the system.</p>
        </div>
      </div>

      {/* Role cards */}
      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-sm text-[#c8252b] mb-3">{error}</p>
          <button onClick={load} className="px-4 py-2 text-sm border border-border-default rounded-md hover:bg-hover text-text-secondary transition-colors">
            Retry
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-12 text-center text-text-muted text-sm">No roles found.</div>
      ) : (
        <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
          {sorted.map((role, i) => (
            <div
              key={role.roleId}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-hover transition-colors ${i > 0 ? 'border-t border-border-default' : ''}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ROLE_ICON_COLOR[role.code] ?? 'bg-subtle text-text-muted'}`}>
                <Shield size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-primary">{role.displayName}</div>
                {role.description && <div className="text-sm text-text-muted mt-0.5">{role.description}</div>}
              </div>
              <div className="text-sm text-text-muted shrink-0">
                {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
              </div>
              <button
                onClick={() => setEditing(role)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-default rounded-md hover:bg-hover text-text-secondary hover:text-text-primary transition-colors"
              >
                <Pencil size={13} />
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Permission matrix */}
      {!loading && sorted.length > 0 && (
        <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border-default">
            <div className="font-medium text-text-primary">Permission matrix</div>
            <div className="text-sm text-text-muted mt-0.5">Capabilities at a glance.</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default bg-subtle">
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary">AREA</th>
                  {sorted.map(r => (
                    <th key={r.roleId} className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">
                      {r.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AREAS.map((area, i) => {
                  const row = MATRIX[area] ?? []
                  return (
                    <tr key={area} className={`${i > 0 ? 'border-t border-border-default' : ''} hover:bg-hover transition-colors`}>
                      <td className="px-5 py-3 font-medium text-text-primary">{area}</td>
                      {sorted.map((role, ci) => {
                        const idx = ROLE_ORDER.indexOf(role.code)
                        const val = row[idx] ?? '—'
                        return (
                          <td key={role.roleId} className={`px-4 py-3 ${VALUE_COLOR[val] ?? 'text-text-muted'}`}>
                            {val}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <RoleModal
          role={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { addToast(msg); load(); setEditing(null) }}
        />
      )}
    </div>
  )
}

// Modal for editing a role's display name and description (the internal code is fixed/read-only).
function RoleModal({ role, onClose, onSaved }: { role: Role; onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({ displayName: role.displayName, description: role.description ?? '' })
  const [saving, setSaving] = useState(false)

  // Curried change handler that updates the given form field.
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Validate, persist the role update, and notify the parent on success.
  const submit = async () => {
    if (!form.displayName.trim()) return
    setSaving(true)
    try {
      await adminApi.updateRole(role.roleId, {
        displayName: form.displayName,
        description: form.description || undefined,
      })
      onSaved(`Updated role "${form.displayName}"`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">Edit role</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="text-xs text-text-muted bg-subtle rounded-md px-3 py-2">
            Code: <code className="font-mono">{role.code}</code> — the code is fixed and used internally.
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Display name <span className="text-[#c8252b]">*</span></label>
            <input value={form.displayName} onChange={set('displayName')} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Describe what this role can do…" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.displayName.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
