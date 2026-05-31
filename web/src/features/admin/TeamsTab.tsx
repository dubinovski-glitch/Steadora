import { SkeletonRows } from '../../components/primitives/Skeleton'
import { useState, useEffect } from 'react'
import { Users, Pencil, Plus } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { Group } from '../../types'

interface Props { addToast: (msg: string) => void }

export function TeamsTab({ addToast }: Props) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Group | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    adminApi.getGroups().then(setGroups).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Teams &amp; groups</h2>
          <p className="text-sm text-text-muted">Service desk groups, on-call, and routing.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={14} />
          New team
        </button>
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : groups.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No teams yet</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {groups.map(g => (
            <div key={g.groupId} className="bg-surface rounded-lg border border-border-default shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-text-primary">{g.name}</div>
                  {g.description && <div className="text-sm text-text-muted mt-0.5">{g.description}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!g.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-subtle text-text-muted">Inactive</span>
                  )}
                  <button onClick={() => setEditing(g)} className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors">
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary border-t border-border-default pt-3">
                <Users size={14} className="text-text-muted" />
                <span>{g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TeamModal
          group={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={(msg) => { addToast(msg); load(); setCreating(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

interface ModalProps {
  group?: Group
  onClose: () => void
  onSaved: (msg: string) => void
}

function TeamModal({ group, onClose, onSaved }: ModalProps) {
  const [form, setForm] = useState({
    name: group?.name ?? '',
    description: group?.description ?? '',
    isActive: group?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (group) {
        await adminApi.updateGroup(group.groupId, { name: form.name, description: form.description || undefined, isActive: form.isActive })
        onSaved(`Updated team "${form.name}"`)
      } else {
        await adminApi.createGroup({ name: form.name, description: form.description || undefined })
        onSaved(`Created team "${form.name}"`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">{group ? 'Edit team' : 'New team'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Team name <span className="text-[#c8252b]">*</span></label>
            <input value={form.name} onChange={set('name')} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="e.g. Handles all network incidents" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus resize-none" />
          </div>
          {group && (
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={set('isActive')} className="rounded" />
              Active
            </label>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving ? 'Saving…' : group ? 'Save changes' : 'Create team'}
          </button>
        </div>
      </div>
    </div>
  )
}
