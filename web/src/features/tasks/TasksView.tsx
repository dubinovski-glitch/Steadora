import { useState, useEffect } from 'react'
import { RefreshCw, Inbox, Plus } from 'lucide-react'
import { taskApi } from '../../api/tasks'
import { useAppStore } from '../../store/appStore'
import { Badge, priorityVariant } from '../../components/primitives/Badge'
import { Avatar } from '../../components/primitives/Avatar'
import { TYPE_LABEL, STATUS_LABEL, taskStatusVariant, prettySubtype } from './taskMeta'
import type { Task } from '../../types'

const SCOPE_LABEL: Record<'mine' | 'mygroup', string> = {
  mine: 'Assigned to me', mygroup: 'Assigned to my group',
}

// Compute a human "due" label + colour class from a due date: overdue (red),
// due today (amber), or "In Nd". Returns an em-dash when no due date is set.
function dueLabel(due: string | null): { text: string; cls: string } {
  if (!due) return { text: '—', cls: 'text-text-muted' }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due); d.setHours(0, 0, 0, 0)
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  if (days < 0)  return { text: `Overdue ${-days}d`, cls: 'text-[#c8252b] font-medium' }
  if (days === 0) return { text: 'Due today',         cls: 'text-[#d97706] font-medium' }
  return { text: `In ${days}d`, cls: 'text-text-secondary' }
}

interface Props { addToast: (m: string) => void }

// List view for tasks of the current type/scope (driven by the sidebar selection in the
// app store). Renders a header with refresh + "New task", and a table of tasks; clicking a
// row opens its detail. Scope is "mine" or "mygroup"; a manual `tick` re-triggers the fetch.
export function TasksView({ addToast }: Props) {
  const { taskType, taskMode, openTasks, openTask } = useAppStore()
  const scope: 'mine' | 'mygroup' = taskMode === 'mygroup' ? 'mygroup' : 'mine'

  const [tasks, setTasks]     = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick]       = useState(0)

  // Fetch tasks for the active type + scope; re-runs on type/scope/refresh changes.
  // Uses a `cancelled` flag to ignore stale responses after unmount or fast re-fetch.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    taskApi.list(taskType, scope)
      .then(r => { if (!cancelled) setTasks(r) })
      .catch(() => { if (!cancelled) addToast('Failed to load tasks') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [taskType, scope, tick, addToast])

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-text-primary">{TYPE_LABEL[taskType]} Tasks</h1>
          <span className="text-sm text-text-muted">{SCOPE_LABEL[scope]}</span>
          {!loading && <span className="text-sm text-text-muted">· {tasks.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTick(t => t + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-hover text-text-secondary"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => openTasks(taskType, 'new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={14} /> New task
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border-default bg-surface shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-subtle border-b border-border-default text-xs text-text-tertiary">
              <th className="px-3 py-2 text-left font-medium w-44">Task ID</th>
              <th className="px-3 py-2 text-left font-medium">Task</th>
              <th className="px-3 py-2 text-left font-medium w-28">Reference</th>
              <th className="px-3 py-2 text-left font-medium w-24">Priority</th>
              <th className="px-3 py-2 text-left font-medium w-28">Status</th>
              <th className="px-3 py-2 text-left font-medium w-28">Due</th>
              <th className="px-3 py-2 text-left font-medium w-36">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw size={20} className="animate-spin text-text-muted" />
                    <span className="text-text-muted text-sm">Loading tasks…</span>
                  </div>
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox size={24} className="text-text-muted" />
                    <span className="text-text-muted text-sm">No tasks found</span>
                  </div>
                </td>
              </tr>
            ) : tasks.map(t => {
              const due = dueLabel(t.dueDate)
              return (
                <tr key={t.taskId} onClick={() => openTask(t.taskId)} className="border-b border-border-default last:border-0 hover:bg-hover cursor-pointer transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-mono text-xs text-[#2563c9] bg-[#e7eefc] px-1.5 py-0.5 rounded">{t.number}</span>
                  </td>
                  <td className="px-3 py-2 text-text-primary font-medium">
                    {t.title}
                    {t.subtype && <span className="ml-2 text-xs font-normal text-text-muted">· {prettySubtype(t.subtype)}</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {t.referenceNumber
                      ? <span className="font-mono text-xs text-text-tertiary bg-subtle px-1.5 py-0.5 rounded">{t.referenceNumber}</span>
                      : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={priorityVariant(t.priorityCode)}>
                      {t.priorityCode.charAt(0).toUpperCase() + t.priorityCode.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={taskStatusVariant(t.statusCode)}>{STATUS_LABEL[t.statusCode] ?? t.statusCode}</Badge>
                  </td>
                  <td className="px-3 py-2"><span className={`text-sm tabular ${due.cls}`}>{due.text}</span></td>
                  <td className="px-3 py-2">
                    {t.assigneeName ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar initials={t.assigneeInitials} color={t.assigneeColor} size="sm" />
                        <span className="text-text-secondary text-sm truncate">{t.assigneeName.split(' ')[0]}</span>
                      </div>
                    ) : <span className="text-xs text-text-muted italic">Unassigned</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
