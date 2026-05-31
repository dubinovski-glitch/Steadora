import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Plus } from 'lucide-react'
import { changeApi } from '../../api/changes'
import { Badge } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { SkeletonCards } from '../../components/primitives/Skeleton'
import { useAppStore } from '../../store/appStore'
import { ChangeDetailView } from './ChangeDetailView'
import { NewChangeForm } from './NewChangeForm'
import type { Change } from '../../types'

const CHANGE_STEPS = ['draft', 'in_review', 'pending_approval', 'approved', 'scheduled', 'implementing', 'complete']

const TABS = [
  { key: '', label: 'Active' },
  { key: 'pending_approval', label: 'Pending approval' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'all', label: 'All' },
]

const riskVariant = (code: string) => code === 'high' ? 'critical' : code === 'medium' ? 'high' : 'low'
const typeVariant = (code: string) => code === 'emergency' ? 'critical' : code === 'normal' ? 'medium' : 'low'

interface Props { addToast: (t: string) => void }

export function ChangesView({ addToast }: Props) {
  const { openChangeId, showNewChange, openChange, setShowNewChange } = useAppStore()

  if (openChangeId !== null)
    return <ChangeDetailView changeId={openChangeId} addToast={addToast} />

  if (showNewChange)
    return <NewChangeForm addToast={addToast} />

  return <ChangesList addToast={addToast} openChange={openChange} setShowNewChange={setShowNewChange} />
}

function ChangesList({
  addToast,
  openChange,
  setShowNewChange,
}: {
  addToast: (t: string) => void
  openChange: (id: number) => void
  setShowNewChange: (v: boolean) => void
}) {
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const state = tab && tab !== 'all' ? tab : undefined
      setChanges(await changeApi.getAll(state))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab])

  const vote = async (changeId: number, voteCode: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await changeApi.vote(changeId, 'me', voteCode)
    addToast(`Vote "${voteCode}" recorded`)
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Change management</h1>
        <button
          onClick={() => setShowNewChange(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={14} /> New Change
        </button>
      </div>

      <div className="flex gap-1 border-b border-border-default">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${tab === t.key ? 'border-accent text-accent-text font-medium' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonCards cards={4} cols={3} />
      ) : (
        <div className="flex flex-col gap-3 list-font">
          {changes.map((c, idx) => (
            <ChangeCard
              key={c.changeId}
              change={c}
              onVote={vote}
              idx={idx}
              onClick={() => openChange(c.changeId)}
            />
          ))}
          {changes.length === 0 && <div className="py-12 text-center text-text-muted">No changes found</div>}
        </div>
      )}
    </div>
  )
}

function ChangeCard({
  change: c,
  onVote,
  idx,
  onClick,
}: {
  change: Change
  onVote: (id: number, vote: string, e: React.MouseEvent) => void
  idx: number
  onClick: () => void
}) {
  const currentStep = CHANGE_STEPS.indexOf(c.stateCode)
  const isRejected = c.stateCode === 'rejected'

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-border-default shadow-sm overflow-hidden cursor-pointer hover:border-accent/40 hover:shadow-md transition-all ${idx % 2 === 1 ? 'bg-subtle' : 'bg-surface'}`}
    >
      {/* Top strip */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
        <span className="tabular font-mono text-text-primary">{c.number}</span>
        <Badge variant={typeVariant(c.changeTypeCode) as any}>{c.changeTypeCode}</Badge>
        <Badge variant={riskVariant(c.riskCode) as any}>Risk: {c.riskCode}</Badge>
        <Badge variant="info">{c.stateName}</Badge>
        <span className="flex-1 font-medium text-text-primary">{c.title}</span>
        {c.scheduledStart && (
          <span className="text-text-secondary flex items-center gap-1 text-xs">
            <Clock size={12} /> {new Date(c.scheduledStart).toLocaleDateString()}
            {c.scheduledEnd && <> – {new Date(c.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="grid grid-cols-3 gap-4 px-4 py-3">
        {/* Workflow */}
        <div>
          <div className="text-xs text-text-tertiary mb-2 font-medium">Workflow</div>
          <div className="flex items-center gap-1 flex-wrap">
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
          </div>
        </div>

        {/* People */}
        <div>
          <div className="text-xs text-text-tertiary mb-2 font-medium">People</div>
          <div className="flex flex-col gap-1 text-xs">
            {c.ownerName && <div className="flex items-center gap-1.5"><Avatar initials={c.ownerInitials} color={c.ownerColor} size="sm" /><span className="text-text-secondary">Owner: {c.ownerName}</span></div>}
            {c.approverName && <div className="flex items-center gap-1.5 text-text-secondary"><span>Approver: {c.approverName}</span></div>}
            {c.reviewers.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {c.reviewers.map(r => (
                  <span key={r.userId} title={`${r.userName}: ${r.voteCode}`}>
                    <Avatar initials={r.userInitials} color={r.userColor} size="sm" />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Decision */}
        <div>
          <div className="text-xs text-text-tertiary mb-2 font-medium">Decision</div>
          {c.stateCode === 'pending_approval' && (
            <div className="flex gap-2">
              <button onClick={e => onVote(c.changeId, 'approve', e)} className="flex items-center gap-1.5 px-2 py-1 bg-[#e6f4ec] text-[#1f8a4c] border border-[#b6dcc4] rounded text-xs hover:bg-[#d1eadb] transition-colors">
                <CheckCircle size={12} /> Approve
              </button>
              <button onClick={e => onVote(c.changeId, 'reject', e)} className="flex items-center gap-1.5 px-2 py-1 bg-[#fdecec] text-[#c8252b] border border-[#f5c2c4] rounded text-xs hover:bg-[#fbd9d9] transition-colors">
                <XCircle size={12} /> Reject
              </button>
            </div>
          )}
          {isRejected && <span className="text-xs text-[#c8252b]">Rejected</span>}
          {c.stateCode === 'complete' && <span className="text-xs text-[#1f8a4c] flex items-center gap-1"><CheckCircle size={12} /> Completed</span>}
          {c.cabName && <div className="text-xs text-text-secondary mt-1">CAB: {c.cabName}</div>}
        </div>
      </div>
    </div>
  )
}
