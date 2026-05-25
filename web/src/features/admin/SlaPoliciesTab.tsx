import { useState, useEffect } from 'react'
import { Plus, Bell } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { SlaTier, SlaTierTarget } from '../../types'

interface Props { addToast: (msg: string) => void }

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}

function parseMinutes(value: string): number {
  const v = value.trim().toLowerCase()
  if (v.endsWith('d')) return parseInt(v) * 1440
  if (v.endsWith('h')) return parseInt(v) * 60
  if (v.endsWith('m')) return parseInt(v)
  return parseInt(v) || 0
}

const ESCALATION_ROWS = [
  { pct: '50%', action: 'Notify assignee' },
  { pct: '80%', action: 'Notify assignee + group manager' },
  { pct: '100%', action: 'Notify all up to service owner' },
]

export function SlaPoliciesTab({ addToast }: Props) {
  const [tiers, setTiers] = useState<SlaTier[]>([])
  const [selected, setSelected] = useState<SlaTier | null>(null)
  const [loading, setLoading] = useState(true)
  const [editForm, setEditForm] = useState<Partial<SlaTier>>({})
  const [editTargets, setEditTargets] = useState<SlaTierTarget[]>([])
  const [savingMeta, setSavingMeta] = useState(false)
  const [savingTargets, setSavingTargets] = useState(false)
  const [newTierModal, setNewTierModal] = useState(false)

  const load = () => {
    setLoading(true)
    adminApi.getSlaTiers().then(data => {
      setTiers(data)
      if (data.length > 0 && !selected) selectTier(data[0])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const selectTier = (tier: SlaTier) => {
    setSelected(tier)
    setEditForm({ ...tier })
    setEditTargets(tier.targets.map(t => ({ ...t })))
  }

  const handleSaveMeta = async () => {
    if (!selected) return
    setSavingMeta(true)
    try {
      await adminApi.updateSlaTier(selected.slaTierId, {
        name: editForm.name ?? selected.name,
        description: editForm.description,
        isActive: editForm.isActive ?? selected.isActive,
        calculate247: editForm.calculate247 ?? selected.calculate247,
        autoEscalate: editForm.autoEscalate ?? selected.autoEscalate,
      })
      addToast('SLA policy saved')
      load()
    } catch {
      addToast('Failed to save SLA policy')
    } finally {
      setSavingMeta(false)
    }
  }

  const handleSaveTargets = async () => {
    if (!selected) return
    setSavingTargets(true)
    try {
      await adminApi.saveSlaTierTargets(selected.slaTierId, editTargets.map(t => ({
        priorityId: t.priorityId,
        responseMinutes: t.responseMinutes,
        resolutionMinutes: t.resolutionMinutes,
      })))
      addToast('SLA targets saved')
      load()
    } catch {
      addToast('Failed to save SLA targets')
    } finally {
      setSavingTargets(false)
    }
  }

  const setTargetField = (priorityId: number, field: 'responseMinutes' | 'resolutionMinutes', raw: string) => {
    const minutes = parseMinutes(raw)
    setEditTargets(prev => prev.map(t => t.priorityId === priorityId ? { ...t, [field]: minutes } : t))
  }

  if (loading) return <div className="py-12 text-center text-text-muted">Loading…</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">SLA policies</h2>
          <p className="text-sm text-text-muted">Configure service-level targets and escalation rules per tier.</p>
        </div>
        <button
          onClick={() => setNewTierModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={14} />
          New policy
        </button>
      </div>

      <div className="flex gap-4 min-h-0">
        {/* Left: tier list */}
        <div className="w-56 shrink-0 flex flex-col gap-2">
          {tiers.map(tier => (
            <button
              key={tier.slaTierId}
              onClick={() => selectTier(tier)}
              className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${
                selected?.slaTierId === tier.slaTierId
                  ? 'border-accent bg-accent-subtle'
                  : 'border-border-default bg-surface hover:bg-hover'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-text-primary">{tier.name}</span>
                <span className={`text-[17px] px-1.5 py-0.5 rounded-full font-medium ${tier.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-subtle text-text-muted'}`}>
                  {tier.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {tier.description && (
                <p className="text-xs text-text-muted line-clamp-2">{tier.description}</p>
              )}
              <div className="mt-1.5 text-xs text-text-muted">{tier.targets.length} targets</div>
            </button>
          ))}
        </div>

        {/* Right: detail panel */}
        {selected ? (
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Meta section */}
            <div className="bg-surface rounded-lg border border-border-default p-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
                  <input
                    value={editForm.name ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Calculate against</label>
                  <select
                    value={editForm.calculate247 ? '247' : 'bh'}
                    onChange={e => setEditForm(f => ({ ...f, calculate247: e.target.value === '247' }))}
                    className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none"
                  >
                    <option value="247">24×7</option>
                    <option value="bh">Business hours</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                <input
                  value={editForm.description ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus"
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editForm.isActive ? 'bg-accent' : 'bg-border-default'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${editForm.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-text-secondary">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, autoEscalate: !f.autoEscalate }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editForm.autoEscalate ? 'bg-accent' : 'bg-border-default'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${editForm.autoEscalate ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-text-secondary">Auto-escalate at 80%</span>
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveMeta}
                  disabled={savingMeta}
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                >
                  {savingMeta ? 'Saving…' : 'Save policy'}
                </button>
              </div>
            </div>

            {/* Targets table */}
            <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                <span className="text-sm font-semibold text-text-primary">Targets by priority</span>
                <button
                  onClick={handleSaveTargets}
                  disabled={savingTargets}
                  className="px-3 py-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors"
                >
                  {savingTargets ? 'Saving…' : 'Save targets'}
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default bg-subtle">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Response target</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Resolution target</th>
                  </tr>
                </thead>
                <tbody>
                  {editTargets.map((t, i) => (
                    <tr key={t.priorityId} className={i > 0 ? 'border-t border-border-default' : ''}>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium text-text-primary">{t.priorityDisplayName}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          defaultValue={formatMinutes(t.responseMinutes)}
                          onBlur={e => setTargetField(t.priorityId, 'responseMinutes', e.target.value)}
                          className="w-24 px-2 py-1 border border-border-default rounded text-sm focus:outline-none focus:border-border-focus font-mono"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          defaultValue={formatMinutes(t.resolutionMinutes)}
                          onBlur={e => setTargetField(t.priorityId, 'resolutionMinutes', e.target.value)}
                          className="w-24 px-2 py-1 border border-border-default rounded text-sm focus:outline-none focus:border-border-focus font-mono"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notification escalation */}
            <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default">
                <Bell size={14} className="text-text-muted" />
                <span className="text-sm font-semibold text-text-primary">Notification escalation</span>
                <span className="text-xs text-text-muted ml-1">(read-only)</span>
              </div>
              <div className="divide-y divide-border-default">
                {ESCALATION_ROWS.map(row => (
                  <div key={row.pct} className="flex items-center gap-4 px-4 py-2.5">
                    <span className="text-xs font-mono font-semibold text-text-muted w-12 shrink-0">At {row.pct}</span>
                    <span className="text-sm text-text-secondary">→ {row.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
            Select a policy to view details
          </div>
        )}
      </div>

      {newTierModal && (
        <NewTierModal
          onClose={() => setNewTierModal(false)}
          onSaved={(msg, tier) => {
            addToast(msg)
            setNewTierModal(false)
            adminApi.getSlaTiers().then(data => {
              setTiers(data)
              const created = data.find(t => t.slaTierId === tier)
              if (created) selectTier(created)
            })
          }}
        />
      )}
    </div>
  )
}

function NewTierModal({ onClose, onSaved }: { onClose: () => void; onSaved: (msg: string, id: number) => void }) {
  const [form, setForm] = useState({ name: '', description: '', calculate247: true, autoEscalate: true })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const result = await adminApi.createSlaTier({
        name: form.name.trim(),
        description: form.description || undefined,
        calculate247: form.calculate247,
        autoEscalate: form.autoEscalate,
      })
      onSaved(`Created SLA policy "${form.name}"`, result.id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-lg w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">New SLA policy</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name <span className="text-[#c8252b]">*</span></label>
            <input value={form.name} onChange={set('name')} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <input value={form.description} onChange={set('description')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, calculate247: !f.calculate247 }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.calculate247 ? 'bg-accent' : 'bg-border-default'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.calculate247 ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-text-secondary">Calculate against 24×7</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
