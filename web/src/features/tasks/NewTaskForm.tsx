import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { taskApi } from '../../api/tasks'
import type { LinkRecordType, LinkableRecord } from '../../api/tasks'
import { lookupsApi } from '../../api/lookups'
import { api } from '../../api/client'
import { TYPE_LABEL, SUBTYPES, SUBTYPE_LABEL, STATUSES } from './taskMeta'
import type { Priority, User, Group } from '../../types'

interface Props { addToast: (m: string) => void }

// Create form for a new task of the current type (from the app store). Loads lookups
// (next number, priorities, users, groups), offers a typeahead to optionally link a
// record (incident/problem/change), validates the title, then creates the task and
// navigates to the "Assigned to me" list for that type.
export function NewTaskForm({ addToast }: Props) {
  const { taskType, openTasks } = useAppStore()

  const [nextId, setNextId]       = useState('Auto-generated')
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [users, setUsers]         = useState<User[]>([])
  const [groups, setGroups]       = useState<Group[]>([])

  const [title, setTitle]       = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignee, setAssignee] = useState<number | ''>('')
  const [groupId, setGroupId]   = useState<number | ''>('')
  const [status, setStatus]     = useState('open')
  const [onHoldReason, setOnHoldReason] = useState('')
  const [subtype, setSubtype]   = useState('')
  const [plannedStart, setPlannedStart] = useState('')
  const [plannedEnd, setPlannedEnd]     = useState('')
  const [due, setDue]           = useState('')
  const [desc, setDesc]         = useState('')
  const [saving, setSaving]     = useState(false)

  // Linked record (search an incident/problem/change to attach to this task)
  const [linkType, setLinkType]       = useState<LinkRecordType>(taskType === 'general' ? 'incident' : taskType)
  const [linkSearch, setLinkSearch]   = useState('')
  const [linkResults, setLinkResults] = useState<LinkableRecord[]>([])
  const [linked, setLinked]           = useState<LinkableRecord | null>(null)

  // On task-type change: load the auto-generated number and dropdown lookups, and
  // reset the link picker + subtype since both are type-specific.
  useEffect(() => {
    taskApi.nextNumber(taskType).then(r => setNextId(r.number)).catch(() => {})
    lookupsApi.getPriorities().then(setPriorities).catch(() => {})
    api.get<User[]>('/users').then(setUsers).catch(() => {})
    api.get<Group[]>('/users/groups').then(setGroups).catch(() => {})
    // A typed task links only to its own record type; general can link to any
    setLinkType(taskType === 'general' ? 'incident' : taskType)
    setLinked(null); setLinkSearch(''); setLinkResults([])
    setSubtype('')  // type-specific options differ per task type
  }, [taskType])

  // Debounced typeahead for the linked record
  useEffect(() => {
    if (linked || linkSearch.trim().length < 1) { setLinkResults([]); return }
    const id = setTimeout(() => {
      taskApi.searchRecords(linkType, linkSearch.trim()).then(setLinkResults).catch(() => setLinkResults([]))
    }, 250)
    return () => clearTimeout(id)
  }, [linkSearch, linkType, linked])

  // Validate the title, build the create payload (change tasks add a planned window;
  // on-hold adds a reason; an optional linked record's number is attached), then
  // create the task and navigate to the type's "Assigned to me" list.
  const submit = async () => {
    if (!title.trim()) { addToast('Task title is required'); return }
    setSaving(true)
    try {
      const r = await taskApi.create({
        taskType,
        title: title.trim(),
        priorityCode: priority,
        referenceNumber: linked?.number ?? null,
        assigneeUserId: assignee || undefined,
        groupId: groupId || undefined,
        statusCode: status,
        onHoldReason: status === 'onhold' ? (onHoldReason || undefined) : undefined,
        subtype: subtype || undefined,
        plannedStart: taskType === 'change' ? (plannedStart || null) : null,
        plannedEnd:   taskType === 'change' ? (plannedEnd || null)   : null,
        dueDate: due || null,
        description: desc || undefined,
      })
      addToast(`Created task ${r.number}`)
      openTasks(taskType, 'mine')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  const lbl = 'block text-xs font-medium text-text-secondary mb-1'
  const inp = 'w-full px-3 py-2 border border-border-default rounded-md text-sm bg-surface focus:outline-none focus:border-border-focus'

  // A typed task implies its record type — no picker needed; general can pick any
  const isGeneral = taskType === 'general'
  const linkLabel = isGeneral ? 'Linked record' : `Linked ${TYPE_LABEL[taskType].toLowerCase()}`

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <button onClick={() => openTasks(taskType, 'mine')} className="hover:text-text-primary transition-colors">{TYPE_LABEL[taskType]} Tasks</button>
          <span>·</span>
          <span className="text-text-primary font-medium">New task</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openTasks(taskType, 'mine')} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {saving ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl w-full rounded-lg border border-border-default bg-surface shadow-sm p-6 flex flex-col gap-4">
        {/* Task ID — read-only, auto-generated */}
        <div>
          <label className={lbl}>Task ID <span className="text-text-muted font-normal">(auto-generated)</span></label>
          <input value={nextId} readOnly className={`${inp} font-mono bg-subtle text-text-tertiary cursor-default`} />
        </div>

        {/* Title */}
        <div>
          <label className={lbl}>Task title <span className="text-[#dc2626]">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)} autoFocus className={inp} placeholder="What needs to be done?" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className={lbl}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className={inp}>
              {priorities.length === 0
                ? <option value="medium">Medium</option>
                : priorities.map(p => <option key={p.code} value={p.code}>{p.displayName}</option>)}
            </select>
          </div>
          {/* Due date */}
          <div>
            <label className={lbl}>Due date</label>
            <input type="date" value={due} onChange={e => setDue(e.target.value)} className={inp} />
          </div>
        </div>

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
              <label className={lbl}>{SUBTYPE_LABEL[taskType]}</label>
              <select value={subtype} onChange={e => setSubtype(e.target.value)} className={inp}>
                <option value="">— None —</option>
                {SUBTYPES[taskType].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* On-hold reason — only when On Hold */}
        {status === 'onhold' && (
          <div>
            <label className={lbl}>On-hold reason</label>
            <input value={onHoldReason} onChange={e => setOnHoldReason(e.target.value)} className={inp} placeholder="Why is this on hold?" />
          </div>
        )}

        {/* Change tasks: scheduled window */}
        {taskType === 'change' && (
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

        {/* Linked record — search an incident/problem/change to attach */}
        <div>
          <label className={lbl}>{linkLabel} <span className="text-text-muted font-normal">(optional)</span></label>
          {linked ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border border-border-default rounded-md bg-subtle">
              <span className="text-sm truncate">
                <span className="font-mono text-[#2563c9]">{linked.number}</span>
                <span className="text-text-secondary"> — {linked.title}</span>
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
