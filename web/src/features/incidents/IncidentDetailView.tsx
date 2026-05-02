import { useState, useEffect } from 'react'
import { ArrowLeft, Star, Share2, ChevronRight } from 'lucide-react'
import { incidentApi } from '../../api/incidents'
import { useAppStore } from '../../store/appStore'
import { Badge, priorityVariant, statusVariant } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { SlaBar } from '../../components/primitives/SlaBar'
import type { Incident, Comment, ActivityEvent } from '../../types'

interface Props { incidentId: number; addToast: (t: string) => void }

export function IncidentDetailView({ incidentId, addToast }: Props) {
  const { closeIncident } = useAppStore()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [timeline, setTimeline] = useState<ActivityEvent[]>([])
  const [replyBody, setReplyBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  useEffect(() => {
    incidentApi.getById(incidentId).then(setIncident)
    incidentApi.getComments(incidentId).then(setComments)
    incidentApi.getTimeline(incidentId).then(setTimeline)
  }, [incidentId])

  const submitComment = async () => {
    if (!replyBody.trim()) return
    await incidentApi.postComment(incidentId, 'me', replyBody, isInternal)
    addToast('Comment posted')
    setReplyBody('')
    const updated = await incidentApi.getComments(incidentId)
    setComments(updated)
  }

  const changeStatus = async (code: string) => {
    await incidentApi.setStatus(incidentId, code)
    addToast(`Status changed to ${code}`)
    incidentApi.getById(incidentId).then(setIncident)
  }

  if (!incident) return <div className="flex items-center justify-center h-64 text-text-muted">Loading…</div>

  return (
    <div className="flex gap-6 h-full">
      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">
        {/* Header */}
        <div>
          <button onClick={closeIncident} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-3">
            <ArrowLeft size={14} /> Back to incidents
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="tabular font-mono text-sm text-text-tertiary">{incident.number}</span>
            <button className="text-text-muted hover:text-text-secondary"><Star size={14} /></button>
            <button className="text-text-muted hover:text-text-secondary"><Share2 size={14} /></button>
            <div className="flex-1" />
            {/* SLA pill */}
            {incident.slaTargetMinutes && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-border-default text-xs">
                <span className="sla-pulse w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (incident.slaPercent ?? 0) >= 80 ? '#dc2626' : '#d97706' }} />
                <SlaBar percent={incident.slaPercent} breachedAt={incident.slaBreachedAt} targetMinutes={incident.slaTargetMinutes} startedAt={incident.slaStartedAt} pausedSeconds={incident.slaPausedSeconds} compact />
              </div>
            )}
            {/* Status progression */}
            {!['resolved', 'closed'].includes(incident.statusCode) && (
              <button
                onClick={() => changeStatus(incident.statusCode === 'new' ? 'progress' : 'resolved')}
                className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md font-medium"
              >
                {incident.statusCode === 'new' ? 'Start' : 'Resolve'}
              </button>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-text-primary leading-tight">{incident.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={priorityVariant(incident.priorityCode)}>{incident.priorityCode}</Badge>
            <Badge variant={statusVariant(incident.statusCode)}>{incident.statusCode}</Badge>
            {incident.reporterDisplay && <span className="text-xs text-text-secondary">by {incident.reporterDisplay}</span>}
            {incident.ciAssetTag && <span className="text-xs text-text-secondary">CI: {incident.ciAssetTag}</span>}
            <span className="text-xs text-text-muted">{new Date(incident.openedAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Description */}
        {incident.description && (
          <div className="bg-surface rounded-lg border border-border-default p-4 shadow-sm">
            <h3 className="text-sm font-medium text-text-primary mb-2">Description</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{incident.description}</p>
            {incident.stepsToReproduce && (
              <><h4 className="text-sm font-medium text-text-primary mt-3 mb-1">Steps to reproduce</h4>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{incident.stepsToReproduce}</p></>
            )}
          </div>
        )}

        {/* Activity */}
        <div className="bg-surface rounded-lg border border-border-default p-4 shadow-sm flex-1">
          <h3 className="text-sm font-medium text-text-primary mb-3">Activity</h3>
          <div className="flex flex-col gap-3 mb-4">
            {comments.map(c => (
              <div key={c.commentId} className={`flex gap-3 ${c.internal ? 'opacity-90' : ''}`}>
                <Avatar initials={c.authorInitials} color={c.authorColor} name={c.authorName} size="sm" />
                <div className={`flex-1 rounded-lg p-3 text-sm ${c.internal ? 'bg-[#fdf8e6] border border-[#f3d9a4]' : 'bg-subtle'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary text-xs">{c.authorName ?? c.authorDisplay ?? 'Unknown'}</span>
                    {c.internal && <span className="text-xs text-[#b45309] bg-[#fdf3e3] px-1.5 py-0.5 rounded">Internal</span>}
                    <span className="text-xs text-text-muted ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-text-secondary whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))}
            {timeline.filter(e => e.kind !== 'created' && e.kind !== 'commented').slice(0, 8).map(e => (
              <div key={e.activityId} className="flex gap-3 items-center">
                <Avatar initials={e.actorInitials} color={e.actorColor} name={e.actorName} size="sm" />
                <span className="text-xs text-text-secondary flex-1">
                  <span className="font-medium text-text-primary">{e.actorName ?? 'System'}</span>{' '}
                  {e.kind.replace(/_/g, ' ')}
                  {e.field && <> changed <span className="font-medium">{e.field}</span></>}
                  {e.newValue && <> → <span className="font-medium">{e.newValue}</span></>}
                </span>
                <span className="text-xs text-text-muted">{new Date(e.occurredAt).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Reply box */}
          <div className="border border-border-default rounded-lg overflow-hidden">
            <div className="flex border-b border-border-default">
              {['Reply', 'Internal note'].map((t, i) => (
                <button
                  key={t}
                  onClick={() => setIsInternal(i === 1)}
                  className={`px-4 py-2 text-sm border-r border-border-default last:border-r-0 transition-colors ${
                    isInternal === (i === 1) ? 'bg-subtle font-medium text-text-primary' : 'text-text-secondary hover:bg-hover'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitComment() }}
              placeholder={isInternal ? 'Internal note (visible to agents only)…' : 'Reply to reporter…'}
              className="w-full px-3 py-2 text-sm text-text-primary bg-transparent resize-none focus:outline-none"
            />
            <div className="flex items-center justify-between px-3 py-2 bg-subtle">
              <span className="text-xs text-text-muted">⌘+⏎ to send</span>
              <button onClick={submitComment} className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-md font-medium">
                {isInternal ? 'Add note' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">
        {/* Properties */}
        <div className="bg-surface rounded-lg border border-border-default p-4 shadow-sm">
          <h3 className="text-sm font-medium text-text-primary mb-3">Properties</h3>
          {[
            ['Status', <Badge variant={statusVariant(incident.statusCode)}>{incident.statusCode}</Badge>],
            ['Priority', <Badge variant={priorityVariant(incident.priorityCode)}>{incident.priorityCode}</Badge>],
            ['Assignee', incident.assigneeName ? (
              <div className="flex items-center gap-1.5">
                <Avatar initials={incident.assigneeInitials} color={incident.assigneeColor} size="sm" />
                <span className="text-sm text-text-secondary">{incident.assigneeName}</span>
              </div>
            ) : <span className="text-sm text-text-muted">Unassigned</span>],
            ['Group', <span className="text-sm text-text-secondary">{incident.groupName ?? '—'}</span>],
            ['Service', <span className="text-sm text-text-secondary">{incident.serviceName ?? '—'}</span>],
            ['Category', <span className="text-sm text-text-secondary">{incident.categoryName ?? '—'}</span>],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-start gap-2 py-1.5 border-b border-border-default last:border-b-0">
              <span className="text-xs text-text-muted w-20 shrink-0 pt-0.5">{label}</span>
              <div className="flex-1">{value}</div>
            </div>
          ))}
        </div>

        {/* Linked */}
        {incident.parentProblemNumber && (
          <div className="bg-surface rounded-lg border border-border-default p-4 shadow-sm">
            <h3 className="text-sm font-medium text-text-primary mb-2">Linked</h3>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="font-mono text-xs">{incident.parentProblemNumber}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
