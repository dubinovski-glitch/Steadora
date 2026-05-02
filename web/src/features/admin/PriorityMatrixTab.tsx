import { useState, useEffect } from 'react'
import { adminApi } from '../../api/admin'
import type { PriorityMatrixRow } from '../../types'

interface Props { addToast: (msg: string) => void }

const IMPACTS  = [{ id: 1, label: 'Low' }, { id: 2, label: 'Medium' }, { id: 3, label: 'High' }]
const URGENCIES = [{ id: 1, label: 'Low' }, { id: 2, label: 'Medium' }, { id: 3, label: 'High' }]

// priorityId → display info
const PRIORITIES: Record<number, { label: string; cellClass: string; badgeClass: string }> = {
  1: { label: 'Low',      cellClass: 'bg-subtle',                          badgeClass: 'bg-subtle text-text-muted border border-border-default' },
  2: { label: 'Medium',   cellClass: 'bg-blue-50 dark:bg-blue-950/30',     badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  3: { label: 'High',     cellClass: 'bg-amber-50 dark:bg-amber-950/30',   badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  4: { label: 'Critical', cellClass: 'bg-pink-50 dark:bg-pink-950/30',     badgeClass: 'bg-pink-100 text-red-700 dark:bg-pink-900/50 dark:text-red-300' },
}

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Critical' },
]

export function PriorityMatrixTab({ addToast }: Props) {
  const [matrix, setMatrix] = useState<PriorityMatrixRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminApi.getPriorityMatrix().then(data => setMatrix(data)).finally(() => setLoading(false))
  }, [])

  const getCell = (impactId: number, urgencyId: number): number => {
    const row = matrix.find(r => r.impactId === impactId && r.urgencyId === urgencyId)
    return row?.priorityId ?? 1
  }

  const setCell = (impactId: number, urgencyId: number, priorityId: number) => {
    setMatrix(prev => {
      const filtered = prev.filter(r => !(r.impactId === impactId && r.urgencyId === urgencyId))
      return [...filtered, { impactId, urgencyId, priorityId }]
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.savePriorityMatrix(matrix)
      addToast('Priority matrix saved')
    } catch {
      addToast('Failed to save priority matrix')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-12 text-center text-text-muted">Loading…</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Priority matrix</h2>
          <p className="text-sm text-text-muted">Define the resulting priority for each combination of impact and urgency.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-subtle">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider w-32">
                Impact ↓ / Urgency →
              </th>
              {URGENCIES.map(u => (
                <th key={u.id} className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {u.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {IMPACTS.map((imp, ri) => (
              <tr key={imp.id} className={ri > 0 ? 'border-t border-border-default' : ''}>
                <td className="px-4 py-3 font-medium text-text-secondary bg-subtle border-r border-border-default">
                  {imp.label}
                </td>
                {URGENCIES.map(urg => {
                  const priorityId = getCell(imp.id, urg.id)
                  const info = PRIORITIES[priorityId] ?? PRIORITIES[1]
                  return (
                    <td key={urg.id} className={`px-4 py-3 text-center ${info.cellClass}`}>
                      <select
                        value={priorityId}
                        onChange={e => setCell(imp.id, urg.id, Number(e.target.value))}
                        className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer border-0 focus:outline-none focus:ring-1 focus:ring-border-focus ${info.badgeClass}`}
                      >
                        {PRIORITY_OPTIONS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-6 text-xs text-text-muted">
        {PRIORITY_OPTIONS.map(p => {
          const info = PRIORITIES[p.value]
          return (
            <div key={p.value} className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${info.badgeClass}`}>{p.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
