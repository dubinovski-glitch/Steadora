import React, { useState, useEffect } from 'react'
import { Plus, MoreHorizontal, ChevronRight, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { AdminService, AdminCategory, AdminSubCategory, Group, SlaTier } from '../../types'

interface Props { addToast: (msg: string) => void }

const HEALTH_STYLES: Record<string, { dot: string; label: string }> = {
  healthy:  { dot: 'bg-green-500',  label: 'Healthy' },
  degraded: { dot: 'bg-amber-400',  label: 'Degraded' },
  incident: { dot: 'bg-red-500',    label: 'Incident' },
}

export function ServicesTab({ addToast }: Props) {
  const [services, setServices]               = useState<AdminService[]>([])
  const [categories, setCategories]           = useState<AdminCategory[]>([])
  const [groups, setGroups]                   = useState<Group[]>([])
  const [slaTiers, setSlaTiers]               = useState<SlaTier[]>([])
  const [loading, setLoading]                 = useState(true)
  const [expandedSvcs, setExpandedSvcs]       = useState<Set<number>>(new Set())
  const [expandedCats, setExpandedCats]       = useState<Set<number>>(new Set())
  const [serviceModal, setServiceModal]       = useState<{ svc?: AdminService } | null>(null)
  const [catModal, setCatModal]               = useState<{ cat?: AdminCategory; defaultServiceId?: number } | null>(null)
  const [subModal, setSubModal]               = useState<{ sub?: AdminSubCategory; defaultCategoryId?: number } | null>(null)
  const [menuOpen, setMenuOpen]               = useState<number | null>(null)
  const [deletingCat, setDeletingCat]         = useState<number | null>(null)
  const [deletingSub, setDeletingSub]         = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([adminApi.getServices(), adminApi.getCategories(), adminApi.getGroups(), adminApi.getSlaTiers()])
      .then(([svcs, cats, grps, tiers]) => { setServices(svcs); setCategories(cats); setGroups(grps); setSlaTiers(tiers) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const toggleSvc = (id: number) => setExpandedSvcs(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleCat = (id: number) => setExpandedCats(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleDeactivate = async (svc: AdminService) => {
    setMenuOpen(null)
    await adminApi.updateService(svc.serviceId, { name: svc.name, owningGroupId: svc.owningGroupId, healthCode: svc.healthCode, slaTierId: svc.slaTierId, isActive: !svc.isActive })
    addToast(`${svc.isActive ? 'Deactivated' : 'Activated'} "${svc.name}"`)
    load()
  }

  const handleDeleteCategory = async (cat: AdminCategory) => {
    if (cat.ticketCount > 0) { addToast(`Cannot delete "${cat.displayName}" — ${cat.ticketCount} ticket(s) linked`); return }
    if (!confirm(`Delete category "${cat.displayName}" and its subcategories?`)) return
    setDeletingCat(cat.categoryId)
    try { await adminApi.deleteCategory(cat.categoryId); addToast(`Deleted "${cat.displayName}"`); load() }
    catch { addToast('Delete failed') }
    finally { setDeletingCat(null) }
  }

  const handleDeleteSubCategory = async (sub: AdminSubCategory) => {
    if (!confirm(`Delete subcategory "${sub.displayName}"?`)) return
    setDeletingSub(sub.subCategoryId)
    try { await adminApi.deleteSubCategory(sub.subCategoryId); addToast(`Deleted "${sub.displayName}"`); load() }
    catch { addToast('Delete failed') }
    finally { setDeletingSub(null) }
  }

  return (
    <div className="flex flex-col gap-4" onClick={() => setMenuOpen(null)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Services &amp; Catalogue</h2>
          <p className="text-sm text-text-muted">Manage business services and their category hierarchy.</p>
        </div>
        <button onClick={() => setServiceModal({})} className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors">
          <Plus size={14} /> New service
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading…</div>
      ) : services.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No services yet</div>
      ) : (
        <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
          <table className="w-full zebra-table">
            <thead>
              <tr className="border-b border-border-default bg-subtle">
                <th className="w-8 px-3 py-2.5" />
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Service</th>
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
                const isExpanded = expandedSvcs.has(svc.serviceId)
                const svcCats = categories.filter(c => c.serviceId === svc.serviceId)
                return (
                  <React.Fragment key={svc.serviceId}>
                    <tr className={`border-t border-border-default hover:bg-hover transition-colors ${i === 0 ? 'border-t-0' : ''}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSvc(svc.serviceId)} className="text-text-muted hover:text-text-primary transition-colors">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className={`font-medium ${svc.isActive ? 'text-text-primary' : 'text-text-muted line-through'}`}>{svc.name}</span>
                          <span className="text-text-muted font-mono">{svc.slug}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {svc.owningGroupName ? (
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-accent-subtle text-accent-text text-[17px] font-semibold flex items-center justify-center">
                              {svc.owningGroupName.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="text-text-secondary">{svc.owningGroupName}</span>
                          </div>
                        ) : <span className="text-text-muted italic">—</span>}
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
                        ) : <span className="text-text-muted">0</span>}
                      </td>
                      <td className="px-4 py-3">
                        {svc.slaTierName ? (
                          <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent-text text-xs font-medium">{svc.slaTierName}</span>
                        ) : <span className="text-text-muted italic">—</span>}
                      </td>
                      <td className="px-4 py-3 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setMenuOpen(menuOpen === svc.serviceId ? null : svc.serviceId)} className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors">
                          <MoreHorizontal size={15} />
                        </button>
                        {menuOpen === svc.serviceId && (
                          <div className="absolute right-4 top-10 z-20 bg-surface border border-border-default rounded-lg shadow-lg py-1 min-w-[120px]">
                            <button onClick={() => { setMenuOpen(null); setServiceModal({ svc }) }} className="w-full px-3 py-1.5 text-left hover:bg-hover transition-colors">Edit</button>
                            <button onClick={() => handleDeactivate(svc)} className="w-full px-3 py-1.5 text-left hover:bg-hover transition-colors">{svc.isActive ? 'Deactivate' : 'Activate'}</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-[var(--bg-canvas)]">
                          <div className="border-t border-border-default">
                            {svcCats.length === 0 ? (
                              <div className="flex items-center gap-3 px-12 py-3 text-text-muted italic">No categories yet</div>
                            ) : svcCats.map(cat => (
                              <div key={cat.categoryId} className="border-b border-border-default last:border-0">
                                <div className="flex items-center gap-2 pl-12 pr-4 py-2.5 hover:bg-hover transition-colors group">
                                  <button onClick={() => toggleCat(cat.categoryId)} className="text-text-muted hover:text-text-primary shrink-0">
                                    {expandedCats.has(cat.categoryId) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                  </button>
                                  <span className="flex-1 font-medium text-text-primary">{cat.displayName}</span>
                                  <code className="text-text-muted bg-subtle px-1.5 py-0.5 rounded text-xs">{cat.code}</code>
                                  <span className="text-text-muted text-xs">{cat.subCategories.length} sub</span>
                                  {cat.ticketCount > 0 && <span className="text-text-muted text-xs">{cat.ticketCount} tickets</span>}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setSubModal({ defaultCategoryId: cat.categoryId })} className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-hover rounded transition-colors">
                                      <Plus size={11} /> Subcategory
                                    </button>
                                    <button onClick={() => setCatModal({ cat })} className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors"><Pencil size={13} /></button>
                                    <button onClick={() => handleDeleteCategory(cat)} disabled={deletingCat === cat.categoryId} className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-[#c8252b] transition-colors disabled:opacity-50"><Trash2 size={13} /></button>
                                  </div>
                                </div>
                                {expandedCats.has(cat.categoryId) && cat.subCategories.map(sub => (
                                  <div key={sub.subCategoryId} className="flex items-center gap-2 pl-20 pr-4 py-2 bg-subtle hover:bg-hover transition-colors group border-t border-border-default">
                                    <span className="flex-1 text-text-secondary">{sub.displayName}</span>
                                    <code className="text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border-default text-xs">{sub.code}</code>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => setSubModal({ sub, defaultCategoryId: cat.categoryId })} className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors"><Pencil size={13} /></button>
                                      <button onClick={() => handleDeleteSubCategory(sub)} disabled={deletingSub === sub.subCategoryId} className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-[#c8252b] transition-colors disabled:opacity-50"><Trash2 size={13} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                            <button onClick={() => setCatModal({ defaultServiceId: svc.serviceId })} className="flex items-center gap-1.5 pl-12 px-4 py-2.5 text-accent hover:text-accent-hover transition-colors w-full text-left border-t border-border-default">
                              <Plus size={13} /> Add category
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {serviceModal !== null && (
        <ServiceModal svc={serviceModal.svc} groups={groups} slaTiers={slaTiers} onClose={() => setServiceModal(null)} onSaved={msg => { addToast(msg); load(); setServiceModal(null) }} />
      )}
      {catModal !== null && (
        <CategoryModal cat={catModal.cat} defaultServiceId={catModal.defaultServiceId} services={services} onClose={() => setCatModal(null)} onSaved={msg => { addToast(msg); load(); setCatModal(null) }} />
      )}
      {subModal !== null && (
        <SubCategoryModal sub={subModal.sub} defaultCategoryId={subModal.defaultCategoryId} categories={categories} onClose={() => setSubModal(null)} onSaved={msg => { addToast(msg); load(); setSubModal(null) }} />
      )}
    </div>
  )
}

// ServiceModal — no Category field
interface ServiceModalProps { svc?: AdminService; groups: Group[]; slaTiers: SlaTier[]; onClose: () => void; onSaved: (msg: string) => void }
function ServiceModal({ svc, groups, slaTiers, onClose, onSaved }: ServiceModalProps) {
  const [form, setForm] = useState({ name: svc?.name ?? '', owningGroupId: String(svc?.owningGroupId ?? ''), healthCode: svc?.healthCode ?? 'healthy', slaTierId: String(svc?.slaTierId ?? ''), isActive: svc?.isActive ?? true })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const body = { name: form.name.trim(), owningGroupId: form.owningGroupId ? Number(form.owningGroupId) : undefined, healthCode: form.healthCode, slaTierId: form.slaTierId ? Number(form.slaTierId) : undefined }
      if (svc) { await adminApi.updateService(svc.serviceId, { ...body, isActive: form.isActive }); onSaved(`Updated service "${form.name}"`) }
      else { await adminApi.createService(body); onSaved(`Created service "${form.name}"`) }
    } finally { setSaving(false) }
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
              <label className="block text-xs font-medium text-text-secondary mb-1">Owning group</label>
              <select value={form.owningGroupId} onChange={set('owningGroupId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
                <option value="">— None —</option>
                {groups.map(g => <option key={g.groupId} value={g.groupId}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Health</label>
              <select value={form.healthCode} onChange={set('healthCode')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
                <option value="healthy">Healthy</option>
                <option value="degraded">Degraded</option>
                <option value="incident">Incident</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">SLA Tier</label>
            <select value={form.slaTierId} onChange={set('slaTierId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
              <option value="">— None —</option>
              {slaTiers.map(t => <option key={t.slaTierId} value={t.slaTierId}>{t.name}</option>)}
            </select>
          </div>
          {svc && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? 'bg-accent' : 'bg-border-default'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-text-secondary">Active</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">{saving ? 'Saving…' : svc ? 'Save changes' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}

// CategoryModal — with Service dropdown
interface CategoryModalProps { cat?: AdminCategory; defaultServiceId?: number; services: AdminService[]; onClose: () => void; onSaved: (msg: string) => void }
function CategoryModal({ cat, defaultServiceId, services, onClose, onSaved }: CategoryModalProps) {
  const [form, setForm] = useState({ serviceId: String(cat?.serviceId ?? defaultServiceId ?? ''), code: cat?.code ?? '', displayName: cat?.displayName ?? '' })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const submit = async () => {
    if (!form.code.trim() || !form.displayName.trim()) return
    setSaving(true)
    try {
      const body = { code: form.code, displayName: form.displayName, serviceId: form.serviceId ? Number(form.serviceId) : undefined }
      if (cat) { await adminApi.updateCategory(cat.categoryId, body); onSaved(`Updated category "${form.displayName}"`) }
      else { await adminApi.createCategory(body); onSaved(`Created category "${form.displayName}"`) }
    } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-lg w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">{cat ? 'Edit category' : 'New category'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Service</label>
            <select value={form.serviceId} onChange={set('serviceId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
              <option value="">— Unassigned —</option>
              {services.filter(s => s.isActive).map(s => <option key={s.serviceId} value={s.serviceId}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Display name <span className="text-[#c8252b]">*</span></label>
            <input value={form.displayName} onChange={set('displayName')} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Code <span className="text-[#c8252b]">*</span></label>
            <input value={form.code} onChange={set('code')} placeholder="e.g. email" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus font-mono" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.code.trim() || !form.displayName.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">{saving ? 'Saving…' : cat ? 'Save changes' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}

// SubCategoryModal — category dropdown
interface SubCategoryModalProps { sub?: AdminSubCategory; defaultCategoryId?: number; categories: AdminCategory[]; onClose: () => void; onSaved: (msg: string) => void }
function SubCategoryModal({ sub, defaultCategoryId, categories, onClose, onSaved }: SubCategoryModalProps) {
  const [form, setForm] = useState({ categoryId: String(sub?.categoryId ?? defaultCategoryId ?? categories[0]?.categoryId ?? ''), code: sub?.code ?? '', displayName: sub?.displayName ?? '' })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const submit = async () => {
    if (!form.code.trim() || !form.displayName.trim() || !form.categoryId) return
    setSaving(true)
    try {
      const body = { categoryId: Number(form.categoryId), code: form.code, displayName: form.displayName }
      if (sub) { await adminApi.updateSubCategory(sub.subCategoryId, body); onSaved(`Updated subcategory "${form.displayName}"`) }
      else { await adminApi.createSubCategory(body); onSaved(`Created subcategory "${form.displayName}"`) }
    } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-lg w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">{sub ? 'Edit subcategory' : 'New subcategory'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
            <select value={form.categoryId} onChange={set('categoryId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
              {categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.serviceName ? `${c.serviceName} / ${c.displayName}` : c.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Display name <span className="text-[#c8252b]">*</span></label>
            <input value={form.displayName} onChange={set('displayName')} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Code <span className="text-[#c8252b]">*</span></label>
            <input value={form.code} onChange={set('code')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus font-mono" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.code.trim() || !form.displayName.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">{saving ? 'Saving…' : sub ? 'Save changes' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}
