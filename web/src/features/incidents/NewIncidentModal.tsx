import { useState, useEffect } from 'react'
import { X, AlertTriangle, Info } from 'lucide-react'
import { incidentApi } from '../../api/incidents'
import { adminApi } from '../../api/admin'
import { lookupsApi } from '../../api/lookups'
import { useAppStore } from '../../store/appStore'
import { modEnter } from '../../utils/platform'
import type {
  User, Group, Service, AdminCategory, AdminSubCategory,
  Priority, ContactMethod, Severity, ResolutionCode,
} from '../../types'

interface Props { addToast: (t: string) => void }

type Tab = 'details' | 'resolution' | 'sla'

interface FormState {
  // Identification
  callerExtId: string
  contactMethodCode: string
  location: string
  // Classification
  serviceSlug: string
  categoryCode: string
  subCategoryCode: string
  ciAssetTag: string
  // Description
  title: string
  description: string
  // Prioritization
  priorityCode: string
  severityCode: string
  isMajorIncident: boolean
  // Assignment
  groupSlug: string
  assigneeExtId: string
  // Resolution (optional at creation)
  resolutionCodeCode: string
  resolutionNotes: string
}

const INITIAL_FORM: FormState = {
  callerExtId: 'me',
  contactMethodCode: '',
  location: '',
  serviceSlug: '',
  categoryCode: '',
  subCategoryCode: '',
  ciAssetTag: '',
  title: '',
  description: '',
  priorityCode: 'medium',
  severityCode: '',
  isMajorIncident: false,
  groupSlug: '',
  assigneeExtId: '',
  resolutionCodeCode: '',
  resolutionNotes: '',
}

