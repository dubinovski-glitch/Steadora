import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { changeApi } from '../../api/changes'
import { lookupsApi } from '../../api/lookups'
import { api } from '../../api/client'
import { useAppStore } from '../../store/appStore'
import { useAuthStore } from '../../store/authStore'
import { useWorkspaceFields } from '../../hooks/useWorkspaceFields'
import type { User, Group, ChangeType, Risk } from '../../types'

interface Props { addToast: (t: string) => void }

interface FormState {
  title: string
  description: string
  rolloutPlan: string
  rollbackPlan: string
  impactNotes: string
  changeTypeCode: string
  riskCode: string
  ownerExtId: string
  approverExtId: string
  groupSlug: string
  cabName: string
  scheduledStart: string
  scheduledEnd: string
  downtimeEstimate: string
}

const INITIAL: FormState = {
  title: '',
  description: '',
  rolloutPlan: '',
  rollbackPlan: '',
  impactNotes: '',
  changeTypeCode: 'normal',
  riskCode: 'medium',
  ownerExtId: '',
  approverExtId: '',
  groupSlug: '',
  cabName: '',
  scheduledStart: '',
  scheduledEnd: '',
  downtimeEstimate: '',
}

export function NewChangeForm({ addToast }: Props) {
  const { setShowNewChange, openChange } = useAppStore()
  const { user: authUser } = useAuthStore()
  const fc = useWorkspaceFields()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [changeTypes, setChangeTypes] = useState<ChangeType[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<User[]>('/users').catch(() => []),
      api.get<Group[]>('/users/groups').catch(() => []),
      lookupsApi.getChangeTypes().catch(() => []),
      lookupsApi.getRisks().catch(() => []),
    ]).then(([usrs, grps, cts, rks]) => {
      setUsers(usrs as User[])
      setGroups(grps as Group[])
      setChangeTypes(cts as ChangeType[])
      setRisks(rks as Risk[])
      if (authUser) setForm(f => ({ ...f, ownerExtId: authUser.externalId }))
    }).finally(() => setLoadingData(false))
  }, [])

  const close = () => setShowNewChange(false)

  const sf = <K extends keyof FormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValidationErrors([])
      setForm(f => ({ ...f, [k]: e.target.value }))
    }

  const validate = (): string[] => {
    const missing: string[] = []
    if (!form.title.trim()) missing.push('Title')
    if (fc('change', 'description').mandatory && !form.description.trim()) missing.push('Description')
    if (fc('change', 'rolloutPlan').mandatory && !form.rolloutPlan.trim()) missing.push('Rollout Plan')
    if (fc('change', 'rollbackPlan').mandatory && !form.rollbackPlan.trim()) missing.push('Rollback Plan')
    if (fc('change', 'group').mandatory && !form.groupSlug) missing.push('Assignment Group')
    if (fc('change', 'owner').mandatory && !form.ownerExtId) missing.push('Owner')
    return missing
  }

  const submit = async () => {
    const missing = validate()
    if (missing.length > 0) { setValidationErrors(missing); return }
    setValidationErrors([])
    setSubmitting(true)
    try {
      const res = await changeApi.create({
        title: form.title,
        description: form.description || undefined,
        rolloutPlan: form.rolloutPlan || undefined,
        rollbackPlan: form.rollbackPlan || undefined,
        impactNotes: form.impactNotes || undefined,
        changeTypeCode: form.changeTypeCode,
        riskCode: form.riskCode,
        ownerExtId: form.ownerExtId || undefined,
        approverExtId: form.approverExtId || undefined,
        groupSlug: form.groupSlug || undefined,
        cabName: form.cabName || undefined,
        scheduledStart: form.scheduledStart || undefined,
        scheduledEnd: form.scheduledEnd || undefined,
        downtimeEstimate: form.downtimeEstimate || undefined,
      })
      addToast(`Created change — "${form.title.slice(0, 36)}${form.title.length > 36 ? '…' : ''}"`)
      close()
      openChange(res.id)
    } finally {
      setSubmitting(false)
    }
  }

  const sel = `w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed`
  const inp = `w-full text-sm font-medium text-text-primary bg-surface border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed`

  return (
    <div className="flex h-full -mx-6 -mt-4 overflow-hidden">

      {/* LEFT: main content */}
      <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">

        <div className="sticky top-0 z-10 bg-surface border-b border-border-default px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <button onClick={close} className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <ArrowLeft size={12} /> Changes
            </button>
            <span>·</span>
            <span className="text-text-secondary">New Change</span>
          </div>

          <input
            autoFocus
            value={form.title}
            onChange={sf('title')}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }}
            placeholder="Change title"
            className="w-full text-2xl font-semibold text-text-primary bg-transparent border-0 outline-none focus:ring-0 mb-2 placeholder:text-text-muted"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">Draft</span>
            <span className="text-xs text-text-muted">Change ID will be auto-generated on submit</span>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6 flex-1">
          {loadingData ? (
            <div className="text-sm text-text-muted text-center py-12">Loading form data…</div>
          ) : (
            <>
              {fc('change', 'description').visible && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    Description{fc('change', 'description').mandatory && <span className="text-red-400 ml-0.5">*</span>}
                  </h3>
                  <textarea
                    value={form.description}
                    onChange={sf('description')}
                    rows={6}
                    placeholder="What is this change and why is it needed?"
                    className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[23px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus resize-none leading-relaxed"
                  />
                </div>
              )}

              {fc('change', 'rolloutPlan').visible && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    Rollout Plan{fc('change', 'rolloutPlan').mandatory && <span className="text-red-400 ml-0.5">*</span>}
                  </h3>
                  <textarea
                    value={form.rolloutPlan}
                    onChange={sf('rolloutPlan')}
                    rows={4}
                    placeholder="Step-by-step implementation plan…"
                    className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[23px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus resize-none leading-relaxed"
                  />
                </div>
              )}

              {fc('change', 'rollbackPlan').visible && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    Rollback Plan{fc('change', 'rollbackPlan').mandatory && <span className="text-red-400 ml-0.5">*</span>}
                  </h3>
                  <textarea
                    value={form.rollbackPlan}
                    onChange={sf('rollbackPlan')}
                    rows={4}
                    placeholder="How to revert if something goes wrong…"
                    className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[23px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus resize-none leading-relaxed"
                  />
                </div>
              )}

              {fc('change', 'impactNotes').visible && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    Impact Notes{fc('change', 'impactNotes').mandatory && <span className="text-red-400 ml-0.5">*</span>}
                  </h3>
                  <textarea
                    value={form.impactNotes}
                    onChange={sf('impactNotes')}
                    rows={3}
                    placeholder="Expected impact on services, users, or systems…"
                    className="w-full px-3 py-2.5 border border-border-default rounded-lg text-[23px] text-text-primary bg-transparent focus:outline-none focus:border-border-focus resize-none leading-relaxed"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT: sidebar */}
      <div className="w-80 shrink-0 border-l border-border-default overflow-y-auto bg-surface flex flex-col">

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

          <div className="flex flex-col gap-2.5">
            {fc('change', 'changeType').visible && (
              <SbField label="Change Type" required={fc('change', 'changeType').mandatory}>
                <select value={form.changeTypeCode} onChange={sf('changeTypeCode')} className={sel}>
                  {changeTypes.length === 0
                    ? ['normal', 'standard', 'emergency'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)
                    : changeTypes.map(ct => <option key={ct.code} value={ct.code}>{ct.displayName}</option>)
                  }
                </select>
              </SbField>
            )}
            {fc('change', 'risk').visible && (
              <SbField label="Risk Level" required={fc('change', 'risk').mandatory}>
                <select value={form.riskCode} onChange={sf('riskCode')} className={sel}>
                  {risks.length === 0
                    ? ['low', 'medium', 'high'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)
                    : risks.map(r => <option key={r.code} value={r.code}>{r.displayName}</option>)
                  }
                </select>
              </SbField>
            )}
            {fc('change', 'owner').visible && (
              <SbField label="Owner" required={fc('change', 'owner').mandatory}>
                <select value={form.ownerExtId} onChange={sf('ownerExtId')} className={sel}>
                  <option value="">— unassigned —</option>
                  {users.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
                </select>
              </SbField>
            )}
            {fc('change', 'approver').visible && (
              <SbField label="Approver" required={fc('change', 'approver').mandatory}>
                <select value={form.approverExtId} onChange={sf('approverExtId')} className={sel}>
                  <option value="">— none —</option>
                  {users.map(u => <option key={u.externalId} value={u.externalId}>{u.displayName}</option>)}
                </select>
              </SbField>
            )}
            {fc('change', 'group').visible && (
              <SbField label="Assignment Group" required={fc('change', 'group').mandatory}>
                <select value={form.groupSlug} onChange={sf('groupSlug')} className={sel}>
                  <option value="">— none —</option>
                  {groups.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
                </select>
              </SbField>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {fc('change', 'cabName').visible && (
              <SbField label="CAB Name" required={fc('change', 'cabName').mandatory}>
                <input value={form.cabName} onChange={sf('cabName')} placeholder="e.g. Weekly CAB" className={inp} />
              </SbField>
            )}
            {fc('change', 'scheduledStart').visible && (
              <SbField label="Scheduled Start" required={fc('change', 'scheduledStart').mandatory}>
                <input type="datetime-local" value={form.scheduledStart} onChange={sf('scheduledStart')} className={inp} />
              </SbField>
            )}
            {fc('change', 'scheduledEnd').visible && (
              <SbField label="Scheduled End" required={fc('change', 'scheduledEnd').mandatory}>
                <input type="datetime-local" value={form.scheduledEnd} onChange={sf('scheduledEnd')} className={inp} />
              </SbField>
            )}
            {fc('change', 'downtimeEstimate').visible && (
              <SbField label="Downtime Estimate" required={fc('change', 'downtimeEstimate').mandatory}>
                <input value={form.downtimeEstimate} onChange={sf('downtimeEstimate')} placeholder="e.g. 30 minutes" className={inp} />
              </SbField>
            )}
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
        {required && <span className="text-red-400 mr-0.5">*</span>}
        {label}
      </p>
      {children}
    </div>
  )
}
