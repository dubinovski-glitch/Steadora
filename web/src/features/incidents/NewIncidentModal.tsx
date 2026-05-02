import { useState } from 'react'
import { X } from 'lucide-react'
import { incidentApi } from '../../api/incidents'
import { useAppStore } from '../../store/appStore'

interface Props { addToast: (t: string) => void }

export function NewIncidentModal({ addToast }: Props) {
  const { setShowNewIncident } = useAppStore()
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', categoryCode: '', serviceSlug: '' })
  const [submitting, setSubmitting] = useState(false)

  const close = () => setShowNewIncident(false)

  const submit = async () => {
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      const res = await incidentApi.create({
        title: form.title,
        description: form.description || undefined,
        priorityCode: form.priority,
        categoryCode: form.categoryCode || undefined,
        serviceSlug: form.serviceSlug || undefined,
        createdByExtId: 'me',
      })
      addToast(`Created INC-${res.id} — "${form.title.slice(0, 36)}${form.title.length > 36 ? '…' : ''}"`)
      close()
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="modal-enter relative bg-surface rounded-xl shadow-lg w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">New incident</h2>
          <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Title <span className="text-[#c8252b]">*</span></label>
            <input
              autoFocus
              value={form.title}
              onChange={set('title')}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }}
              placeholder="Brief description of the issue"
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="Additional details…"
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
              <select value={form.priority} onChange={set('priority')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus bg-surface">
                {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
              <input value={form.categoryCode} onChange={set('categoryCode')} placeholder="e.g. email" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
            </div>
          </div>
          <div className="text-xs text-text-muted">SLA target: derived from priority + category · ⌘+⏎ to submit</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={close} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={submitting || !form.title.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {submitting ? 'Creating…' : 'Create incident'}
          </button>
        </div>
      </div>
    </div>
  )
}
