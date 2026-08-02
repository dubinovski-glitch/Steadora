import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { incidentApi } from '../../api/incidents'
import { problemApi } from '../../api/problems'
import { adminApi } from '../../api/admin'
import { lookupsApi } from '../../api/lookups'
import { api } from '../../api/client'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { useWorkspaceFields } from '../../hooks/useWorkspaceFields'
import type { User as UserType } from '../../types'
import type {
  User, Group, Service, AdminCategory, AdminSubCategory,
  Priority, ContactMethod, Severity, ResolutionCode, Problem,
} from '../../types'

interface Props { addToast: (t: string) => void }

const INCIDENT_STATUSES = [
  { code: 'new',      label: 'New' },
  { code: 'open',     label: 'Open' },
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
  linkedProblemId: number | ''
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
  linkedProblemId: '',
}

// Full-page "New Incident" form: a left description pane and a right properties sidebar.
// Loads all lookup data up front, honours per-workspace field config (visible/mandatory)
// via useWorkspaceFields, cascades Service → Category → Subcategory and Group → Assignee,
// validates mandatory fields, then creates the incident (optionally linking a problem)
// and closes back to the list.
export function NewIncidentForm({ addToast }: Props) {
  const { setShowNewIncident } = useAppStore()
  const { user: authUser } = useAuthStore()
  const fc = useWorkspaceFields()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [subCategories, setSubCategories] = useState<AdminSubCategory[]>([])
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([])
  const [severities, setSeverities] = useState<Severity[]>([])
  const [resolutionCodes, setResolutionCodes] = useState<ResolutionCode[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [groupUsers, setGroupUsers] = useState<UserType[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Load every dropdown's data in parallel on mount; each call degrades to [] on failure
  // so one failed lookup doesn't block the rest. Toggles loadingData off when all settle.
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
      problemApi.getAllItems(false).catch(() => []),
    ]).then(([svcs, cats, usrs, grps, pris, cms, sevs, rcs, prbs]) => {
      setServices(svcs as Service[])
      setCategories(cats as AdminCategory[])
      setUsers(usrs as User[])
      setGroups(grps as Group[])
      setPriorities(pris as Priority[])
      setContactMethods(cms as ContactMethod[])
      setSeverities(sevs as Severity[])
      setResolutionCodes(rcs as ResolutionCode[])
      setProblems(prbs as Problem[])
    }).finally(() => setLoadingData(false))
  }, [])

  // Categories shown for the chosen service: service-scoped plus global (serviceId == null)
  const filteredCategories = form.serviceSlug
    ? categories.filter(c => {
        const svc = services.find(s => s.slug === form.serviceSlug)
        // Show categories scoped to the selected service AND global categories
        // (serviceId == null), which apply to every service. Without the null
        // check, selecting a service with no scoped categories empties the list
        // and blocks submission, since Category is mandatory.
        return svc ? (c.serviceId === svc.serviceId || c.serviceId == null) : true
      })
    : categories

  // When the category changes, refresh the subcategory options and clear any prior choice
  useEffect(() => {
    if (!form.categoryCode) { setSubCategories([]); return }
    const cat = categories.find(c => c.code === form.categoryCode)
    setSubCategories(cat?.subCategories ?? [])
    setForm(f => ({ ...f, subCategoryCode: '' }))
  }, [form.categoryCode, categories])

  // Changing the service invalidates category/subcategory, so reset them
  useEffect(() => {
    setForm(f => ({ ...f, categoryCode: '', subCategoryCode: '' }))
  }, [form.serviceSlug])

  // When the assignment group changes, load that group's members for the Assignee dropdown
  // and drop the current assignee if they aren't in the newly selected group.
  useEffect(() => {
    if (!form.groupSlug) { setGroupUsers([]); setForm(f => ({ ...f, assigneeExtId: '' })); return }
    api.get<UserType[]>(`/users?groupSlug=${encodeURIComponent(form.groupSlug)}`)
      .then(us => {
        setGroupUsers(us)
        setForm(f => {
          const stillValid = us.some(u => u.externalId === f.assigneeExtId)
          return stillValid ? f : { ...f, assigneeExtId: '' }
        })
      })
      .catch(() => setGroupUsers([]))
  }, [form.groupSlug])

  const close = () => setShowNewIncident(false)

  // Curried change handler factory: returns an onChange that updates field `k` and clears
  // any visible validation errors as the user edits.
  const sf = <K extends keyof FormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValidationErrors([])
      setForm(f => ({ ...f, [k]: e.target.value }))
    }

  // Collect labels of missing mandatory fields (title always required; others gated by
  // the workspace field config). An empty array means the form is valid.
  const validate = (): string[] => {
    const missing: string[] = []
    if (!form.title.trim()) missing.push('Short Description')
    if (fc('incident', 'caller').mandatory   && !form.callerExtId)  missing.push('Caller / Affected User')
    if (fc('incident', 'service').mandatory  && !form.serviceSlug)  missing.push('Service')
    if (fc('incident', 'category').mandatory && !form.categoryCode) missing.push('Category')
    if (fc('incident', 'group').mandatory    && !form.groupSlug)    missing.push('Assignment Team')
    return missing
  }

  // Validate first (surfacing missing fields), then create the incident; if a problem was
  // chosen, link it afterwards. Toasts the new INC number and closes on success.
  const submit = async () => {
    const missing = validate()
    if (missing.length > 0) { setValidationErrors(missing); return }
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
        createdByExtId: authUser?.externalId ?? '',
      })
      if (form.linkedProblemId)
        await incidentApi.linkProblem(res.id, Number(form.linkedProblemId))
      addToast(`Created INC-${res.id} — "${form.title.slice(0, 36)}${form.title.length > 36 ? '…' : ''}"`)
      close()
    } finally {
      setSubmitting(false)
    }
  }

  const sel = `w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed`
  const inp = `w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed`

  return (
    <div className="flex h-full -mx-6 -mt-4 overflow-hidden">

      {/* ── LEFT: main content ── */}
      <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border-default px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <button onClick={close} className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <ArrowLeft size={12} /> Incidents
            </button>
            <span>·</span>
            <span className="text-text-secondary">New Incident</span>
          </div>

          <input
            autoFocus
            value={form.title}
            onChange={sf('title')}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }}
            placeholder="Short description of the issue"
            className="w-full text-2xl font-semibold text-text-primary bg-transparent border-0 outline-none focus:ring-0 mb-2 placeholder:text-text-muted"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">New</span>
            <span className="text-xs text-text-muted">Incident ID will be auto-generated on submit</span>
            {fc('incident', 'isMajorIncident').visible && (
              <div className="ml-auto">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isMajorIncident}
                    onChange={e => setForm(f => ({ ...f, isMajorIncident: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-accent"
                  />
                  <span className="font-medium text-text-secondary">Major Incident</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 flex flex-col gap-6 flex-1">
          {loadingData && (
            <div className="text-sm text-text-muted text-center py-12">Loading form data…</div>
          )}

          {!loadingData && fc('incident', 'description').visible && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                Description{fc('incident', 'description').mandatory && <span className="text-red-400 ml-0.5">*</span>}
              </h3>
              <textarea
                value={form.description}
                onChange={sf('description')}
                rows={14}
                placeholder="Steps to reproduce, impact, additional context, what the user already tried…"
                className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[23px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus resize-none leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: properties sidebar ── */}
      <div className="w-80 shrink-0 border-l border-border-default overflow-y-auto bg-surface flex flex-col">

        {/* Sticky submit/cancel */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border-default p-3 flex flex-col gap-2">
          {validationErrors.length > 0 && (
            <div className="px-3 py-2 rounded-md bg-red-50 border border-red-300 text-xs text-red-800">
              <p className="font-semibold mb-1">Required fields missing:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {validationErrors.map(f => <li key={f}>{f}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={close}
              className="flex-1 py-2 border border-border-default rounded-md text-sm text-text-secondary hover:bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-semibold rounded-md transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-5">

          {/* Properties */}
          <div className="flex flex-col gap-2.5">
            {fc('incident', 'priority').visible && (
              <SbField label="Priority" required={fc('incident', 'priority').mandatory}>
                <select value={form.priorityCode} onChange={sf('priorityCode')} className={sel}>
                  {['critical', 'high', 'medium', 'low'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </SbField>
            )}
            {fc('incident', 'severity').visible && (
              <SbField label="Severity" required={fc('incident', 'severity').mandatory}>
                <select value={form.severityCode} onChange={sf('severityCode')} className={sel}>
                  <option value="">— none —</option>
                  {severities.map(s => <option key={s.code} value={s.code}>{s.displayName}</option>)}
                </select>
              </SbField>
            )}
            {fc('incident', 'group').visible && (
              <SbField label="Assignment Team" required={fc('incident', 'group').mandatory}>
                <select value={form.groupSlug} onChange={sf('groupSlug')} className={sel}>
                  <option value="">— select —</option>
                  {groups.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
                </select>
              </SbField>
            )}
            {fc('incident', 'assignee').visible && (
              <SbField label="Assigned To" required={fc('incident', 'assignee').mandatory}>
                <select value={form.assigneeExtId} onChange={sf('assigneeExtId')} disabled={!form.groupSlug} className={sel}>
                  <option value="">— unassigned —</option>
                  {groupUsers.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
                </select>
              </SbField>
            )}
            <SbField label="Problem">
              <select value={form.linkedProblemId} onChange={e => setForm(f => ({ ...f, linkedProblemId: e.target.value ? Number(e.target.value) : '' }))} className={sel}>
                <option value="">— none —</option>
                {problems.map(p => <option key={p.problemId} value={p.problemId}>{p.number} – {p.title.slice(0, 50)}</option>)}
              </select>
            </SbField>
          </div>

          {/* Caller / Contact */}
          <div className="flex flex-col gap-2.5">
            {fc('incident', 'caller').visible && (
              <SbField label="Caller / Affected User" required={fc('incident', 'caller').mandatory}>
                <select value={form.callerExtId} onChange={sf('callerExtId')} className={sel}>
                  <option value="">— select —</option>
                  {users.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
                </select>
              </SbField>
            )}
            {fc('incident', 'contactMethod').visible && (
              <SbField label="Contact Method" required={fc('incident', 'contactMethod').mandatory}>
                <select value={form.contactMethodCode} onChange={sf('contactMethodCode')} className={sel}>
                  <option value="">— none —</option>
                  {contactMethods.map(cm => <option key={cm.code} value={cm.code}>{cm.displayName}</option>)}
                </select>
              </SbField>
            )}
            {fc('incident', 'location').visible && (
              <SbField label="Location" required={fc('incident', 'location').mandatory}>
                <input value={form.location} onChange={sf('location')} placeholder="e.g. HQ Floor 4" className={inp} />
              </SbField>
            )}
          </div>

          {/* Classification */}
          <div className="flex flex-col gap-2.5">
            {fc('incident', 'service').visible && (
              <SbField label="Service" required={fc('incident', 'service').mandatory}>
                <select value={form.serviceSlug} onChange={sf('serviceSlug')} className={sel}>
                  <option value="">— select —</option>
                  {services.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select>
              </SbField>
            )}
            {fc('incident', 'category').visible && (
              <SbField label="Category" required={fc('incident', 'category').mandatory}>
                <select value={form.categoryCode} onChange={sf('categoryCode')} disabled={!form.serviceSlug} className={sel}>
                  <option value="">— select —</option>
                  {filteredCategories.map(c => <option key={c.code} value={c.code}>{c.displayName}</option>)}
                </select>
              </SbField>
            )}
            {fc('incident', 'subCategory').visible && (
              <SbField label="Subcategory" required={fc('incident', 'subCategory').mandatory}>
                <select value={form.subCategoryCode} onChange={sf('subCategoryCode')} disabled={!form.categoryCode || subCategories.length === 0} className={sel}>
                  <option value="">— none —</option>
                  {subCategories.map(s => <option key={s.code} value={s.code}>{s.displayName}</option>)}
                </select>
              </SbField>
            )}
            {fc('incident', 'ciAssetTag').visible && (
              <SbField label="Config Item" required={fc('incident', 'ciAssetTag').mandatory}>
                <input value={form.ciAssetTag} onChange={sf('ciAssetTag')} placeholder="e.g. EXCH-NL-01" className={inp} />
              </SbField>
            )}
          </div>

          {/* Resolution */}
          <div className="flex flex-col gap-2.5">
            {fc('incident', 'resolutionCode').visible && (
              <SbField label="Resolution Code" required={fc('incident', 'resolutionCode').mandatory}>
                <select value={form.resolutionCodeCode} onChange={sf('resolutionCodeCode')} className={sel}>
                  <option value="">— none —</option>
                  {resolutionCodes.map(rc => <option key={rc.code} value={rc.code}>{rc.displayName}</option>)}
                </select>
              </SbField>
            )}
            {fc('incident', 'resolutionNotes').visible && (
              <SbField label="Resolution Notes" required={fc('incident', 'resolutionNotes').mandatory}>
                <textarea
                  value={form.resolutionNotes}
                  onChange={sf('resolutionNotes')}
                  rows={3}
                  placeholder="How was this resolved?"
                  className={`${inp} resize-none`}
                />
              </SbField>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Sidebar primitives ── */

// Labelled wrapper for a properties-sidebar field, with an optional required asterisk
function SbField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-muted mb-1.5">
        {required && <span className="text-red-400 mr-0.5">*</span>}
        {label}
      </p>
      {children}
    </div>
  )
}
