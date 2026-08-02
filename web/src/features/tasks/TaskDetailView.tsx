import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { taskApi } from '../../api/tasks'
import type { LinkRecordType, LinkableRecord } from '../../api/tasks'
import { lookupsApi } from '../../api/lookups'
import { api } from '../../api/client'
import { TYPE_LABEL, SUBTYPES, SUBTYPE_LABEL, STATUSES } from './taskMeta'
import type { Priority, User, Group, Task } from '../../types'

interface Props { taskId: number; addToast: (m: string) => void }

// Detail/edit view for a single task. Loads the task plus lookups (priorities, users,
// groups), seeds the editable form fields, supports a linked-record typeahead, and on
// save patches the task via the API and returns to the list. Shows a loading spinner first.
export function TaskDetailView({ taskId, addToast }: Props) {
  const { closeTask, taskType: storeType } = useAppStore()

  const [task, setTask]       = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [users, setUsers]     = useState<User[]>([])
  const [groups, setGroups]   = useState<Group[]>([])

  const [title, setTitle]       = useState('')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus]     = useState('open')
  const [onHoldReason, setOnHoldReason] = useState('')
  const [subtype, setSubtype]   = useState('')
  const [assignee, setAssignee] = useState<number | ''>('')
  const [groupId, setGroupId]   = useState<number | ''>('')
  const [due, setDue]           = useState('')
  const [plannedStart, setPlannedStart] = useState('')
  const [plannedEnd, setPlannedEnd]     = useState('')
  const [desc, setDesc]         = useState('')
  const [saving, setSaving]     = useState(false)

  // Linked record
  const [linked, setLinked]           = useState<LinkableRecord | null>(null)
  const [linkType, setLinkType]       = useState<LinkRecordType>('incident')
  const [linkSearch, setLinkSearch]   = useState('')
  const [linkResults, setLinkResults] = useState<LinkableRecord[]>([])

  // Load lookups and the task itself, then populate every editable field from the
  // fetched record (including the linked reference number). Re-runs when taskId changes.
  useEffect(() => {
    setLoading(true)
    lookupsApi.getPriorities().then(setPriorities).catch(() => {})
    api.get<User[]>('/users').then(setUsers).catch(() => {})
    api.get<Group[]>('/users/groups').then(setGroups).catch(() => {})
    taskApi.get(taskId).then(t => {
      setTask(t)
      setTitle(t.title); setPriority(t.priorityCode); setStatus(t.statusCode)
      setOnHoldReason(t.onHoldReason ?? ''); setSubtype(t.subtype ?? '')
      setAssignee(t.assigneeUserId ?? ''); setGroupId(t.groupId ?? '')
      setDue((t.dueDate ?? '').slice(0, 10))
      setPlannedStart((t.plannedStart ?? '').slice(0, 10))
      setPlannedEnd((t.plannedEnd ?? '').slice(0, 10))
      setDesc(t.description ?? '')
      setLinkType(t.taskType === 'general' ? 'incident' : (t.taskType as LinkRecordType))
      setLinked(t.referenceNumber ? { number: t.referenceNumber, title: '' } : null)
    }).catch(() => addToast('Failed to load task')).finally(() => setLoading(false))
  }, [taskId, addToast])

  // Debounced typeahead for the linked record
  useEffect(() => {
    if (linked || linkSearch.trim().length < 1) { setLinkResults([]); return }
    const id = setTimeout(() => {
      taskApi.searchRecords(linkType, linkSearch.trim()).then(setLinkResults).catch(() => setLinkResults([]))
    }, 250)
    return () => clearTimeout(id)
  }, [linkSearch, linkType, linked])

  const tType = task?.taskType ?? storeType
  const isGeneral = tType === 'general'
  const linkLabel = isGeneral ? 'Linked record' : `Linked ${TYPE_LABEL[tType].toLowerCase()}`

  // Validate the title, send the full updated field set to the API (change tasks include
  // the planned window; on-hold includes a reason), then toast and close back to the list.
  const save = async () => {
    if (!title.trim()) { addToast('Task title is required'); return }
    setSaving(true)
    try {
      await taskApi.update(taskId, {
        title: title.trim(),
        priorityCode: priority,
        statusCode: status,
        onHoldReason: status === 'onhold' ? (onHoldReason || null) : null,
        assigneeUserId: assignee || null,
        groupId: groupId || null,
        dueDate: due || null,
        subtype: subtype || null,
        referenceNumber: linked?.number ?? null,
        plannedStart: tType === 'change' ? (plannedStart || null) : null,
        plannedEnd:   tType === 'change' ? (plannedEnd || null)   : null,
        description: desc || null,
      })
      addToast(`Task ${task?.number ?? ''} updated`)
      closeTask()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  const lbl = 'block text-xs font-medium text-text-secondary mb-1'
  const inp = 'w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none focus:border-border-focus'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
        <RefreshCw size={22} className="animate-spin" />
        <span className="text-sm">Loading task…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <button onClick={closeTask} className="hover:text-text-primary transition-colors">{TYPE_LABEL[tType]} Tasks</button>
          <span>·</span>
          <span className="font-mono text-[#2563c9]">{task?.number}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={closeTask} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl w-full rounded-lg border border-border-default bg-surface shadow-sm p-6 flex flex-col gap-4">
        {/* Identity */}
        <div className="flex items-center gap-3 pb-1">
          <span className="font-mono text-sm text-[#2563c9] bg-[#e7eefc] px-2 py-0.5 rounded">{task?.number}</span>
          <span className="text-xs text-text-muted">{TYPE_LABEL[tType]} task</span>
        </div>

        {/* Title */}
        <div>
          <label className={lbl}>Task title <span className="text-[#dc2626]">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={inp} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className={inp}>
              {priorities.length === 0
                ? <option value={priority}>{priority}</option>
                : priorities.map(p => <option key={p.code} value={p.code}>{p.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Due date</label>
            <input type="date" value={due} onChange={e => setDue(e.target.value)} className={inp} />
          </div>
        </div>

        {/* State + type-specific category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>State</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inp}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {!isGeneral && (
            <div>
              <label className={lbl}>{SUBTYPE_LABEL[tType]}</label>
              <select value={subtype} onChange={e => setSubtype(e.target.value)} className={inp}>
                <option value="">— None —</option>
                {SUBTYPES[tType].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {status === 'onhold' && (
          <div>
            <label className={lbl}>On-hold reason</label>
            <input value={onHoldReason} onChange={e => setOnHoldReason(e.target.value)} className={inp} placeholder="Why is this on hold?" />
          </div>
        )}

        {tType === 'change' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Planned start</label>
              <input type="date" value={plannedStart} onChange={e => setPlannedStart(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Planned end</label>
              <input type="date" value={plannedEnd} onChange={e => setPlannedEnd(e.target.value)} className={inp} />
            </div>
          </div>
        )}

        {/* Assignee + Assignment group */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Assignee</label>
            <select value={assignee} onChange={e => setAssignee(e.target.value ? Number(e.target.value) : '')} className={inp}>
              <option value="">— Unassigned —</option>
              {users.map(u => <option key={u.userId} value={u.userId}>{u.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Assignment group</label>
            <select value={groupId} onChange={e => setGroupId(e.target.value ? Number(e.target.value) : '')} className={inp}>
              <option value="">— None —</option>
              {groups.filter(g => g.isActive).map(g => <option key={g.groupId} value={g.groupId}>{g.name}</option>)}
            </select>
          </div>
        </div>

        {/* Linked record */}
        <div>
          <label className={lbl}>{linkLabel} <span className="text-text-muted font-normal">(optional)</span></label>
          {linked ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border border-border-default rounded-md bg-subtle">
              <span className="text-sm truncate">
                <span className="font-mono text-[#2563c9]">{linked.number}</span>
                {linked.title && <span className="text-text-secondary"> — {linked.title}</span>}
              </span>
              <button type="button" onClick={() => { setLinked(null); setLinkSearch('') }} className="text-text-muted hover:text-text-primary shrink-0" title="Unlink">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {isGeneral && (
                <select
                  value={linkType}
                  onChange={e => { setLinkType(e.target.value as LinkRecordType); setLinkResults([]) }}
                  className="w-32 shrink-0 px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none focus:border-border-focus"
                >
                  <option value="incident">Incident</option>
                  <option value="problem">Problem</option>
                  <option value="change">Change</option>
                </select>
              )}
              <div className="relative flex-1">
                <input
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                  placeholder={`Search ${linkType}s by number or title…`}
                  className={inp}
                />
                {linkResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border-default rounded-md shadow-lg max-h-56 overflow-y-auto">
                    {linkResults.map(r => (
                      <button
                        type="button"
                        key={r.number}
                        onClick={() => { setLinked(r); setLinkResults([]); setLinkSearch('') }}
                        className="w-full text-left px-3 py-2 hover:bg-hover text-sm flex gap-2 items-center"
                      >
                        <span className="font-mono text-[#2563c9] shrink-0">{r.number}</span>
                        <span className="text-text-secondary truncate">{r.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className={lbl}>Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={5} className={inp} placeholder="Add any context or steps…" />
        </div>
      </div>
    </div>
  )
}