// Modal variant of the new-incident form, organised into Details / Resolution / SLA tabs.
// Loads dropdown data on mount, cascades Service → Category → Subcategory, requires
// title + service + category + group to submit, then creates the incident and closes.
export function NewIncidentModal({ addToast }: Props) {
  const { setShowNewIncident } = useAppStore()
  const [tab, setTab] = useState<Tab>('details')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Dropdown data
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [subCategories, setSubCategories] = useState<AdminSubCategory[]>([])
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([])
  const [severities, setSeverities] = useState<Severity[]>([])
  const [resolutionCodes, setResolutionCodes] = useState<ResolutionCode[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Load all dropdown data in parallel on mount; each falls back to [] on error.
  // (The configuration-items result is fetched but intentionally skipped via the gap.)
  useEffect(() => {
    Promise.all([
      adminApi.getServices().catch(() => []),
      adminApi.getCategories().catch(() => []),
      fetch('/api/users').then(r => r.json()).catch(() => []),
      fetch('/api/users/groups').then(r => r.json()).catch(() => []),
      fetch('/api/users/configuration-items').then(r => r.json()).catch(() => []),
      lookupsApi.getPriorities().catch(() => []),
      lookupsApi.getContactMethods().catch(() => []),
      lookupsApi.getSeverities().catch(() => []),
      lookupsApi.getResolutionCodes().catch(() => []),
    ]).then(([svcs, cats, usrs, grps, , pris, cms, sevs, rcs]) => {
      setServices(svcs as Service[])
      setCategories(cats as AdminCategory[])
      setUsers(usrs as User[])
      setGroups(grps as Group[])
      setPriorities(pris as Priority[])
      setContactMethods(cms as ContactMethod[])
      setSeverities(sevs as Severity[])
      setResolutionCodes(rcs as ResolutionCode[])
    }).finally(() => setLoadingData(false))
  }, [])

  // Filter categories by selected service, but always include global categories
  // (serviceId == null) which apply to every service — otherwise the list empties.
  const filteredCategories = form.serviceSlug
    ? categories.filter(c => {
        const svc = services.find(s => s.slug === form.serviceSlug)
        return svc ? (c.serviceId === svc.serviceId || c.serviceId == null) : true
      })
    : categories

  // Update subcategories when category changes
  useEffect(() => {
    if (!form.categoryCode) { setSubCategories([]); return }
    const cat = categories.find(c => c.code === form.categoryCode)
    setSubCategories(cat?.subCategories ?? [])
    setForm(f => ({ ...f, subCategoryCode: '' }))
  }, [form.categoryCode, categories])

  // Reset category when service changes
  useEffect(() => {
    setForm(f => ({ ...f, categoryCode: '', subCategoryCode: '' }))
  }, [form.serviceSlug])

  const close = () => setShowNewIncident(false)

  // Curried onChange factory: updates the given form field from the input event
  const setField = <K extends keyof FormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  // Minimum required fields before the Create button is enabled
  const canSubmit = !!form.title.trim() && !!form.serviceSlug && !!form.categoryCode && !!form.groupSlug

  // Create the incident from the form, toast the new INC number, and close the modal
  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await incidentApi.create({
        title: form.title,
        description: form.description || undefined,
        priorityCode: form.priorityCode,
        serviceSlug: form.serviceSlug || undefined,
        categoryCode: form.categoryCode || undefined,
        subCategoryCode: form.subCategoryCode || undefined,
        ciAssetTag: form.ciAssetTag || undefined,
        callerExtId: form.callerExtId || undefined,
        contactMethodCode: form.contactMethodCode || undefined,
        location: form.location || undefined,
        groupSlug: form.groupSlug || undefined,
        assigneeExtId: form.assigneeExtId || undefined,
        severityCode: form.severityCode || undefined,
        isMajorIncident: form.isMajorIncident,
        resolutionCodeCode: form.resolutionCodeCode || undefined,
        resolutionNotes: form.resolutionNotes || undefined,
        createdByExtId: 'me',
      })
      addToast(`Created INC-${res.id} — "${form.title.slice(0, 36)}${form.title.length > 36 ? '…' : ''}"`)
      close()
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPriority = priorities.find(p => p.code === form.priorityCode)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'resolution', label: 'Resolution' },
    { id: 'sla', label: 'SLA' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="modal-enter relative bg-surface rounded-xl shadow-lg w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-text-primary">New incident</h2>
            {form.isMajorIncident && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                <AlertTriangle size={11} /> Major
              </span>
            )}
          </div>
          <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-default px-5 shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 p-5">
          {loadingData && (
            <div className="text-sm text-text-muted text-center py-4">Loading options…</div>
          )}

          {!loadingData && tab === 'details' && (
            <div className="flex flex-col gap-5">

              {/* Identification */}
              <section>
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">Reporter</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Caller / Affected User" required>
                    <select value={form.callerExtId} onChange={setField('callerExtId')} className={selectCls}>
                      <option value="">— select user —</option>
                      {users.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
                    </select>
                  </Field>
                  <Field label="Contact Method">
                    <select value={form.contactMethodCode} onChange={setField('contactMethodCode')} className={selectCls}>
                      <option value="">— none —</option>
                      {contactMethods.map(cm => <option key={cm.code} value={cm.code}>{cm.displayName}</option>)}
                    </select>
                  </Field>
                  <Field label="Location / Site" className="col-span-2">
                    <input value={form.location} onChange={setField('location')} placeholder="e.g. Building A, Remote, New York" className={inputCls} />
                  </Field>
                </div>
              </section>

              <Divider />

              {/* Classification */}
              <section>
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">Classification</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Service" required>
                    <select value={form.serviceSlug} onChange={setField('serviceSlug')} className={selectCls}>
                      <option value="">— select service —</option>
                      {services.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Category" required>
                    <select value={form.categoryCode} onChange={setField('categoryCode')} className={selectCls} disabled={!form.serviceSlug}>
                      <option value="">— select category —</option>
                      {filteredCategories.map(c => <option key={c.code} value={c.code}>{c.displayName}</option>)}
                    </select>
                  </Field>
                  <Field label="Subcategory">
                    <select value={form.subCategoryCode} onChange={setField('subCategoryCode')} className={selectCls} disabled={!form.categoryCode || subCategories.length === 0}>
                      <option value="">— select subcategory —</option>
                      {subCategories.map(s => <option key={s.code} value={s.code}>{s.displayName}</option>)}
                    </select>
                  </Field>
                  <Field label="Configuration Item (CI)">
                    <input value={form.ciAssetTag} onChange={setField('ciAssetTag')} placeholder="e.g. EXCH-NL-01" className={inputCls} />
                  </Field>
                </div>
              </section>

              <Divider />

              {/* Description */}
              <section>
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">Description</h3>
                <div className="flex flex-col gap-3">
                  <Field label="Short Description / Title" required>
                    <input
                      autoFocus
                      value={form.title}
                      onChange={setField('title')}
                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }}
                      placeholder="Brief description of the issue"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Description / Details">
                    <textarea
                      value={form.description}
                      onChange={setField('description')}
                      rows={3}
                      placeholder="Additional details, steps to reproduce, impact…"
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>
              </section>

              <Divider />

              {/* Prioritization + Assignment */}
              <section>
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">Prioritization &amp; Assignment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Priority" required>
                    <select value={form.priorityCode} onChange={setField('priorityCode')} className={selectCls}>
                      {['critical', 'high', 'medium', 'low'].map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Severity">
                    <select value={form.severityCode} onChange={setField('severityCode')} className={selectCls}>
                      <option value="">— none —</option>
                      {severities.map(s => <option key={s.code} value={s.code}>{s.displayName}</option>)}
                    </select>
                  </Field>
                  <Field label="Assignment Team" required>
                    <select value={form.groupSlug} onChange={setField('groupSlug')} className={selectCls}>
                      <option value="">— select team —</option>
                      {groups.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Assigned To">
                    <select value={form.assigneeExtId} onChange={setField('assigneeExtId')} className={selectCls}>
                      <option value="">— unassigned —</option>
                      {users.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isMajorIncident}
                        onChange={e => setForm(f => ({ ...f, isMajorIncident: e.target.checked }))}
                        className="w-4 h-4 accent-accent"
                      />
                      <span className="text-xs font-medium text-text-secondary">
                        Major Incident <span className="text-text-muted font-normal">(triggers escalation)</span>
                      </span>
                    </label>
                  </div>
                </div>
              </section>
            </div>
          )}

          {!loadingData && tab === 'resolution' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-subtle border border-border-default text-xs text-text-secondary">
                <Info size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <span>Resolution Code and Notes are <strong>required when resolving or closing</strong> this incident. You may leave them blank now and fill them in when the incident is resolved.</span>
              </div>
              <Field label="Resolution Code">
                <select value={form.resolutionCodeCode} onChange={setField('resolutionCodeCode')} className={selectCls}>
                  <option value="">— none —</option>
                  {resolutionCodes.map(rc => <option key={rc.code} value={rc.code}>{rc.displayName}</option>)}
                </select>
              </Field>
              <Field label="Resolution Notes / Description">
                <textarea
                  value={form.resolutionNotes}
                  onChange={setField('resolutionNotes')}
                  rows={5}
                  placeholder="Describe how the incident was resolved…"
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          )}

          {!loadingData && tab === 'sla' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-subtle border border-border-default text-xs text-text-secondary">
                <Info size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <span>SLA targets are calculated automatically from the selected priority and SLA policy. All other fields below are tracked by the system.</span>
              </div>

              {selectedPriority && (
                <div className="grid grid-cols-2 gap-3">
                  <SlaReadonlyField
                    label="Response SLA Target"
                    value={`${selectedPriority.defaultResponseMin} min`}
                    note="Based on priority"
                  />
                  <SlaReadonlyField
                    label="Resolution SLA Target"
                    value={`${selectedPriority.defaultResolutionMin} min`}
                    note="Based on priority"
                  />
                </div>
              )}

              <div className="mt-2">
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">Auto-tracked fields</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'First Response Date/Time', note: 'Stamped when first agent reply is recorded' },
                    { label: 'Resolved Date/Time', note: 'Stamped automatically when status changes to Resolved' },
                    { label: 'Closed Date/Time', note: 'Stamped automatically when status changes to Closed' },
                    { label: 'Total Time on Hold', note: 'Accumulated while status is On Hold' },
                    { label: 'Reopen Count', note: 'Incremented each time the incident is reopened' },
                    { label: 'Reassignment Count', note: 'Incremented each time the assignee is changed' },
                    { label: 'First Call Resolution', note: 'Auto-calculated — resolved without reassignment' },
                  ].map(f => (
                    <div key={f.label} className="flex items-start justify-between py-2 border-b border-border-default last:border-0">
                      <div>
                        <div className="text-sm text-text-primary">{f.label}</div>
                        <div className="text-xs text-text-muted">{f.note}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-subtle text-text-secondary border border-border-default whitespace-nowrap ml-3">Auto-tracked</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-default bg-subtle shrink-0">
          <span className="text-xs text-text-muted">{modEnter} to submit</span>
          <div className="flex items-center gap-2">
            <button onClick={close} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || !canSubmit}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
            >
              {submitting ? 'Creating…' : 'Create incident'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---- Small helpers ---- */

const inputCls = 'w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus'
const selectCls = `${inputCls} bg-surface`

// Labelled form field wrapper with optional required asterisk and grid span override
function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-text-secondary mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// Thin horizontal rule between form sections
function Divider() {
  return <hr className="border-border-default" />
}

// Read-only card showing an auto-derived SLA target value with an explanatory note
function SlaReadonlyField({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="p-3 rounded-lg border border-border-default bg-subtle">
      <div className="text-xs font-medium text-text-secondary mb-1">{label}</div>
      <div className="text-base font-semibold text-text-primary">{value}</div>
      <div className="text-xs text-text-muted mt-0.5">{note}</div>
    </div>
  )
}
