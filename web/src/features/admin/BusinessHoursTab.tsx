import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { BusinessCalendar, BusinessDay, BusinessHoliday } from '../../types'

interface Props { addToast: (msg: string) => void }

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function BusinessHoursTab({ addToast }: Props) {
  const [calendars, setCalendars] = useState<BusinessCalendar[]>([])
  const [selected, setSelected] = useState<BusinessCalendar | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDays, setEditDays] = useState<BusinessDay[]>([])
  const [savingDays, setSavingDays] = useState(false)
  const [holidayModal, setHolidayModal] = useState(false)
  const [newCalModal, setNewCalModal] = useState(false)

  const load = () => {
    setLoading(true)
    adminApi.getBusinessCalendars().then(data => {
      setCalendars(data)
      if (data.length > 0 && !selected) {
        const def = data.find(c => c.isDefault) ?? data[0]
        selectCal(def)
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const selectCal = (cal: BusinessCalendar) => {
    setSelected(cal)
    // Ensure all 7 days present
    const days: BusinessDay[] = Array.from({ length: 7 }, (_, i) => {
      const dayOfWeek = i + 1
      const existing = cal.days.find(d => d.dayOfWeek === dayOfWeek)
      return existing ?? { dayId: 0, calendarId: cal.calendarId, dayOfWeek, startTime: undefined, endTime: undefined }
    })
    setEditDays(days)
  }

  const setDayField = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setEditDays(prev => prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value || undefined } : d))
  }

  const toggleDay = (dayOfWeek: number) => {
    setEditDays(prev => prev.map(d => {
      if (d.dayOfWeek !== dayOfWeek) return d
      const isActive = !!d.startTime
      return { ...d, startTime: isActive ? undefined : '08:00', endTime: isActive ? undefined : '18:00' }
    }))
  }

  const handleSaveDays = async () => {
    if (!selected) return
    setSavingDays(true)
    try {
      await adminApi.saveBusinessDays(selected.calendarId, editDays.map(d => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
      })))
      addToast('Business hours saved')
      load()
    } catch {
      addToast('Failed to save business hours')
    } finally {
      setSavingDays(false)
    }
  }

  const handleDeleteHoliday = async (h: BusinessHoliday) => {
    try {
      await adminApi.deleteHoliday(h.holidayId)
      addToast(`Removed holiday "${h.name}"`)
      load()
    } catch {
      addToast('Failed to remove holiday')
    }
  }

  if (loading) return <div className="py-12 text-center text-text-muted">Loading…</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Business hours</h2>
          <p className="text-sm text-text-muted">Define working schedules and public holidays for SLA calculations.</p>
        </div>
        <button
          onClick={() => setNewCalModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={14} />
          New calendar
        </button>
      </div>

      {/* Calendar selector tabs */}
      {calendars.length > 1 && (
        <div className="flex gap-2">
          {calendars.map(cal => (
            <button
              key={cal.calendarId}
              onClick={() => selectCal(cal)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selected?.calendarId === cal.calendarId
                  ? 'bg-accent-subtle text-accent-text font-medium'
                  : 'text-text-secondary hover:bg-hover hover:text-text-primary'
              }`}
            >
              {cal.name}
              {cal.isDefault && <span className="ml-1.5 text-xs text-text-muted">(default)</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-4">
          {/* Calendar header */}
          <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-subtle">
              <div>
                <span className="font-semibold text-text-primary text-sm">{selected.name}</span>
                <span className="ml-3 text-xs text-text-muted">{selected.timezone}</span>
                {selected.isDefault && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-accent-subtle text-accent-text font-medium">Default</span>
                )}
              </div>
              <button
                onClick={handleSaveDays}
                disabled={savingDays}
                className="px-3 py-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors"
              >
                {savingDays ? 'Saving…' : 'Save schedule'}
              </button>
            </div>

            {/* Day schedule table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default bg-subtle">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Day</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Start time</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">End time</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Active</th>
                </tr>
              </thead>
              <tbody>
                {editDays.map((day, i) => {
                  const isActive = !!day.startTime
                  return (
                    <tr key={day.dayOfWeek} className={i > 0 ? 'border-t border-border-default' : ''}>
                      <td className="px-4 py-2.5 font-medium text-text-primary w-32">{DAY_NAMES[day.dayOfWeek]}</td>
                      <td className="px-4 py-2.5">
                        {isActive ? (
                          <input
                            type="time"
                            value={day.startTime ?? ''}
                            onChange={e => setDayField(day.dayOfWeek, 'startTime', e.target.value)}
                            className="px-2 py-1 border border-border-default rounded text-sm focus:outline-none focus:border-border-focus"
                          />
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {isActive ? (
                          <input
                            type="time"
                            value={day.endTime ?? ''}
                            onChange={e => setDayField(day.dayOfWeek, 'endTime', e.target.value)}
                            className="px-2 py-1 border border-border-default rounded text-sm focus:outline-none focus:border-border-focus"
                          />
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleDay(day.dayOfWeek)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? 'bg-accent' : 'bg-border-default'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Holidays section */}
          <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <span className="text-sm font-semibold text-text-primary">Holidays</span>
              <button
                onClick={() => setHolidayModal(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-hover rounded transition-colors"
              >
                <Plus size={12} /> Add holiday
              </button>
            </div>
            <div className="p-4">
              {selected.holidays.length === 0 ? (
                <p className="text-sm text-text-muted">No holidays configured</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selected.holidays.map(h => (
                    <span
                      key={h.holidayId}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-subtle border border-border-default text-sm text-text-secondary"
                    >
                      <span className="text-xs text-text-muted font-mono">{h.holidayDate}</span>
                      <span>{h.name}</span>
                      <button
                        onClick={() => handleDeleteHoliday(h)}
                        className="text-text-muted hover:text-[#c8252b] transition-colors ml-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {holidayModal && selected && (
        <HolidayModal
          calendarId={selected.calendarId}
          onClose={() => setHolidayModal(false)}
          onSaved={(msg) => { addToast(msg); setHolidayModal(false); load() }}
        />
      )}

      {newCalModal && (
        <NewCalendarModal
          onClose={() => setNewCalModal(false)}
          onSaved={(msg) => { addToast(msg); setNewCalModal(false); load() }}
        />
      )}
    </div>
  )
}

function HolidayModal({ calendarId, onClose, onSaved }: { calendarId: number; onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({ holidayDate: '', name: '' })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.holidayDate || !form.name.trim()) return
    setSaving(true)
    try {
      await adminApi.addHoliday(calendarId, { holidayDate: form.holidayDate, name: form.name.trim() })
      onSaved(`Added holiday "${form.name}"`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-lg w-full max-w-xs mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">Add holiday</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Date <span className="text-[#c8252b]">*</span></label>
            <input type="date" value={form.holidayDate} onChange={e => setForm(f => ({ ...f, holidayDate: e.target.value }))} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name <span className="text-[#c8252b]">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.holidayDate || !form.name.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NewCalendarModal({ onClose, onSaved }: { onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({ name: '', timezone: 'UTC' })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await adminApi.createBusinessCalendar({ name: form.name.trim(), timezone: form.timezone })
      onSaved(`Created calendar "${form.name}"`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-lg w-full max-w-xs mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-text-primary">New calendar</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-text-muted text-lg leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name <span className="text-[#c8252b]">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Timezone</label>
            <input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="e.g. Europe/Prague" className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:border-border-focus font-mono" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default bg-subtle">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
