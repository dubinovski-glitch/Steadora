import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Star, Share2, Lock } from 'lucide-react'
import { problemApi } from '../../api/problems'
import { api } from '../../api/client'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { Badge, priorityVariant, statusVariant } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { IncidentDetailView } from '../incidents/IncidentDetailView'
import type { Problem, Comment, ActivityEvent, User, Group, Incident } from '../../types'

interface Props { problemId: number; addToast: (t: string) => void }

const STATE_STEPS = [
  { code: 'investigating',    label: 'Investigating' },
  { code: 'rca',              label: 'RCA' },
  { code: 'workaround',       label: 'Workaround' },
  { code: 'implementing_fix', label: 'Implementing Fix' },
  { code: 'vendor_engaged',   label: 'Vendor Engaged' },
  { code: 'closed',           label: 'Closed' },
]

const PRIORITIES = ['critical', 'high', 'medium', 'low']

interface EditState {
  title: string
  rootCause: string
  workaround: string
  priorityCode: string
  stateCode: string
  groupSlug: string
  assigneeExtId: string
  isKnownError: boolean
}

function toEdit(p: Problem): EditState {
  return {
    title: p.title ?? '',
    rootCause: p.rootCause ?? '',
    workaround: p.workaround ?? '',
    priorityCode: p.priorityCode ?? 'medium',
    stateCode: p.stateCode ?? 'investigating',
    groupSlug: '',
    assigneeExtId: '',
    isKnownError: p.isKnownError,
  }
}

type ActivityItem = { at: string } & (
  | { type: 'comment'; comment: Comment }
  | { type: 'event'; event: ActivityEvent }
)

