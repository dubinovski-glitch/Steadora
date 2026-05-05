import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Star, Share2, Lock } from 'lucide-react'
import { incidentApi } from '../../api/incidents'
import { adminApi } from '../../api/admin'
import { lookupsApi } from '../../api/lookups'
import { api } from '../../api/client'
import { useAppStore } from '../../store/appStore'
import { Badge, priorityVariant, statusVariant } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { SlaBar } from '../../components/primitives/SlaBar'
import type {
  Incident, Comment, ActivityEvent,
  User, Group, Service, AdminCategory, AdminSubCategory,
  ContactMethod, Severity, ResolutionCode,
} from '../../types'

interface Props { incidentId: number; addToast: (t: string) => void }

const STATUSES = [
  { code: 'new',      label: 'New' },
  { code: 'progress', label: 'In Progress' },
  { code: 'pending',  label: 'Pending' },
  { code: 'resolved', label: 'Resolved' },
  { code: 'closed',   label: 'Closed' },
]

interface EditState {
  title: string; description: string
  callerExtId: string; contactMethodCode: string; location: string
  serviceSlug: string; categoryCode: string; subCategoryCode: string; ciAssetTag: string
  priorityCode: string; severityCode: string
  isMajorIncident: boolean; groupSlug: string; assigneeExtId: string; statusCode: string
  resolutionCodeCode: string; resolutionNotes: string
}

function toEdit(i: Incident): EditState {
  return {
    title: i.title ?? '', description: i.description ?? '',
    callerExtId: '', contactMethodCode: i.contactMethodCode ?? '', location: i.location ?? '',
    serviceSlug: '', categoryCode: '', subCategoryCode: i.subCategoryCode ?? '', ciAssetTag: i.ciAssetTag ?? '',
    priorityCode: i.priorityCode ?? 'medium', severityCode: i.severityCode ?? '',
    isMajorIncident: i.isMajorIncident, groupSlug: '', assigneeExtId: '',
    statusCode: i.statusCode ?? 'new', resolutionCodeCode: i.resolutionCode ?? '',
    resolutionNotes: i.resolutionNotes ?? '',
  }
}

type ActivityItem = { at: string } & (
  | { type: 'comment'; comment: Comment }
  | { type: 'event'; event: ActivityEvent }
)

