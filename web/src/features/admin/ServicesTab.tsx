import { useState, useEffect } from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { AdminService, AdminCategory, Group, SlaTier } from '../../types'

interface Props { addToast: (msg: string) => void }

const HEALTH_STYLES: Record<string, { dot: string; label: string }> = {
  healthy:  { dot: 'bg-green-500',  label: 'Healthy' },
  degraded: { dot: 'bg-amber-400',  label: 'Degraded' },
  incident: { dot: 'bg-red-500',    label: 'Incident' },
}

export function ServicesTab({ addToast }: Props) {
  const [services, setServices] = useState<AdminService[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [slaTiers, setSlaTiers] = useState<SlaTier[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ svc?: AdminService } | null>(null)
  const [menuOpen, setMenuOpen] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      adminApi.getServices(),
      adminApi.getCategories(),
      adminApi.getGroups(),
      adminApi.getSlaTiers(),
    ]).then(([svcs, cats, grps, tiers]) => {
      setServices(svcs)
      setCategories(cats)
      setGroups(grps)
      setSlaTiers(tiers)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDeactivate = async (svc: AdminService) => {
    setMenuOpen(null)
    await adminApi.updateService(svc.serviceId, {
      name: svc.name,
      categoryId: svc.categoryId,
      owningGroupId: svc.owningGroupId,
      healthCode: svc.healthCode,
      slaTierId: svc.slaTierId,
      isActive: !svc.isActive,
    })
    addToast(`${svc.isActive ? 'Deactivated' : 'Activated'} service "${svc.name}"`)
    load()
  }

  return (
    <div className="flex flex-col gap-4" onClick={() => setMenuOpen(null)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Services &amp; CIs</h2>
          <p className="text-sm text-text-muted">Manage service catalogue entries and their SLA assignments.</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={14} />
          New service
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading…</div>
      ) : services.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No services yet</div>
      ) : (
        <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default bg-subtle">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Service</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Owner</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Health</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Open</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">SLA Tier</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {services.map((svc, i) => {
                const health = HEALTH_STYLES[svc.healthCode] ?? HEALTH_STYLES.healthy
                return (
                  <tr key={svc.serviceId} className={`border-t border-border-default hover:bg-hover transition-colors ${i === 0 ? 'border-t-0' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className={`font-medium ${svc.isActive ? 'text-text-primary' : 'text-text-muted line-through'}`}>{svc.name}</span>
                        <span className="text-xs text-text-muted font-mono">{svc.slug}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{svc.categoryName ?? <span className="text-text-muted italic">—</span>}</td>
                    <td className="px-4 py-3">
                      {svc.owningGroupName ? (
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-accent-subtle text-accent-text text-[10px] font-semibold flex items-center justify-center">
                            {svc.owningGroupName.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-text-secondary text-sm">{svc.owningGroupName}</span>
                        </div>
                      ) : (
                        <span className="text-text-muted italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${health.dot}`} />
                        <span className="text-text-secondary">{health.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {svc.openIncidentCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#fde8e8] text-[#c8252b] text-xs font-medium">{svc.openIncidentCount}</span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {svc.slaTierName ? (
                        <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent-text text-xs font-medium">{svc.slaTierName}</span>
                      ) : (
                        <span className="text-text-muted italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === svc.serviceId ? null : svc.serviceId)}
                        className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {menuOpen === svc.serviceId && (
                        <div className="absolute right-4 top-10 z-20 bg-surface border border-border-default rounded-lg shadow-lg py-1 min-w-[120px]">
                          <button
                            onClick={() => { setMenuOpen(null); setModal({ svc }) }}
                            className="w-full px-3 py-1.5 text-sm text-left text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeactivate(svc)}
                            className="w-full px-3 py-1.5 text-sm text-left text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                          >
                            {svc.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <ServiceModal
          svc={modal.svc}
          categories={categories}
          groups={groups}
          slaTiers={slaTiers}
          onClose={() => setModal(null)}
          onSaved={(msg) => { addToast(msg); load(); setModal(null) }}
        />
      )}
    </div>
  )
}

interface ServiceModalProps {
  svc?: AdminService
  categories: AdminCategory[]
  groups: Group[]
  slaTiers: SlaTier[]
  onClose: () => void
  onSaved: (msg: string) => void
}

function ServiceModal({ svc, categories, groups, slaTiers, onClose, onSaved }: ServiceModalProps) {
  const [form, setForm] = useState({
    name: svc?.name ?? '',
    categoryId: String(svc?.categoryId ?? ''),
    owningGroupId: String(svc?.owningGroupId ?? ''),
    healthCode: svc?.healthCode ?? 'healthy',
    slaTierId: String(svc?.slaTierId ?? ''),
    isActive: svc?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        owningGroupId: form.owningGroupId ? Number(form.owningGroupId) : undefined,
        healthCode: form.healthCode,
        slaTierId: form.slaTierId ? Number(form.slaTierId) : undefined,
        isActive: form.isActive,
      }
      if (svc) {
        await adminApi.updateService(svc.serviceId, body)
        onSaved(`Updated service "${form.name}"`)
      } else {
        await adminApi.createService(body)
        onSaved(`Created service "${form.name}"`)
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
          <h2 className="text-base font-semibold text-text-primary">{svc ? 'Edit service' : 'New service'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name <span className="text-[#c8252b]">*</span></label>
            <input value={form.name} onChange={set('name')} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
              <select value={form.categoryId} onChange={set('categoryId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
                <option value="">— None —</option>
                {categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.displayName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Owning group</label>
              <select value={form.owningGroupId} onChange={set('owningGroupId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
                <option value="">— None —</option>
                {groups.map(g => <option key={g.groupId} value={g.groupId}>{g.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Health</label>
              <select value={form.healthCode} onChange={set('healthCode')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
                <option value="healthy">Healthy</option>
                <option value="degraded">Degraded</option>
                <option value="incident">Incident</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">SLA Tier</label>
              <select value={form.slaTierId} onChange={set('slaTierId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
                <option value="">— None —</option>
                {slaTiers.map(t => <option key={t.slaTierId} value={t.slaTierId}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? 'bg-accent' : 'bg-border-default'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-text-secondary">Active</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving ? 'Saving…' : svc ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
