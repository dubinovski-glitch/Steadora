import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { AdminCategory, AdminSubCategory } from '../../types'

interface Props { addToast: (msg: string) => void }

export function CategoriesTab({ addToast }: Props) {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [catModal, setCatModal] = useState<{ cat?: AdminCategory } | null>(null)
  const [subModal, setSubModal] = useState<{ sub?: AdminSubCategory; categoryId?: number } | null>(null)
  const [deletingCat, setDeletingCat] = useState<number | null>(null)
  const [deletingSub, setDeletingSub] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    adminApi.getCategories().then(data => {
      setCategories(data)
      setExpanded(new Set(data.map(c => c.categoryId)))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleDeleteCategory = async (cat: AdminCategory) => {
    if (cat.ticketCount > 0) {
      addToast(`Cannot delete "${cat.displayName}" — it has ${cat.ticketCount} incident(s)`)
      return
    }
    if (!confirm(`Delete category "${cat.displayName}" and all its subcategories?`)) return
    setDeletingCat(cat.categoryId)
    try {
      await adminApi.deleteCategory(cat.categoryId)
      addToast(`Deleted category "${cat.displayName}"`)
      load()
    } catch {
      addToast('Delete failed — category may have referenced incidents')
    } finally {
      setDeletingCat(null)
    }
  }

  const handleDeleteSubCategory = async (sub: AdminSubCategory) => {
    if (!confirm(`Delete subcategory "${sub.displayName}"?`)) return
    setDeletingSub(sub.subCategoryId)
    try {
      await adminApi.deleteSubCategory(sub.subCategoryId)
      addToast(`Deleted subcategory "${sub.displayName}"`)
      load()
    } catch {
      addToast('Delete failed')
    } finally {
      setDeletingSub(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Categories</h2>
          <p className="text-sm text-text-muted">Incident and service request classification.</p>
        </div>
        <button
          onClick={() => setCatModal({})}
          className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={14} />
          New category
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading…</div>
      ) : categories.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No categories yet</div>
      ) : (
        <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
          {categories.map((cat, i) => (
            <div key={cat.categoryId} className={i > 0 ? 'border-t border-border-default' : ''}>
              {/* Category row */}
              <div className="flex items-center gap-2 px-4 py-3 hover:bg-hover transition-colors group">
                <button onClick={() => toggle(cat.categoryId)} className="text-text-muted hover:text-text-primary">
                  {expanded.has(cat.categoryId) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div className="flex-1 flex items-center gap-3">
                  <span className="font-medium text-text-primary text-sm">{cat.displayName}</span>
                  <code className="text-xs text-text-muted bg-subtle px-1.5 py-0.5 rounded">{cat.code}</code>
                  <span className="text-xs text-text-muted">sort: {cat.sortOrder}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-subtle border border-border-default text-text-muted">
                    {cat.subCategories.length} sub | {cat.ticketCount} tickets
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSubModal({ categoryId: cat.categoryId })}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-hover rounded transition-colors"
                  >
                    <Plus size={12} /> Subcategory
                  </button>
                  <button onClick={() => setCatModal({ cat })} className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    disabled={deletingCat === cat.categoryId}
                    className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-[#c8252b] transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Subcategory rows */}
              {expanded.has(cat.categoryId) && cat.subCategories.map(sub => (
                <div key={sub.subCategoryId} className="flex items-center gap-2 px-4 py-2.5 border-t border-border-default bg-subtle hover:bg-hover transition-colors group">
                  <div className="w-5 shrink-0" />
                  <div className="flex-1 flex items-center gap-3 pl-3">
                    <span className="text-sm text-text-secondary">{sub.displayName}</span>
                    <code className="text-xs text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border-default">{sub.code}</code>
                    <span className="text-xs text-text-muted">sort: {sub.sortOrder}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSubModal({ sub, categoryId: cat.categoryId })}
                      className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteSubCategory(sub)}
                      disabled={deletingSub === sub.subCategoryId}
                      className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-[#c8252b] transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {catModal !== null && (
        <CategoryModal
          cat={catModal.cat}
          onClose={() => setCatModal(null)}
          onSaved={(msg) => { addToast(msg); load(); setCatModal(null) }}
        />
      )}

      {subModal !== null && (
        <SubCategoryModal
          sub={subModal.sub}
          defaultCategoryId={subModal.categoryId}
          categories={categories}
          onClose={() => setSubModal(null)}
          onSaved={(msg) => { addToast(msg); load(); setSubModal(null) }}
        />
      )}
    </div>
  )
}

function CategoryModal({ cat, onClose, onSaved }: { cat?: AdminCategory; onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({ code: cat?.code ?? '', displayName: cat?.displayName ?? '', sortOrder: String(cat?.sortOrder ?? 100) })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.code.trim() || !form.displayName.trim()) return
    setSaving(true)
    try {
      if (cat) {
        await adminApi.updateCategory(cat.categoryId, { code: form.code, displayName: form.displayName, sortOrder: Number(form.sortOrder) })
        onSaved(`Updated category "${form.displayName}"`)
      } else {
        await adminApi.createCategory({ code: form.code, displayName: form.displayName, sortOrder: Number(form.sortOrder) })
        onSaved(`Created category "${form.displayName}"`)
      }
    } finally {
      setSaving(false)
    }
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
            <label className="block text-xs font-medium text-text-secondary mb-1">Display name <span className="text-[#c8252b]">*</span></label>
            <input value={form.displayName} onChange={set('displayName')} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Code <span className="text-[#c8252b]">*</span></label>
            <input value={form.code} onChange={set('code')} placeholder="e.g. email" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Sort order</label>
            <input value={form.sortOrder} onChange={set('sortOrder')} type="number" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.code.trim() || !form.displayName.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving ? 'Saving…' : cat ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SubCategoryModal({ sub, defaultCategoryId, categories, onClose, onSaved }: { sub?: AdminSubCategory; defaultCategoryId?: number; categories: AdminCategory[]; onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({
    categoryId: String(sub?.categoryId ?? defaultCategoryId ?? categories[0]?.categoryId ?? ''),
    code: sub?.code ?? '',
    displayName: sub?.displayName ?? '',
    sortOrder: String(sub?.sortOrder ?? 100),
  })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.code.trim() || !form.displayName.trim()) return
    setSaving(true)
    try {
      if (sub) {
        await adminApi.updateSubCategory(sub.subCategoryId, { categoryId: Number(form.categoryId), code: form.code, displayName: form.displayName, sortOrder: Number(form.sortOrder) })
        onSaved(`Updated subcategory "${form.displayName}"`)
      } else {
        await adminApi.createSubCategory({ categoryId: Number(form.categoryId), code: form.code, displayName: form.displayName, sortOrder: Number(form.sortOrder) })
        onSaved(`Created subcategory "${form.displayName}"`)
      }
    } finally {
      setSaving(false)
    }
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
            <label className="block text-xs font-medium text-text-secondary mb-1">Parent category</label>
            <select value={form.categoryId} onChange={set('categoryId')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none">
              {categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.displayName}</option>)}
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
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Sort order</label>
            <input value={form.sortOrder} onChange={set('sortOrder')} type="number" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.code.trim() || !form.displayName.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving ? 'Saving…' : sub ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
