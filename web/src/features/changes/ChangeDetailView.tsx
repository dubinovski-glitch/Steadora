import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle, XCircle, Lock } from 'lucide-react'
import { changeApi } from '../../api/changes'
import { lookupsApi } from '../../api/lookups'
import { api } from '../../api/client'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { Badge } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { SkeletonDetail } from '../../components/primitives/Skeleton'
import type { Change, Comment, User, Group, ChangeType, Risk, ChangeState } from '../../types'

const CHANGE_STEPS = ['draft', 'in_review', 'pending_approval', 'approved', 'scheduled', 'implementing', 'complete']
const riskVariant = (code: string) => code === 'high' ? 'critical' : code === 'medium' ? 'high' : 'low'
const typeVariant = (code: string) => code === 'emergency' ? 'critical' : code === 'normal' ? 'medium' : 'low'

interface EditState {
  title: string
  description: string
  rolloutPlan: string
  rollbackPlan: string
  impactNotes: string
  changeTypeCode: string
  riskCode: string
  stateCode: string
  ownerExtId: string
  approverExtId: string
  groupSlug: string
  cabName: string
  scheduledStart: string
  scheduledEnd: string
  downtimeEstimate: string
}

function toEdit(c: Change): EditState {
  const toLocal = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return {
    title: c.title ?? '',
    description: c.description ?? '',
    rolloutPlan: c.rolloutPlan ?? '',
    rollbackPlan: c.rollbackPlan ?? '',
    impactNotes: c.impactNotes ?? '',
    changeTypeCode: c.changeTypeCode ?? 'normal',
    riskCode: c.riskCode ?? 'medium',
    stateCode: c.stateCode ?? 'draft',
    ownerExtId: '',
    approverExtId: '',
    groupSlug: '',
    cabName: c.cabName ?? '',
    scheduledStart: toLocal(c.scheduledStart),
    scheduledEnd: toLocal(c.scheduledEnd),
    downtimeEstimate: c.downtimeEstimate ?? '',
  }
}

interface Props {
  changeId: number
  addToast: (t: string) => void
}