export function ProblemDetailView({ problemId, addToast }: Props) {
  const { closeProblem } = useAppStore()
  const { user: authUser } = useAuthStore()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [timeline, setTimeline] = useState<ActivityEvent[]>([])
  const [linkedIncidents, setLinkedIncidents] = useState<Incident[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewingIncidentId, setViewingIncidentId] = useState<number | null>(null)

  const [groups, setGroups] = useState<Group[]>([])
  const [groupUsers, setGroupUsers] = useState<User[]>([])

  useEffect(() => {
    Promise.all([
      problemApi.getById(problemId),
      problemApi.getComments(problemId).catch(() => []),
      problemApi.getTimeline(problemId).catch(() => []),
      api.get<Group[]>('/users/groups').catch(() => []),
      problemApi.getLinkedIncidents(problemId).catch(() => []),
    ]).then(([prb, cmts, tl, grps, incs]) => {
      const p = prb as Problem
      setProblem(p); setEdit(toEdit(p))
      setComments(cmts as Comment[]); setTimeline(tl as ActivityEvent[])
      setGroups(grps as Group[])
      setLinkedIncidents(incs as Incident[])
    })
  }, [problemId])

  // Seed group/assignee slugs once lookups are loaded
  useEffect(() => {
    if (!problem || !groups.length) return
    setEdit(prev => {
      if (!prev) return prev
      const grp = groups.find(g => g.name === problem.groupName)
      return { ...prev, groupSlug: grp?.slug ?? prev.groupSlug }
    })
  }, [problem, groups])

  useEffect(() => {
    if (!edit?.groupSlug) { setGroupUsers([]); return }
    api.get<User[]>(`/users?groupSlug=${encodeURIComponent(edit.groupSlug)}`)
      .then(us => {
        setGroupUsers(us)
        // Seed assignee once group users are loaded
        if (problem?.assigneeName) {
          const match = us.find(u => u.displayName === problem.assigneeName)
          if (match) setEdit(prev => prev ? { ...prev, assigneeExtId: match.externalId } : prev)
        }
      })
      .catch(() => setGroupUsers([]))
  }, [edit?.groupSlug])

  const sf = <K extends keyof EditState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEdit(prev => prev ? { ...prev, [k]: e.target.value } : prev)

  const save = async () => {
    if (!edit || !problem) return
    setSaving(true)
    try {
      await problemApi.update(problemId, {
        title: edit.title,
        rootCause: edit.rootCause || undefined,
        workaround: edit.workaround || undefined,
        priorityCode: edit.priorityCode,
        groupSlug: edit.groupSlug || undefined,
        assigneeExtId: edit.assigneeExtId || undefined,
        isKnownError: edit.isKnownError,
        actorExtId: 'me',
      })
      if (edit.stateCode !== problem.stateCode)
        await problemApi.setState(problemId, edit.stateCode)
      const updated = await problemApi.getById(problemId)
      setProblem(updated); setEdit(toEdit(updated))
      const updatedComments = await problemApi.getComments(problemId)
      setComments(updatedComments as Comment[])
      const updatedTimeline = await problemApi.getTimeline(problemId)
      setTimeline(updatedTimeline as ActivityEvent[])
      addToast('Problem saved')
    } finally { setSaving(false) }
  }

  const submitNote = async () => {
    if (!noteBody.trim()) return
    await problemApi.postComment(problemId, authUser?.externalId ?? '', noteBody, true)
    addToast('Note added')
    setNoteBody('')
    const [updatedComments, updatedTimeline] = await Promise.all([
      problemApi.getComments(problemId),
      problemApi.getTimeline(problemId),
    ])
    setComments(updatedComments as Comment[])
    setTimeline(updatedTimeline as ActivityEvent[])
  }

  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...comments.map(c => ({ type: 'comment' as const, at: c.createdAt, comment: c })),
      ...timeline.map(e => ({ type: 'event' as const, at: e.occurredAt, event: e })),
    ]
    return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  }, [comments, timeline])

  if (!problem || !edit) return <div className="flex items-center justify-center h-64 text-text-muted">Loading…</div>

  if (viewingIncidentId) {
    return (
      <IncidentDetailView
        incidentId={viewingIncidentId}
        addToast={addToast}
        readOnly
        onBack={() => setViewingIncidentId(null)}
      />
    )
  }

  const isClosed = problem.stateCode === 'closed'
  const dis = isClosed || saving

  const sel = 'w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed'
  const inp = sel

  const relative = (iso: string) => {
    const utc = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
    const diff = Date.now() - new Date(utc).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return new Date(utc).toLocaleDateString()
  }

  const currentStateIdx = STATE_STEPS.findIndex(s => s.code === edit.stateCode)

  return (
    <div className="flex h-full -mx-6 -mt-4 overflow-hidden">

      {/* ── LEFT: main content ── */}
      <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border-default px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <button onClick={closeProblem} className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <ArrowLeft size={12} /> Back to problems
            </button>
            <span>·</span>
            <span className="font-mono font-medium text-text-secondary">{problem.number}</span>
            <button className="text-text-muted hover:text-text-secondary ml-1"><Star size={12} /></button>
            <button className="text-text-muted hover:text-text-secondary"><Share2 size={12} /></button>
          </div>

          {/* Editable title */}
          <input
            value={edit.title}
            onChange={sf('title')}
            disabled={dis}
            className="w-full text-2xl font-semibold text-text-primary bg-transparent border-0 outline-none focus:ring-0 disabled:cursor-not-allowed mb-2 placeholder:text-text-muted"
            placeholder="Problem title"
          />

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={priorityVariant(problem.priorityCode)}>{problem.priorityCode}</Badge>
            {problem.isKnownError && (
              <span className="text-xs bg-[#fdf3e3] text-[#d97706] border border-[#f3d9a4] px-2 py-0.5 rounded font-medium">Known Error</span>
            )}
            {problem.assigneeName && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Avatar initials={problem.assigneeInitials} color={problem.assigneeColor} size="sm" />
                {problem.assigneeName}
              </span>
            )}
            <span className="text-xs text-text-muted">Opened {relative(problem.openedAt)}</span>
          </div>

          {/* State progress */}
          <div className="flex items-center gap-2 mt-3">
            {STATE_STEPS.map((s, i) => (
              <div key={s.code} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${i < currentStateIdx ? 'bg-[#1f8a4c]' : i === currentStateIdx ? 'bg-accent' : 'bg-border-default'}`} />
                <span className={`text-xs ${i === currentStateIdx ? 'text-accent font-medium' : 'text-text-muted'}`}>{s.label}</span>
                {i < STATE_STEPS.length - 1 && <div className="w-4 h-px bg-border-default" />}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 flex flex-col gap-6 flex-1">

          {isClosed && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 text-sm">
              <Lock size={14} className="shrink-0" />
              <span>This problem is <strong>closed</strong>. No further changes can be made.</span>
            </div>
          )}

          {/* Root Cause */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-primary">Root Cause</h3>
              <span className="text-xs text-text-muted">Updated {relative(problem.updatedAt)}</span>
            </div>
            <textarea
              value={edit.rootCause}
              onChange={sf('rootCause')}
              disabled={dis}
              rows={6}
              placeholder="Describe the root cause of the problem…"
              className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[15px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus disabled:opacity-60 disabled:cursor-not-allowed resize-none leading-relaxed"
            />
          </div>

          {/* Workaround */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Workaround</h3>
            <textarea
              value={edit.workaround}
              onChange={sf('workaround')}
              disabled={dis}
              rows={4}
              placeholder="Describe any available workaround…"
              className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[15px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus disabled:opacity-60 disabled:cursor-not-allowed resize-none leading-relaxed"
            />
          </div>

          {/* Add Note */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Add Note</h3>
            <div className={`border border-border-default rounded-lg overflow-hidden ${isClosed ? 'opacity-50 pointer-events-none' : ''}`}>
              <textarea
                rows={3}
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitNote() }}
                disabled={isClosed}
                placeholder={isClosed ? 'Closed problems cannot receive new notes.' : 'Write a note…'}
                className="w-full px-3 py-2 text-sm text-text-primary bg-surface resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between px-3 py-2 bg-subtle">
                <span className="text-xs text-text-muted">⌘+⏎ to add</span>
                <button onClick={submitNote} disabled={isClosed} className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded font-medium">
                  Add Note
                </button>
              </div>
            </div>
          </div>

          {/* Linked Incidents */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Linked Incidents</h3>
              <span className="text-xs text-text-muted">{linkedIncidents.length} incident{linkedIncidents.length !== 1 ? 's' : ''}</span>
            </div>
            {linkedIncidents.length === 0 ? (
              <p className="text-sm text-text-muted">No incidents linked to this problem.</p>
            ) : (
              <div className="border border-border-default rounded-lg overflow-hidden">
                {linkedIncidents.map((inc, idx) => (
                  <div
                    key={inc.incidentId}
                    onDoubleClick={() => setViewingIncidentId(inc.incidentId)}
                    title="Double-click to view incident"
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-hover transition-colors ${idx > 0 ? 'border-t border-border-default' : ''}`}
                  >
                    <span className="font-mono text-xs text-text-secondary shrink-0">{inc.number}</span>
                    <Badge variant={priorityVariant(inc.priorityCode)}>{inc.priorityCode}</Badge>
                    <Badge variant={statusVariant(inc.statusCode)}>{inc.statusCode}</Badge>
                    <span className="flex-1 text-sm text-text-primary truncate">{inc.title}</span>
                    {inc.assigneeName && (
                      <span className="flex items-center gap-1 text-xs text-text-secondary shrink-0">
                        <Avatar initials={inc.assigneeInitials} color={inc.assigneeColor} size="sm" />
                        {inc.assigneeName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {linkedIncidents.length > 0 && (
              <p className="text-xs text-text-muted mt-2">Double-click a row to view the incident in read-only mode.</p>
            )}
          </div>

          {/* Activity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Activity</h3>
              <span className="text-xs text-text-muted">{activityItems.length} events</span>
            </div>
            <div className="flex flex-col gap-3">
              {activityItems.length === 0 && <p className="text-sm text-text-muted">No activity yet.</p>}
              {activityItems.map((item, idx) => (
                item.type === 'comment' ? (
                  <div key={`c-${item.comment.commentId}`} className="flex gap-3">
                    <Avatar initials={item.comment.authorInitials} color={item.comment.authorColor} name={item.comment.authorName} size="sm" />
                    <div className="flex-1 rounded-lg p-3 text-sm bg-[#fdf8e6] border border-[#f3d9a4]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text-primary text-xs">{item.comment.authorName ?? 'Unknown'}</span>
                        <span className="text-[9px] text-[#b45309] bg-[#fdf3e3] px-1.5 py-0.5 rounded font-medium">NOTE</span>
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
            <button onClick={save} disabled={saving} className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-semibold rounded-md transition-colors">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        <div className="p-4 flex flex-col gap-5">

          {/* State & priority */}
          <div className="flex flex-col gap-2.5">
            <SbField label="State">
              <select value={edit.stateCode} onChange={sf('stateCode')} disabled={dis} className={sel}>
                {STATE_STEPS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </SbField>
            <SbField label="Priority">
              <select value={edit.priorityCode} onChange={sf('priorityCode')} disabled={dis} className={sel}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </SbField>
            <SbField label="Known Error">
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={edit.isKnownError}
                  onChange={e => setEdit(prev => prev ? { ...prev, isKnownError: e.target.checked } : prev)}
                  disabled={dis}
                  className="w-4 h-4 accent-accent disabled:opacity-50"
                />
                <span className="text-sm text-text-secondary">Flag as known error</span>
              </label>
            </SbField>
          </div>

          {/* Assignment */}
          <div className="flex flex-col gap-2.5">
            <SbField label="Assignment Team">
              <select value={edit.groupSlug} onChange={sf('groupSlug')} disabled={dis} className={sel}>
                <option value="">— select —</option>
                {groups.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
              </select>
            </SbField>
            <SbField label="Assigned To">
              <select value={edit.assigneeExtId} onChange={sf('assigneeExtId')} disabled={dis || !edit.groupSlug} className={sel}>
                <option value="">— unassigned —</option>
                {groupUsers.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
              </select>
            </SbField>
          </div>

          {/* Stats (read-only) */}
          <div className="flex flex-col gap-2.5">
            <SbInfo label="Opened"          value={new Date(problem.openedAt).toLocaleString()} />
            <SbInfo label="Resolved"        value={problem.resolvedAt ? new Date(problem.resolvedAt).toLocaleString() : '—'} />
            <SbInfo label="Linked incidents" value={String(problem.linkedIncidentCount)} />
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
      <p className="text-sm font-semibold text-text-muted mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function SbInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm font-semibold text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  )
}
