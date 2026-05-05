import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import { incidentApi } from '../../api/incidents'
import { adminApi } from '../../api/admin'
import { lookupsApi } from '../../api/lookups'
import { api } from '../../api/client'
import { useAppStore } from '../../store/appStore'
import type {
  User, Group, Service, AdminCategory, AdminSubCategory,
  Priority, ContactMethod, Severity, ResolutionCode,
} from '../../types'

interface Props { addToast: (t: string) => void }
type Tab = 'details' | 'resolution' | 'sla'

const INCIDENT_STATUSES = [
  { code: 'new',      label: 'New' },
  { code: 'progress', label: 'In Progress' },
  { code: 'pending',  label: 'Pending' },
  { code: 'resolved', label: 'Resolved' },
  { code: 'closed',   label: 'Closed' },
]

interface FormState {
  callerExtId: string
  contactMethodCode: string
  location: string
  serviceSlug: string
  categoryCode: string
  subCategoryCode: string
  ciAssetTag: string
  title: string
  description: string
  priorityCode: string
  severityCode: string
  isMajorIncident: boolean
  groupSlug: string
  assigneeExtId: string
  statusCode: string
  resolutionCodeCode: string
  resolutionNotes: string
}

const INITIAL: FormState = {
  callerExtId: '',
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
  statusCode: 'new',
  resolutionCodeCode: '',
  resolutionNotes: '',
}