export function ChangeDetailView({ changeId, addToast }: Props) {
  const { closeChange } = useAppStore()
  const { user: authUser } = useAuthStore()

  const [change, setChange] = useState<Change | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [noteBody, setNoteBody] = useState('')

  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [changeTypes, setChangeTypes] = useState<ChangeType[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [changeStates, setChangeStates] = useState<ChangeState[]>([])

  useEffect(() => {
    Promise.all([
      changeApi.getById(changeId),
      changeApi.getComments(changeId).catch(() => []),
      api.get<User[]>('/users').catch(() => []),
      api.get<Group[]>('/users/groups').catch(() => []),
      lookupsApi.getChangeTypes().catch(() => []),
      lookupsApi.getRisks().catch(() => []),
      lookupsApi.getChangeStates().catch(() => []),
    ]).then(([chg, cmts, usrs, grps, cts, rks, css]) => {
      const c = chg as Change
      setChange(c); setEdit(toEdit(c)); setIsDirty(false)
      setComments(cmts as Comment[])
      setUsers(usrs as User[])
      setGroups(grps as Group[])
      setChangeTypes(cts as ChangeType[])
      setRisks(rks as Risk[])
      setChangeStates(css as ChangeState[])
    })
  }, [changeId])

  // Seed owner/approver/group slug fields once users/groups are loaded
  useEffect(() => {
    if (!change || !users.length) return
    setEdit(prev => {
      if (!prev) return prev
      const owner = users.find(u => u.displayName === change.ownerName)
      const approver = users.find(u => u.displayName === change.approverName)
      return {
        ...prev,
        ownerExtId: owner?.externalId ?? prev.ownerExtId,
        approverExtId: approver?.externalId ?? prev.approverExtId,
      }
    })
  }, [change, users])

  useEffect(() => {
    if (!change || !groups.length) return
    setEdit(prev => {
      if (!prev) return prev
      const grp = groups.find(g => g.name === change.groupName)
      return { ...prev, groupSlug: grp?.slug ?? prev.groupSlug }
    })
  }, [change, groups])

  // Ctrl+S to save
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!isTerminal) save()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [edit, change])

  const sf = <K extends keyof EditState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setEdit(prev => prev ? { ...prev, [k]: e.target.value } : prev)
      setIsDirty(true)
    }

  const save = async () => {
    if (!edit || !change) return
    setSaving(true)
    try {
      const prevState = change.stateCode
      await changeApi.update(changeId, {
        title: edit.title,
        description: edit.description || undefined,
        rolloutPlan: edit.rolloutPlan || undefined,
        rollbackPlan: edit.rollbackPlan || undefined,
        impactNotes: edit.impactNotes || undefined,
        changeTypeCode: edit.changeTypeCode,
        riskCode: edit.riskCode,
        ownerExtId: edit.ownerExtId || undefined,
        approverExtId: edit.approverExtId || undefined,
        groupSlug: edit.groupSlug || undefined,
        cabName: edit.cabName || undefined,
        scheduledStart: edit.scheduledStart || undefined,
        scheduledEnd: edit.scheduledEnd || undefined,
        downtimeEstimate: edit.downtimeEstimate || undefined,
      })
      if (edit.stateCode !== prevState)
        await changeApi.setState(changeId, edit.stateCode)
      const updated = await changeApi.getById(changeId)
      const updatedComments = await changeApi.getComments(changeId).catch(() => [])
      setChange(updated); setEdit(toEdit(updated)); setIsDirty(false)
      setComments(updatedComments as Comment[])
      addToast('Change saved')
    } finally { setSaving(false) }
  }

  const submitNote = async () => {
    if (!noteBody.trim()) return
    await changeApi.postComment(changeId, authUser?.externalId ?? '', noteBody, true)
    addToast('Note added')
    setNoteBody('')
    setComments(await changeApi.getComments(changeId).catch(() => []) as Comment[])
  }

  const vote = async (voteCode: string) => {
    await changeApi.vote(changeId, authUser?.externalId ?? 'me', voteCode)
    addToast(`Vote "${voteCode}" recorded`)
    const updated = await changeApi.getById(changeId)
    setChange(updated); setEdit(toEdit(updated))
  }

  if (!change || !edit) return <SkeletonDetail />

  const isTerminal = change.stateCode === 'complete' || change.stateCode === 'rejected'
  const dis = isTerminal || saving
  const currentStep = CHANGE_STEPS.indexOf(change.stateCode)
  const isRejected = change.stateCode === 'rejected'

  const sel = `w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed`
  const inp = `w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed`

  const relative = (iso: string) => {
    const utc = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
    const m = Math.floor((Date.now() - new Date(utc).getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const formatDate = (iso: string) => {
    const utc = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
    const d = new Date(utc)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="flex h-full -mx-6 -mt-4 overflow-hidden">

      {/* LEFT: main content */}
      <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border-default px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <button onClick={closeChange} className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <ArrowLeft size={12} /> Back to changes
            </button>
            <span>·</span>
            <span className="font-mono font-medium text-text-secondary">{change.number}</span>
          </div>

          <input
            value={edit.title}
            onChange={sf('title')}
            disabled={dis}
            className="w-full text-2xl font-semibold text-text-primary bg-transparent border-0 outline-none focus:ring-0 disabled:cursor-not-allowed mb-2 placeholder:text-text-muted"
            placeholder="Change title"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={typeVariant(change.changeTypeCode) as any}>{change.changeTypeCode}</Badge>
            <Badge variant={riskVariant(change.riskCode) as any}>Risk: {change.riskCode}</Badge>
            <Badge variant="info">{change.stateName}</Badge>
            {change.updatedAt && (
              <span className="text-xs text-text-muted">Updated {relative(change.updatedAt)}</span>
            )}
          </div>

          {/* Workflow */}
          <div className="flex items-center gap-1 flex-wrap mt-2">
            {CHANGE_STEPS.map((s, i) => {
              const done = !isRejected && i < currentStep
              const current = i === currentStep && !isRejected
              return (
                <span key={s} className={`flex items-center gap-1 text-xs ${done ? 'text-[#1f8a4c]' : current ? 'text-accent font-medium' : 'text-text-muted'}`}>
                  {i > 0 && <span>›</span>}
                  {s.replace(/_/g, ' ')}
                </span>
              )
            })}
            {isRejected && <span className="ml-2 text-xs font-medium text-[#c8252b]">Rejected</span>}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-6 flex-1">

          {isTerminal && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 text-sm">
              <Lock size={14} className="shrink-0" />
              <span>This change is <strong>{change.stateName}</strong>. No further edits can be made.</span>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Description</h3>
            <textarea
              value={edit.description}
              onChange={sf('description')}
              disabled={dis}
              rows={6}
              placeholder="What is this change and why is it needed?"
              className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[23px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus disabled:opacity-60 disabled:cursor-not-allowed resize-none leading-relaxed"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Rollout Plan</h3>
            <textarea
              value={edit.rolloutPlan}
              onChange={sf('rolloutPlan')}
              disabled={dis}
              rows={4}
              placeholder="Step-by-step implementation plan…"
              className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[23px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus disabled:opacity-60 disabled:cursor-not-allowed resize-none leading-relaxed"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Rollback Plan</h3>
            <textarea
              value={edit.rollbackPlan}
              onChange={sf('rollbackPlan')}
              disabled={dis}
              rows={4}
              placeholder="How to revert if something goes wrong…"
              className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[23px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus disabled:opacity-60 disabled:cursor-not-allowed resize-none leading-relaxed"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Impact Notes</h3>
            <textarea
              value={edit.impactNotes}
              onChange={sf('impactNotes')}
              disabled={dis}
              rows={3}
              placeholder="Expected impact on services, users, or systems…"
              className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[23px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus disabled:opacity-60 disabled:cursor-not-allowed resize-none leading-relaxed"
            />
          </div>

          {/* Reviewers / Voting */}
          {(change.reviewers.length > 0 || change.stateCode === 'pending_approval') && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Reviewers</h3>
              <div className="flex flex-col gap-2">
                {change.reviewers.map(r => (
                  <div key={r.userId} className="flex items-center gap-2 text-sm">
                    <Avatar initials={r.userInitials} color={r.userColor} name={r.userName} size="sm" />
                    <span className="font-medium text-text-primary">{r.userName}</span>
                    {r.voteCode === 'approve' && <span className="flex items-center gap-1 text-[#1f8a4c] text-xs"><CheckCircle size={12} /> Approved</span>}
                    {r.voteCode === 'reject' && <span className="flex items-center gap-1 text-[#c8252b] text-xs"><XCircle size={12} /> Rejected</span>}
                    {r.comment && <span className="text-xs text-text-muted italic">"{r.comment}"</span>}
                    {r.votedAt && <span className="text-xs text-text-muted ml-auto">{relative(r.votedAt)}</span>}
                  </div>
                ))}
                {change.stateCode === 'pending_approval' && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => vote('approve')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e6f4ec] text-[#1f8a4c] border border-[#b6dcc4] rounded text-sm hover:bg-[#d1eadb] transition-colors">
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => vote('reject')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fdecec] text-[#c8252b] border border-[#f5c2c4] rounded text-sm hover:bg-[#fbd9d9] transition-colors">
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Note */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Add Note</h3>
            <div className={`border border-border-default rounded-lg overflow-hidden ${isTerminal ? 'opacity-50 pointer-events-none' : ''}`}>
              <textarea
                rows={3}
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitNote() }}
                disabled={isTerminal}
                placeholder={isTerminal ? 'Closed changes cannot receive new notes.' : 'Write a note…'}
                className="w-full px-3 py-2 text-sm text-text-primary bg-surface resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between px-3 py-2 bg-subtle">
                <span className="text-xs text-text-muted">⌘+⏎ to add</span>
                <button
                  onClick={submitNote}
                  disabled={isTerminal}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded font-medium"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>

          {/* Comments */}
          {comments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Notes ({comments.length})</h3>
              <div className="flex flex-col gap-3">
                {comments.map(c => (
                  <div key={c.commentId} className="flex gap-3">
                    <Avatar initials={c.authorInitials} color={c.authorColor} name={c.authorName} size="sm" />
                    <div className="flex-1 rounded-lg p-3 text-sm bg-[#fdf8e6] border border-[#f3d9a4]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text-primary text-xs">{c.authorName ?? 'Unknown'}</span>
                        <span className="text-[14px] text-[#b45309] bg-[#fdf3e3] px-1.5 py-0.5 rounded font-medium">NOTE</span>
                        <span className="text-xs text-text-muted ml-auto">{relative(c.createdAt)}</span>
                      </div>
                      <p className="text-text-secondary whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT: properties sidebar */}
      <div className="w-80 shrink-0 border-l border-border-default overflow-y-auto bg-surface flex flex-col">

        {!isTerminal && (
          <div className="sticky top-0 z-10 bg-surface border-b border-border-default p-3">
            <button
              onClick={save}
              disabled={saving}
              className={`w-full py-2 text-white text-sm font-semibold rounded-md transition-colors ${
                isDirty
                  ? 'bg-accent hover:bg-accent-hover ring-2 ring-accent/30'
                  : 'bg-accent hover:bg-accent-hover opacity-80'
              }`}
              title={isDirty ? 'You have unsaved changes (⌘S)' : 'Save (⌘S)'}
            >
              {saving ? 'Saving…' : isDirty ? 'Save Changes ●' : 'Save Changes'}
            </button>
          </div>
        )}

        <div className="p-4 flex flex-col gap-5">

          <div className="flex flex-col gap-2.5">
            <SbField label="State">
              <select value={edit.stateCode} onChange={sf('stateCode')} disabled={dis} className={sel}>
                {changeStates.length === 0
                  ? CHANGE_STEPS.concat(['rejected']).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)
                  : changeStates.map(s => <option key={s.code} value={s.code}>{s.displayName}</option>)
                }
              </select>
            </SbField>
            <SbField label="Change Type">
              <select value={edit.changeTypeCode} onChange={sf('changeTypeCode')} disabled={dis} className={sel}>
                {changeTypes.length === 0
                  ? ['normal', 'standard', 'emergency'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)
                  : changeTypes.map(ct => <option key={ct.code} value={ct.code}>{ct.displayName}</option>)
                }
              </select>
            </SbField>
            <SbField label="Risk Level">
              <select value={edit.riskCode} onChange={sf('riskCode')} disabled={dis} className={sel}>
                {risks.length === 0
                  ? ['low', 'medium', 'high'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)
                  : risks.map(r => <option key={r.code} value={r.code}>{r.displayName}</option>)
                }
              </select>
            </SbField>
            <SbField label="Owner">
              <select value={edit.ownerExtId} onChange={sf('ownerExtId')} disabled={dis} className={sel}>
                <option value="">— unassigned —</option>
                {users.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
              </select>
            </SbField>
            <SbField label="Approver">
              <select value={edit.approverExtId} onChange={sf('approverExtId')} disabled={dis} className={sel}>
                <option value="">— none —</option>
                {users.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
              </select>
            </SbField>
            <SbField label="Assignment Group">
              <select value={edit.groupSlug} onChange={sf('groupSlug')} disabled={dis} className={sel}>
                <option value="">— none —</option>
                {groups.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
              </select>
            </SbField>
          </div>

          <div className="flex flex-col gap-2.5">
            <SbField label="CAB Name">
              <input value={edit.cabName} onChange={sf('cabName')} disabled={dis} placeholder="e.g. Weekly CAB" className={inp} />
            </SbField>
            <SbField label="Scheduled Start">
              <input type="datetime-local" value={edit.scheduledStart} onChange={sf('scheduledStart')} disabled={dis} className={inp} />
            </SbField>
            <SbField label="Scheduled End">
              <input type="datetime-local" value={edit.scheduledEnd} onChange={sf('scheduledEnd')} disabled={dis} className={inp} />
            </SbField>
            <SbField label="Downtime Estimate">
              <input value={edit.downtimeEstimate} onChange={sf('downtimeEstimate')} disabled={dis} placeholder="e.g. 30 minutes" className={inp} />
            </SbField>
          </div>

          <div className="flex flex-col gap-2.5">
            {change.submittedAt && <SbInfo label="Submitted" value={formatDate(change.submittedAt)} />}
            {change.approvedAt && <SbInfo label="Approved" value={formatDate(change.approvedAt)} />}
            {change.completedAt && <SbInfo label="Completed" value={formatDate(change.completedAt)} />}
            {change.affectedServiceSlugs.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-text-muted mb-1.5">Affected Services</p>
                <div className="flex flex-wrap gap-1">
                  {change.affectedServiceSlugs.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-subtle border border-border-default rounded font-mono">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

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