export function IncidentDetailView({ incidentId, addToast }: Props) {
  const { closeIncident } = useAppStore()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [timeline, setTimeline] = useState<ActivityEvent[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)

  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [subCategories, setSubCategories] = useState<AdminSubCategory[]>([])
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([])
  const [severities, setSeverities] = useState<Severity[]>([])
  const [resolutionCodes, setResolutionCodes] = useState<ResolutionCode[]>([])

  useEffect(() => {
    Promise.all([
      incidentApi.getById(incidentId),
      incidentApi.getComments(incidentId).catch(() => []),
      incidentApi.getTimeline(incidentId).catch(() => []),
      adminApi.getServices().catch(() => []),
      adminApi.getCategories().catch(() => []),
      api.get<User[]>('/users').catch(() => []),
      api.get<Group[]>('/users/groups').catch(() => []),
      lookupsApi.getContactMethods().catch(() => []),
      lookupsApi.getSeverities().catch(() => []),
      lookupsApi.getResolutionCodes().catch(() => []),
    ]).then(([inc, cmts, tl, svcs, cats, usrs, grps, cms, sevs, rcs]) => {
      const i = inc as Incident
      setIncident(i); setEdit(toEdit(i))
      setComments(cmts as Comment[]); setTimeline(tl as ActivityEvent[])
      setServices(svcs as Service[]); setCategories(cats as AdminCategory[])
      setUsers(usrs as User[]); setGroups(grps as Group[])
      setContactMethods(cms as ContactMethod[]); setSeverities(sevs as Severity[])
      setResolutionCodes(rcs as ResolutionCode[])
    })
  }, [incidentId])

  // Seed slug/code fields once lookups are available
  useEffect(() => {
    if (!incident || !services.length || !groups.length || !users.length) return
    setEdit(prev => {
      if (!prev) return prev
      const svc  = services.find(s => s.name === incident.serviceName)
      const grp  = groups.find(g => g.name === incident.groupName)
      const usr  = users.find(u => u.displayName === incident.callerName)
      const asgn = users.find(u => u.displayName === incident.assigneeName)
      return { ...prev,
        serviceSlug:   svc?.slug    ?? prev.serviceSlug,
        groupSlug:     grp?.slug    ?? prev.groupSlug,
        callerExtId:   usr?.externalId  ?? prev.callerExtId,
        assigneeExtId: asgn?.externalId ?? prev.assigneeExtId,
      }
    })
  }, [incident, services, groups, users])

  useEffect(() => {
    if (!incident || !categories.length) return
    setEdit(prev => {
      if (!prev) return prev
      const cat = categories.find(c => c.displayName === incident.categoryName)
      return { ...prev, categoryCode: cat?.code ?? prev.categoryCode }
    })
  }, [incident, categories])

  useEffect(() => {
    if (!edit?.categoryCode) { setSubCategories([]); return }
    const cat = categories.find(c => c.code === edit.categoryCode)
    setSubCategories(cat?.subCategories ?? [])
  }, [edit?.categoryCode, categories])

  const sf = <K extends keyof EditState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEdit(prev => prev ? { ...prev, [k]: e.target.value } : prev)

  const save = async () => {
    if (!edit || !incident) return
    setSaving(true)
    try {
      const prevStatus = incident.statusCode
      await incidentApi.update(incidentId, {
        title: edit.title, description: edit.description || undefined,
        callerExtId: edit.callerExtId || undefined,
        contactMethodCode: edit.contactMethodCode || undefined,
        location: edit.location || undefined,
        serviceSlug: edit.serviceSlug || undefined,
        categoryCode: edit.categoryCode || undefined,
        subCategoryCode: edit.subCategoryCode || undefined,
        ciAssetTag: edit.ciAssetTag || undefined,
        priorityCode: edit.priorityCode,
        severityCode: edit.severityCode || undefined,
        isMajorIncident: edit.isMajorIncident,
        groupSlug: edit.groupSlug || undefined,
        assigneeExtId: edit.assigneeExtId || undefined,
        resolutionCodeCode: edit.resolutionCodeCode || undefined,
        resolutionNotes: edit.resolutionNotes || undefined,
        actorExtId: 'me',
      })
      if (edit.statusCode !== prevStatus)
        await incidentApi.setStatus(incidentId, edit.statusCode)
      const updated = await incidentApi.getById(incidentId)
      setIncident(updated); setEdit(toEdit(updated))
      const updatedComments = await incidentApi.getComments(incidentId)
      setComments(updatedComments)
      const updatedTimeline = await incidentApi.getTimeline(incidentId)
      setTimeline(updatedTimeline)
      addToast('Incident saved')
    } finally { setSaving(false) }
  }

  const submitNote = async () => {
    if (!noteBody.trim()) return
    await incidentApi.postComment(incidentId, 'me', noteBody, true)
    addToast('Note added')
    setNoteBody('')
    const [updatedComments, updatedTimeline] = await Promise.all([
      incidentApi.getComments(incidentId),
      incidentApi.getTimeline(incidentId),
    ])
    setComments(updatedComments)
    setTimeline(updatedTimeline)
  }

  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...comments.map(c => ({ type: 'comment' as const, at: c.createdAt, comment: c })),
      ...timeline.map(e => ({ type: 'event' as const, at: e.occurredAt, event: e })),
    ]
    return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  }, [comments, timeline])

  if (!incident || !edit) return <div className="flex items-center justify-center h-64 text-text-muted">Loading…</div>

  const isClosed = incident.statusCode === 'closed'
  const dis = isClosed || saving

  const filteredCats = edit.serviceSlug
    ? categories.filter(c => { const s = services.find(x => x.slug === edit.serviceSlug); return s ? c.serviceId === s.serviceId : true })
    : categories

  const sel = `w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed`
  const inp = `w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed`

  const relative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return new Date(iso).toLocaleDateString()
  }

  return (
    <div className="flex h-full -mx-6 -mt-4 overflow-hidden">

      {/* ── LEFT: main content ── */}
      <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border-default px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <button onClick={closeIncident} className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <ArrowLeft size={12} /> Back to queue
            </button>
            <span>·</span>
            <span className="font-mono font-medium text-text-secondary">{incident.number}</span>
            <button className="text-text-muted hover:text-text-secondary ml-1"><Star size={12} /></button>
            <button className="text-text-muted hover:text-text-secondary"><Share2 size={12} /></button>
          </div>

          {/* Editable title */}
          <input
            value={edit.title}
            onChange={sf('title')}
            disabled={dis}
            className="w-full text-2xl font-semibold text-text-primary bg-transparent border-0 outline-none focus:ring-0 disabled:cursor-not-allowed mb-2 placeholder:text-text-muted"
            placeholder="Incident title"
          />

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={priorityVariant(incident.priorityCode)}>{incident.priorityCode}</Badge>
            <Badge variant={statusVariant(incident.statusCode)}>{incident.statusCode}</Badge>
            {incident.assigneeName && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Avatar initials={incident.assigneeInitials} color={incident.assigneeColor} name={incident.assigneeName} size="sm" />
                {incident.assigneeName}
              </span>
            )}
            {incident.ciAssetTag && <span className="text-xs text-text-muted font-mono">{incident.ciAssetTag}</span>}
            <span className="text-xs text-text-muted">Opened {relative(incident.openedAt)}</span>
            <div className="ml-auto flex flex-col items-end gap-1">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={edit.isMajorIncident}
                  onChange={e => setEdit(prev => prev ? { ...prev, isMajorIncident: e.target.checked } : prev)}
                  disabled={dis}
                  className="w-3.5 h-3.5 accent-accent disabled:opacity-50"
                />
                <span className="font-medium text-text-secondary">Major Incident</span>
              </label>
              {incident.slaTargetMinutes && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-border-default text-xs">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (incident.slaPercent ?? 0) >= 80 ? '#dc2626' : '#d97706' }} />
                  <SlaBar percent={incident.slaPercent} breachedAt={incident.slaBreachedAt} targetMinutes={incident.slaTargetMinutes} startedAt={incident.slaStartedAt} pausedSeconds={incident.slaPausedSeconds} compact />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 flex flex-col gap-6 flex-1">

          {isClosed && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 text-sm">
              <Lock size={14} className="shrink-0" />
              <span>This incident is <strong>closed</strong>. No further changes can be made.</span>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-primary">Description</h3>
              <span className="text-xs text-text-muted">Updated {relative(incident.updatedAt)}</span>
            </div>
            <textarea
              value={edit.description}
              onChange={sf('description')}
              disabled={dis}
              rows={7}
              placeholder="Full description, steps to reproduce, impact…"
              className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[15px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus disabled:opacity-60 disabled:cursor-not-allowed resize-none leading-relaxed"
            />
          </div>

          {/* Notes input */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Add Note</h3>
            <div className={`border border-border-default rounded-lg overflow-hidden ${isClosed ? 'opacity-50 pointer-events-none' : ''}`}>
              <textarea
                rows={3}
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitNote() }}
                disabled={isClosed}
                placeholder={isClosed ? 'Closed incidents cannot receive new notes.' : 'Write a note…'}
                className="w-full px-3 py-2 text-sm text-text-primary bg-surface resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between px-3 py-2 bg-subtle">
                <span className="text-xs text-text-muted">⌘+⏎ to add</span>
                <button
                  onClick={submitNote}
                  disabled={isClosed}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded font-medium"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Activity</h3>
              <span className="text-xs text-text-muted">{activityItems.length} events</span>
            </div>
            <div className="flex flex-col gap-3">
              {activityItems.length === 0 && (
                <p className="text-sm text-text-muted">No activity yet.</p>
              )}
              {activityItems.map((item, idx) => (
                item.type === 'comment' ? (
                  <div key={`c-${item.comment.commentId}`} className="flex gap-3">
                    <Avatar initials={item.comment.authorInitials} color={item.comment.authorColor} name={item.comment.authorName} size="sm" />
                    <div className="flex-1 rounded-lg p-3 text-sm bg-[#fdf8e6] border border-[#f3d9a4]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text-primary text-xs">{item.comment.authorName ?? 'Unknown'}</span>
                        <span className="text-[10px] text-[#b45309] bg-[#fdf3e3] px-1.5 py-0.5 rounded font-medium">NOTE</span>
                        <span className="text-xs text-text-muted ml-auto">{relative(item.comment.createdAt)}</span>
                      </div>
                      <p className="text-text-secondary whitespace-pre-wrap">{item.comment.body}</p>
                    </div>
                  </div>
                ) : (
                  <div key={`e-${item.event.activityId ?? idx}`} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-subtle border border-border-default flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] text-text-muted">⚡</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <span className="text-xs text-text-secondary">
                        <span className="font-medium text-text-primary">{item.event.actorName ?? 'System'}</span>{' '}
                        {item.event.kind.replace(/_/g, ' ')}
                        {item.event.field && <> · <span className="font-medium">{item.event.field}</span></>}
                        {item.event.oldValue && item.event.newValue && (
                          <> <span className="line-through text-text-muted">{item.event.oldValue}</span> → <span className="font-medium">{item.event.newValue}</span></>
                        )}
                        {!item.event.oldValue && item.event.newValue && (
                          <> → <span className="font-medium">{item.event.newValue}</span></>
                        )}
                      </span>
                      <span className="text-xs text-text-muted ml-2">{relative(item.event.occurredAt)}</span>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── RIGHT: properties sidebar ── */}
      <div className="w-80 shrink-0 border-l border-border-default overflow-y-auto bg-surface flex flex-col">

        {/* Sticky save button */}
        {!isClosed && (
          <div className="sticky top-0 z-10 bg-surface border-b border-border-default p-3">
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-semibold rounded-md transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        <div className="p-4 flex flex-col gap-5">

          {/* Properties */}
          <div className="flex flex-col gap-2.5">
            <SbField label="Status">
              <select value={edit.statusCode} onChange={sf('statusCode')} disabled={dis} className={sel}>
                {STATUSES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </SbField>
            <SbField label="Priority">
              <select value={edit.priorityCode} onChange={sf('priorityCode')} disabled={dis} className={sel}>
                {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </SbField>
            <SbField label="Severity">
              <select value={edit.severityCode} onChange={sf('severityCode')} disabled={dis} className={sel}>
                <option value="">— none —</option>
                {severities.map(s => <option key={s.code} value={s.code}>{s.displayName}</option>)}
              </select>
            </SbField>
            <SbField label="Assignment team">
              <select value={edit.groupSlug} onChange={sf('groupSlug')} disabled={dis} className={sel}>
                <option value="">— select —</option>
                {groups.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
              </select>
            </SbField>
            <SbField label="Assigned to">
              <select value={edit.assigneeExtId} onChange={sf('assigneeExtId')} disabled={dis} className={sel}>
                <option value="">— unassigned —</option>
                {users.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
              </select>
            </SbField>
          </div>

          {/* Classification */}
          <div className="flex flex-col gap-2.5">
            <SbField label="Service">
              <select value={edit.serviceSlug} onChange={e => setEdit(prev => prev ? { ...prev, serviceSlug: e.target.value, categoryCode: '', subCategoryCode: '' } : prev)} disabled={dis} className={sel}>
                <option value="">— select —</option>
                {services.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
            </SbField>
            <SbField label="Category">
              <select value={edit.categoryCode} onChange={e => setEdit(prev => prev ? { ...prev, categoryCode: e.target.value, subCategoryCode: '' } : prev)} disabled={dis || !edit.serviceSlug} className={sel}>
                <option value="">— select —</option>
                {filteredCats.map(c => <option key={c.code} value={c.code}>{c.displayName}</option>)}
              </select>
            </SbField>
            <SbField label="Subcategory">
              <select value={edit.subCategoryCode} onChange={sf('subCategoryCode')} disabled={dis || !edit.categoryCode} className={sel}>
                <option value="">— none —</option>
                {subCategories.map(s => <option key={s.code} value={s.code}>{s.displayName}</option>)}
              </select>
            </SbField>
            <SbField label="Config Item">
              <input value={edit.ciAssetTag} onChange={sf('ciAssetTag')} disabled={dis} placeholder="Asset tag" className={inp} />
            </SbField>
          </div>

          {/* Caller / Contact */}
          <div className="flex flex-col gap-2.5">
            <SbField label="Caller">
              <select value={edit.callerExtId} onChange={sf('callerExtId')} disabled={dis} className={sel}>
                <option value="">— select —</option>
                {users.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
              </select>
            </SbField>
            <SbField label="Contact Method">
              <select value={edit.contactMethodCode} onChange={sf('contactMethodCode')} disabled={dis} className={sel}>
                <option value="">— none —</option>
                {contactMethods.map(cm => <option key={cm.code} value={cm.code}>{cm.displayName}</option>)}
              </select>
            </SbField>
            <SbField label="Location">
              <input value={edit.location} onChange={sf('location')} disabled={dis} placeholder="e.g. HQ Floor 4" className={inp} />
            </SbField>
          </div>

          {/* Resolution */}
          <div className="flex flex-col gap-2.5">
            <SbField label="Resolution Code">
              <select value={edit.resolutionCodeCode} onChange={sf('resolutionCodeCode')} disabled={dis} className={sel}>
                <option value="">— none —</option>
                {resolutionCodes.map(rc => <option key={rc.code} value={rc.code}>{rc.displayName}</option>)}
              </select>
            </SbField>
            <SbField label="Resolution Notes">
              <textarea
                value={edit.resolutionNotes}
                onChange={sf('resolutionNotes')}
                disabled={dis}
                rows={3}
                placeholder="How was this resolved?"
                className={`${inp} resize-none`}
              />
            </SbField>
          </div>

          {/* Dates (read-only) */}
          <div className="flex flex-col gap-2.5">
            <SbInfo label="Opened"     value={incident.openedAt   ? new Date(incident.openedAt).toLocaleString()   : '—'} />
            <SbInfo label="Resolved"   value={incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : '—'} />
            <SbInfo label="Closed"     value={incident.closedAt   ? new Date(incident.closedAt).toLocaleString()   : '—'} />
            <SbInfo label="1st Response" value={incident.firstResponseAt ? new Date(incident.firstResponseAt).toLocaleString() : '—'} />
            <SbInfo label="Reopens"    value={String(incident.reopenCount ?? 0)} />
            <SbInfo label="Reassigns"  value={String(incident.reassignCount ?? 0)} />
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Sidebar primitives ── */

function SbField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted mb-1">{label}</p>
      {children}
    </div>
  )
}

function SbInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  )
}
