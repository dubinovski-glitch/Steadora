import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { problemApi } from '../../api/problems'
import { api } from '../../api/client'
import { useAppStore } from '../../store/appStore'
import type { User, Group } from '../../types'

interface Props { addToast: (t: string) => void }

const PRIORITIES = ['critical', 'high', 'medium', 'low']

interface FormState {
  title: string
  rootCause: string
  workaround: string
  priorityCode: string
  groupSlug: string
  assigneeExtId: string
  isKnownError: boolean
}

const INITIAL: FormState = {
  title: '',
  rootCause: '',
  workaround: '',
  priorityCode: 'medium',
  groupSlug: '',
  assigneeExtId: '',
  isKnownError: false,
}

export function NewProblemForm({ addToast }: Props) {
  const { setShowNewProblem, openProblem } = useAppStore()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [groupUsers, setGroupUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<User[]>('/users').catch(() => []),
      api.get<Group[]>('/users/groups').catch(() => []),
    ]).then(([usrs, grps]) => {
      setUsers(usrs as User[])
      setGroups(grps as Group[])
    }).finally(() => setLoadingData(false))
  }, [])

  useEffect(() => {
    if (!form.groupSlug) { setGroupUsers([]); setForm(f => ({ ...f, assigneeExtId: '' })); return }
    api.get<User[]>(`/users?groupSlug=${encodeURIComponent(form.groupSlug)}`)
      .then(us => {
        setGroupUsers(us)
        setForm(f => us.some(u => u.externalId === f.assigneeExtId) ? f : { ...f, assigneeExtId: '' })
      })
      .catch(() => setGroupUsers([]))
  }, [form.groupSlug])

  const close = () => setShowNewProblem(false)

  const sf = <K extends keyof FormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValidationErrors([])
      setForm(f => ({ ...f, [k]: e.target.value }))
    }

  const validate = (): string[] => {
    const missing: string[] = []
    if (!form.title.trim()) missing.push('Title')
    if (!form.groupSlug)    missing.push('Assignment Team')
    return missing
  }

  const submit = async () => {
    const missing = validate()
    if (missing.length > 0) { setValidationErrors(missing); return }
    setValidationErrors([])
    setSubmitting(true)
    try {
      const res = await problemApi.create({
        title: form.title,
        rootCause: form.rootCause || undefined,
        workaround: form.workaround || undefined,
        priorityCode: form.priorityCode,
        groupSlug: form.groupSlug || undefined,
        assigneeExtId: form.assigneeExtId || undefined,
        isKnownError: form.isKnownError,
      })
      addToast(`Created problem "${form.title.slice(0, 40)}${form.title.length > 40 ? '…' : ''}"`)
      openProblem(res.id)
    } finally {
      setSubmitting(false)
    }
  }

  const sel = 'w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed'
  const inp = sel

  return (
    <div className="flex h-full -mx-6 -mt-4 overflow-hidden">

      {/* ── LEFT: main content ── */}
      <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border-default px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <button onClick={close} className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <ArrowLeft size={12} /> Problems
            </button>
            <span>·</span>
            <span className="text-text-secondary">New Problem</span>
          </div>

          <input
            autoFocus
            value={form.title}
            onChange={sf('title')}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }}
            placeholder="Problem title"
            className="w-full text-2xl font-semibold text-text-primary bg-transparent border-0 outline-none focus:ring-0 mb-2 placeholder:text-text-muted"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">Investigating</span>
            <span className="text-xs text-text-muted">Problem ID will be auto-generated on submit</span>
            <div className="ml-auto">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isKnownError}
                  onChange={e => setForm(f => ({ ...f, isKnownError: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-accent"
                />
                <span className="font-medium text-text-secondary">Known Error</span>
              </label>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 flex flex-col gap-6 flex-1">
          {loadingData && <div className="text-sm text-text-muted text-center py-12">Loading…</div>}

          {!loadingData && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">Root Cause</h3>
                <textarea
                  value={form.rootCause}
                  onChange={sf('rootCause')}
                  rows={7}
                  placeholder="Describe the root cause of the problem…"
                  className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[15px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus resize-none leading-relaxed"
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">Workaround</h3>
                <textarea
                  value={form.workaround}
                  onChange={sf('workaround')}
                  rows={5}
                  placeholder="Describe any available workaround…"
                  className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[15px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus resize-none leading-relaxed"
                />
              </div>
            </>
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
            <button onClick={close} className="flex-1 py-2 border border-border-default rounded-md text-sm text-text-secondary hover:bg-hover transition-colors">
              Cancel
            </button>
            <button onClick={submit} disabled={submitting} className="flex-1 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-semibold rounded-md transition-colors">
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-5">

          {/* Properties */}
          <div className="flex flex-col gap-2.5">
            <SbField label="Priority">
              <select value={form.priorityCode} onChange={sf('priorityCode')} className={sel}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </SbField>
            <SbField label="Assignment Team" required>
              <select value={form.groupSlug} onChange={sf('groupSlug')} className={sel}>
                <option value="">— select —</option>
                {groups.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
              </select>
            </SbField>
            <SbField label="Assigned To">
              <select value={form.assigneeExtId} onChange={sf('assigneeExtId')} disabled={!form.groupSlug} className={sel}>
                <option value="">— unassigned —</option>
                {groupUsers.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
              </select>
            </SbField>
          </div>

        </div>
      </div>
    </div>
  )
}

function SbField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-muted mb-1.5">
        {required && <span className="text-red-500 mr-0.5">*</span>}
        {label}
      </p>
      {children}
    </div>
  )
}
