import { SkeletonRows } from '../../components/primitives/Skeleton'
import { useState, useEffect } from 'react'
import { Plus, Pencil, MoreHorizontal } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { Automation } from '../../types'

interface Props { addToast: (msg: string) => void }

// Automations admin tab: lists automation rules with enable/disable toggles and
// renders the create/edit modal. Each row shows the "when → then" description and 30-day run count.
export function AutomationsTab({ addToast }: Props) {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ automation?: Automation } | null>(null)
  const [menuOpen, setMenuOpen] = useState<number | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)

  // Fetch the full list of automation rules from the admin API.
  const load = () => {
    setLoading(true)
    adminApi.getAutomations().then(data => setAutomations(data)).finally(() => setLoading(false))
  }

  // Load rules once on mount.
  useEffect(() => { load() }, [])

  // Flip a rule's enabled state, toast the result, then reload to reflect the change.
  const handleToggle = async (automation: Automation) => {
    setToggling(automation.automationId)
    try {
      await adminApi.toggleAutomation(automation.automationId, !automation.isEnabled)
      addToast(`${!automation.isEnabled ? 'Enabled' : 'Disabled'} "${automation.name}"`)
      load()
    } catch {
      addToast('Failed to toggle automation')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="flex flex-col gap-4" onClick={() => setMenuOpen(null)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Automations</h2>
          <p className="text-sm text-text-muted">Rules that trigger automatic actions in response to system events.</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={14} />
          New rule
        </button>
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : automations.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No automation rules yet</div>
      ) : (
        <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
          {automations.map((automation, i) => (
            <div
              key={automation.automationId}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-hover transition-colors ${i > 0 ? 'border-t border-border-default' : ''}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => handleToggle(automation)}
                disabled={toggling === automation.automationId}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${automation.isEnabled ? 'bg-accent' : 'bg-border-default'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${automation.isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>

              {/* Description */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-text-primary">{automation.name}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  <span>When </span>
                  <span className="text-text-secondary">{automation.whenDescription}</span>
                  <span className="mx-1 text-text-muted">·</span>
                  <span>then </span>
                  <span className="text-text-secondary">{automation.thenDescription}</span>
                </div>
              </div>

              {/* Runs badge */}
              <div className="shrink-0 text-right">
                <div className="text-sm font-medium text-text-primary">{automation.runCount30d}</div>
                <div className="text-xs text-text-muted">runs/30d</div>
              </div>

              {/* Edit button */}
              <button
                onClick={() => setModal({ automation })}
                className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors shrink-0"
              >
                <Pencil size={13} />
              </button>

              {/* Menu */}
              <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setMenuOpen(menuOpen === automation.automationId ? null : automation.automationId)}
                  className="p-1.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors"
                >
                  <MoreHorizontal size={15} />
                </button>
                {menuOpen === automation.automationId && (
                  <div className="absolute right-0 top-8 z-20 bg-surface border border-border-default rounded-lg shadow-lg py-1 min-w-[120px]">
                    <button
                      onClick={() => { setMenuOpen(null); setModal({ automation }) }}
                      className="w-full px-3 py-1.5 text-sm text-left text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setMenuOpen(null); handleToggle(automation) }}
                      className="w-full px-3 py-1.5 text-sm text-left text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                    >
                      {automation.isEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <AutomationModal
          automation={modal.automation}
          onClose={() => setModal(null)}
          onSaved={(msg) => { addToast(msg); load(); setModal(null) }}
        />
      )}
    </div>
  )
}

// Modal form for creating or editing an automation rule (name + when/then descriptions + enabled flag).
function AutomationModal({ automation, onClose, onSaved }: { automation?: Automation; onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({
    name: automation?.name ?? '',
    whenDescription: automation?.whenDescription ?? '',
    thenDescription: automation?.thenDescription ?? '',
    isEnabled: automation?.isEnabled ?? true,
  })
  const [saving, setSaving] = useState(false)

  // Curried change handler: returns an onChange that updates the given form field.
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Validate required fields, then create or update the rule via the API and notify the parent.
  const submit = async () => {
    if (!form.name.trim() || !form.whenDescription.trim() || !form.thenDescription.trim()) return
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        whenDescription: form.whenDescription.trim(),
        thenDescription: form.thenDescription.trim(),
      }
      if (automation) {
        await adminApi.updateAutomation(automation.automationId, body)
        onSaved(`Updated automation "${form.name}"`)
      } else {
        await adminApi.createAutomation(body)
        onSaved(`Created automation "${form.name}"`)
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
          <h2 className="text-base font-semibold text-text-primary">{automation ? 'Edit automation rule' : 'New automation rule'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name <span className="text-[#c8252b]">*</span></label>
            <input value={form.name} onChange={set('name')} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              When… <span className="text-text-muted font-normal">(condition description)</span>
              <span className="text-[#c8252b]"> *</span>
            </label>
            <input
              value={form.whenDescription}
              onChange={set('whenDescription')}
              placeholder="e.g. a new incident is created with Priority = Critical"
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Then… <span className="text-text-muted font-normal">(action description)</span>
              <span className="text-[#c8252b]"> *</span>
            </label>
            <input
              value={form.thenDescription}
              onChange={set('thenDescription')}
              placeholder="e.g. assign to On-Call group and set SLA timer"
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isEnabled: !f.isEnabled }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isEnabled ? 'bg-accent' : 'bg-border-default'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-text-secondary">Enabled</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || !form.name.trim() || !form.whenDescription.trim() || !form.thenDescription.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {saving ? 'Saving…' : automation ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