export function NewIncidentForm({ addToast }: Props) {
  const { setShowNewIncident } = useAppStore()
  const [tab, setTab] = useState<Tab>('details')
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)

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

  useEffect(() => {
    Promise.all([
      adminApi.getServices().catch(() => []),
      adminApi.getCategories().catch(() => []),
      api.get<User[]>('/users').catch(() => []),
      api.get<Group[]>('/users/groups').catch(() => []),
      lookupsApi.getPriorities().catch(() => []),
      lookupsApi.getContactMethods().catch(() => []),
      lookupsApi.getSeverities().catch(() => []),
      lookupsApi.getResolutionCodes().catch(() => []),
    ]).then(([svcs, cats, usrs, grps, pris, cms, sevs, rcs]) => {
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

  const filteredCategories = form.serviceSlug
    ? categories.filter(c => {
        const svc = services.find(s => s.slug === form.serviceSlug)
        return svc ? c.serviceId === svc.serviceId : true
      })
    : categories

  useEffect(() => {
    if (!form.categoryCode) { setSubCategories([]); return }
    const cat = categories.find(c => c.code === form.categoryCode)
    setSubCategories(cat?.subCategories ?? [])
    setForm(f => ({ ...f, subCategoryCode: '' }))
  }, [form.categoryCode, categories])

  useEffect(() => {
    setForm(f => ({ ...f, categoryCode: '', subCategoryCode: '' }))
  }, [form.serviceSlug])

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const close = () => setShowNewIncident(false)

  const setField = <K extends keyof FormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValidationErrors([])
      setForm(f => ({ ...f, [k]: e.target.value }))
    }

  const validate = (): string[] => {
    const missing: string[] = []
    if (!form.callerExtId)        missing.push('Caller / Affected User')
    if (!form.serviceSlug)        missing.push('Service')
    if (!form.categoryCode)       missing.push('Category')
    if (!form.groupSlug)          missing.push('Assignment Group')
    if (!form.title.trim())       missing.push('Short Description')
    return missing
  }

  const submit = async () => {
    const missing = validate()
    if (missing.length > 0) {
      setValidationErrors(missing)
      return
    }
    setValidationErrors([])
    setSubmitting(true)
    try {
      const res = await incidentApi.create({
        title: form.title,
        description: form.description || undefined,
        priorityCode: form.priorityCode,
        statusCode: form.statusCode,
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
    <div className="flex flex-col h-full -mx-6 -mt-4">

      {/* ── Title bar ── */}
      <div className="bg-surface border-b border-border-default px-6 pt-4 pb-3 shrink-0">
        <div className="text-xs text-text-muted mb-2">
          <button onClick={close} className="hover:text-text-primary transition-colors">Incidents</button>
          <span className="mx-1">›</span>
          <span className="text-text-primary">New Incident</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Create New Incident</h1>
            <p className="text-xs text-text-muted mt-0.5">
              Incident ID will be auto-generated
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={close}
              className="px-4 py-2 text-sm border border-border-default rounded-md text-text-secondary hover:bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-semibold rounded-md transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Incident'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-3">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] px-6 py-5">

        {loadingData && (
          <div className="text-sm text-text-muted text-center py-12">Loading form data…</div>
        )}

        {validationErrors.length > 0 && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-300 text-sm text-red-800">
            <p className="font-semibold mb-1">Please fill in all required fields before submitting:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {validationErrors.map(f => <li key={f}>{f}</li>)}
            </ul>
          </div>
        )}

        {/* ── DETAILS TAB ── */}
        {!loadingData && tab === 'details' && (
          <div className="grid grid-cols-2 gap-4 h-full">

            {/* LEFT — all fields */}
            <Card>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">

                <Field label="Created By">
                  <div className={`${sml} bg-subtle text-text-muted cursor-default select-none`}>
                    Current user (you)
                  </div>
                </Field>
                <Field label="Caller / Affected User" required>
                  <select value={form.callerExtId} onChange={setField('callerExtId')} className={sml}>
                    <option value="">— select —</option>
                    {users.map(u => (
                      <option key={u.externalId} value={u.externalId}>{u.displayName}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select value={form.statusCode} onChange={setField('statusCode')} className={sml}>
                    {INCIDENT_STATUSES.map(s => (
                      <option key={s.code} value={s.code}>{s.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Contact Method">
                  <select value={form.contactMethodCode} onChange={setField('contactMethodCode')} className={sml}>
                    <option value="">— none —</option>
                    {contactMethods.map(cm => (
                      <option key={cm.code} value={cm.code}>{cm.displayName}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Priority" required>
                  <select value={form.priorityCode} onChange={setField('priorityCode')} className={sml}>
                    {['critical', 'high', 'medium', 'low'].map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Severity">
                  <select value={form.severityCode} onChange={setField('severityCode')} className={sml}>
                    <option value="">— none —</option>
                    {severities.map(s => (
                      <option key={s.code} value={s.code}>{s.displayName}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Assignment Group" required>
                  <select value={form.groupSlug} onChange={setField('groupSlug')} className={sml}>
                    <option value="">— select group —</option>
                    {groups.map(g => (
                      <option key={g.slug} value={g.slug}>{g.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Assigned To">
                  <select value={form.assigneeExtId} onChange={setField('assigneeExtId')} className={sml}>
                    <option value="">— auto-assign —</option>
                    {users.map(u => (
                      <option key={u.externalId} value={u.externalId}>{u.displayName}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Service" required>
                  <select value={form.serviceSlug} onChange={setField('serviceSlug')} className={sml}>
                    <option value="">— select —</option>
                    {services.map(s => (
                      <option key={s.slug} value={s.slug}>{s.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Category" required>
                  <select
                    value={form.categoryCode}
                    onChange={setField('categoryCode')}
                    className={sml}
                    disabled={!form.serviceSlug}
                  >
                    <option value="">— select —</option>
                    {filteredCategories.map(c => (
                      <option key={c.code} value={c.code}>{c.displayName}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Subcategory">
                  <select
                    value={form.subCategoryCode}
                    onChange={setField('subCategoryCode')}
                    className={sml}
                    disabled={!form.categoryCode || subCategories.length === 0}
                  >
                    <option value="">— none —</option>
                    {subCategories.map(s => (
                      <option key={s.code} value={s.code}>{s.displayName}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Configuration Item (CI)">
                  <input
                    value={form.ciAssetTag}
                    onChange={setField('ciAssetTag')}
                    placeholder="e.g. EXCH-NL-01"
                    className={sml}
                  />
                </Field>

                <Field label="Location / Site">
                  <input
                    value={form.location}
                    onChange={setField('location')}
                    placeholder="e.g. HQ Floor 4, Remote"
                    className={sml}
                  />
                </Field>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isMajorIncident}
                      onChange={e => setForm(f => ({ ...f, isMajorIncident: e.target.checked }))}
                      className="w-3.5 h-3.5 accent-accent"
                    />
                    <span className="text-xs text-text-secondary">Flag as Major Incident</span>
                  </label>
                </div>

              </div>
            </Card>

            {/* RIGHT — Short Description + Description */}
            <Card className="flex flex-col">
              <Field label="Short Description" required className="mb-4">
                <input
                  autoFocus
                  value={form.title}
                  onChange={setField('title')}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }}
                  placeholder="Brief description of the issue"
                  className={inp}
                />
              </Field>
              <Field label="Description" className="flex flex-col flex-1">
                <textarea
                  value={form.description}
                  onChange={setField('description')}
                  placeholder="Steps to reproduce, impact, additional context, what the user already tried…"
                  className={`${inp} resize-none leading-relaxed flex-1 min-h-0`}
                  style={{ height: '100%' }}
                />
              </Field>
            </Card>

          </div>
        )}

        {/* ── RESOLUTION TAB ── */}
        {!loadingData && tab === 'resolution' && (
          <div className="max-w-2xl flex flex-col gap-4">
            <Card>
              <div className="flex items-start gap-2 mb-4 text-xs text-text-secondary">
                <Info size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <span>
                  Resolution Code and Notes are <strong>required when resolving or closing</strong> this incident.
                  You may leave them blank now and complete them at resolution time.
                </span>
              </div>
              <Field label="Resolution Code" className="mb-4">
                <select value={form.resolutionCodeCode} onChange={setField('resolutionCodeCode')} className={sel}>
                  <option value="">— none —</option>
                  {resolutionCodes.map(rc => (
                    <option key={rc.code} value={rc.code}>{rc.displayName}</option>
                  ))}
                </select>
              </Field>
              <Field label="Resolution Notes / Description">
                <textarea
                  value={form.resolutionNotes}
                  onChange={setField('resolutionNotes')}
                  rows={7}
                  placeholder="Describe how the incident was resolved…"
                  className={`${inp} resize-none leading-relaxed`}
                />
              </Field>
            </Card>
          </div>
        )}

        {/* ── SLA TAB ── */}
        {!loadingData && tab === 'sla' && (
          <div className="max-w-2xl flex flex-col gap-4">
            {selectedPriority && (
              <Card>
                <h3 className="text-sm font-semibold text-text-primary mb-3">SLA Targets</h3>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <SlaCard
                    label="Response SLA Target"
                    value={`${selectedPriority.defaultResponseMin} min`}
                    note="Based on selected priority"
                  />
                  <SlaCard
                    label="Resolution SLA Target"
                    value={`${selectedPriority.defaultResolutionMin} min`}
                    note="Based on selected priority"
                  />
                </div>
                <p className="text-xs text-text-muted mt-2">Targets may be refined by the SLA policy assigned to the selected service and category.</p>
              </Card>
            )}
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Auto-tracked Fields</h3>
              <div className="divide-y divide-border-default">
                {[
                  { label: 'First Response Date/Time',    note: 'Stamped when the first agent reply is posted' },
                  { label: 'Resolved Date/Time',          note: 'Stamped automatically when status → Resolved' },
                  { label: 'Closed Date/Time',            note: 'Stamped automatically when status → Closed' },
                  { label: 'Total Time on Hold',          note: 'Accumulated while the status is On Hold' },
                  { label: 'Reopen Count',                note: 'Incremented each time the incident is reopened' },
                  { label: 'Reassignment Count',          note: 'Incremented each time the assignee changes' },
                  { label: 'First Call Resolution',       note: 'Auto-calculated — resolved without reassignment' },
                  { label: 'Customer Satisfaction Score', note: 'Collected via CSAT survey sent after closure' },
                  { label: 'Knowledge Article Created',   note: 'Flagged when a KB article is linked to this incident' },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-sm text-text-primary">{f.label}</div>
                      <div className="text-xs text-text-muted">{f.note}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-subtle text-text-secondary border border-border-default whitespace-nowrap ml-4">
                      Auto-tracked
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 bg-subtle border-t border-border-default px-6 py-2.5 flex items-center justify-between text-xs text-text-muted">
        <span><span className="text-red-500 font-bold">*</span> Required fields</span>
        <span>⌘+⏎ to submit</span>
      </div>
    </div>
  )
}

/* ── Layout primitives ── */

const inp = 'w-full px-2.5 py-1.5 border border-border-default rounded-md text-sm bg-surface focus:outline-none focus:border-border-focus'
const sel = inp
const sml = 'w-full px-2 py-1 border border-border-default rounded-md text-xs bg-surface focus:outline-none focus:border-border-focus'

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border-default rounded-lg p-4 shadow-sm ${className ?? ''}`}>
      {children}
    </div>
  )
}

function Field({
  label, required, children, className,
}: {
  label: string; required?: boolean; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`flex flex-col ${className ?? ''}`}>
      <label className="block text-[11px] font-medium text-text-secondary mb-1">
        {required && <span className="text-red-500 mr-0.5">*</span>}
        {label}
      </label>
      {children}
    </div>
  )
}

function SlaCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="p-3 rounded-md border border-border-default bg-subtle">
      <div className="text-xs font-medium text-text-secondary mb-1">{label}</div>
      <div className="text-lg font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-muted mt-0.5">{note}</div>
    </div>
  )
}
