import { SkeletonRows } from '../../components/primitives/Skeleton'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { workspaceApi } from '../../api/workspaces'
import { api } from '../../api/client'
import type { Workspace, WorkspaceField, User } from '../../types'

interface Props { addToast: (msg: string) => void }

type EntityType = 'incident' | 'change' | 'problem'

// All configurable fields per entity type
const FIELD_DEFS: Record<EntityType, { key: string; label: string }[]> = {
  incident: [
    { key: 'caller',          label: 'Caller / Affected User' },
    { key: 'contactMethod',   label: 'Contact Method' },
    { key: 'location',        label: 'Location' },
    { key: 'service',         label: 'Service' },
    { key: 'category',        label: 'Category' },
    { key: 'subCategory',     label: 'Subcategory' },
    { key: 'ciAssetTag',      label: 'Config Item (CI)' },
    { key: 'description',     label: 'Description' },
    { key: 'priority',        label: 'Priority' },
    { key: 'severity',        label: 'Severity' },
    { key: 'isMajorIncident', label: 'Major Incident Flag' },
    { key: 'group',           label: 'Assignment Team' },
    { key: 'assignee',        label: 'Assigned To' },
    { key: 'resolutionCode',  label: 'Resolution Code' },
    { key: 'resolutionNotes', label: 'Resolution Notes' },
  ],
  change: [
    { key: 'description',     label: 'Description' },
    { key: 'rolloutPlan',     label: 'Rollout Plan' },
    { key: 'rollbackPlan',    label: 'Rollback Plan' },
    { key: 'impactNotes',     label: 'Impact Notes' },
    { key: 'changeType',      label: 'Change Type' },
    { key: 'risk',            label: 'Risk Level' },
    { key: 'owner',           label: 'Owner' },
    { key: 'approver',        label: 'Approver' },
    { key: 'group',           label: 'Assignment Group' },
    { key: 'cabName',         label: 'CAB Name' },
    { key: 'scheduledStart',  label: 'Scheduled Start' },
    { key: 'scheduledEnd',    label: 'Scheduled End' },
    { key: 'downtimeEstimate',label: 'Downtime Estimate' },
  ],
  problem: [
    { key: 'description', label: 'Description' },
    { key: 'rootCause',   label: 'Root Cause' },
    { key: 'workaround',  label: 'Workaround' },
    { key: 'priority',    label: 'Priority' },
    { key: 'group',       label: 'Assignment Group' },
    { key: 'assignee',    label: 'Assigned To' },
  ],
}

// Local mutable field state during editing
type FieldMap = Record<string, { visible: boolean; mandatory: boolean }>

function buildFieldMap(fields: WorkspaceField[], entityType: EntityType): FieldMap {
  const map: FieldMap = {}
  for (const def of FIELD_DEFS[entityType]) {
    const cfg = fields.find(f => f.entityType === entityType && f.fieldKey === def.key)
    map[def.key] = cfg ? { visible: cfg.isVisible, mandatory: cfg.isMandatory } : { visible: true, mandatory: false }
  }
  return map
}

export function WorkspacesTab({ addToast }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selected, setSelected] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // Editing state for the selected workspace
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [fieldTab, setFieldTab] = useState<EntityType>('incident')
  const [fieldMaps, setFieldMaps] = useState<Record<EntityType, FieldMap>>({
    incident: {}, change: {}, problem: {},
  })
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [addUserId, setAddUserId] = useState('')

  useEffect(() => {
    load()
    api.get<User[]>('/users').then(setUsers).catch(() => {})
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const ws = await workspaceApi.getAll()
      setWorkspaces(ws)
      if (selected) {
        const refreshed = ws.find(w => w.workspaceId === selected.workspaceId) ?? null
        if (refreshed) openWorkspace(refreshed)
      }
    } finally { setLoading(false) }
  }

  const openWorkspace = (ws: Workspace) => {
    setSelected(ws)
    setEditName(ws.name)
    setEditDesc(ws.description ?? '')
    setEditActive(ws.isActive)
    setFieldMaps({
      incident: buildFieldMap(ws.fields, 'incident'),
      change:   buildFieldMap(ws.fields, 'change'),
      problem:  buildFieldMap(ws.fields, 'problem'),
    })
    setSelectedUserIds(ws.userIds)
    setFieldTab('incident')
  }

  const createWorkspace = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const ws = await workspaceApi.create({ name: newName.trim(), description: newDesc.trim() || undefined })
      addToast(`Workspace "${ws.name}" created`)
      setCreating(false); setNewName(''); setNewDesc('')
      await load()
      openWorkspace(ws)
    } finally { setSaving(false) }
  }

  const saveWorkspace = async () => {
    if (!selected) return
    setSaving(true)
    try {
      // Save name/desc/active
      await workspaceApi.update(selected.workspaceId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        isActive: editActive,
      })
      // Save all field configs
      const allFields = (['incident', 'change', 'problem'] as EntityType[]).flatMap(et =>
        Object.entries(fieldMaps[et]).map(([key, cfg]) => ({
          entityType: et, fieldKey: key, isVisible: cfg.visible, isMandatory: cfg.mandatory,
        }))
      )
      await workspaceApi.setFields(selected.workspaceId, allFields)
      // Save users
      await workspaceApi.setUsers(selected.workspaceId, selectedUserIds)
      addToast('Workspace saved')
      await load()
    } finally { setSaving(false) }
  }

  const deleteWorkspace = async () => {
    if (!selected || selected.isDefault) return
    if (!confirm(`Delete workspace "${selected.name}"? This cannot be undone.`)) return
    await workspaceApi.delete(selected.workspaceId)
    addToast('Workspace deleted')
    setSelected(null)
    await load()
  }

  const setField = (key: string, which: 'visible' | 'mandatory', value: boolean) => {
    setFieldMaps(prev => {
      const map = { ...prev[fieldTab], [key]: { ...prev[fieldTab][key], [which]: value } }
      // If hiding a field, also clear mandatory
      if (which === 'visible' && !value) map[key] = { visible: false, mandatory: false }
      return { ...prev, [fieldTab]: map }
    })
  }

  const addUser = () => {
    const uid = parseInt(addUserId)
    if (!uid || selectedUserIds.includes(uid)) return
    setSelectedUserIds(prev => [...prev, uid])
    setAddUserId('')
  }

  const removeUser = (uid: number) => setSelectedUserIds(prev => prev.filter(id => id !== uid))

  const inp = `text-sm border border-border-default rounded px-2 py-1.5 focus:outline-none focus:border-border-focus bg-surface text-text-primary`

  if (loading) return <SkeletonRows rows={4} cols={['w-32', 'flex-1', 'w-20']} />

  return (
    <div className="flex gap-5 min-h-0 h-full">

      {/* ── Left: workspace list ─────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-text-primary">Workspaces</span>
          <button
            onClick={() => { setCreating(true); setSelected(null) }}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-medium"
          >
            <Plus size={12} /> New
          </button>
        </div>

        {workspaces.map(ws => (
          <button
            key={ws.workspaceId}
            onClick={() => openWorkspace(ws)}
            className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
              selected?.workspaceId === ws.workspaceId
                ? 'border-accent/60 bg-accent/5 text-accent-text'
                : 'border-border-default bg-surface hover:bg-hover text-text-primary'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{ws.name}</span>
              {ws.isDefault && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-accent/10 text-accent font-medium shrink-0">Default</span>
              )}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {ws.userIds.length} member{ws.userIds.length !== 1 ? 's' : ''}
              {!ws.isActive && <span className="ml-1 text-text-muted italic">· inactive</span>}
            </div>
          </button>
        ))}

        {/* Inline create form */}
        {creating && (
          <div className="border border-border-default rounded-lg p-3 flex flex-col gap-2 bg-surface">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createWorkspace(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="Workspace name"
              className={`w-full ${inp}`}
            />
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className={`w-full ${inp}`}
            />
            <div className="flex gap-2">
              <button onClick={createWorkspace} disabled={!newName.trim() || saving}
                className="flex-1 py-1 bg-accent text-white text-xs rounded font-medium disabled:opacity-50">
                {saving ? '…' : 'Create'}
              </button>
              <button onClick={() => setCreating(false)}
                className="flex-1 py-1 border border-border-default text-xs rounded text-text-secondary hover:bg-hover">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: workspace editor ──────────────────────────────────────────── */}
      {selected ? (
        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={`w-full text-lg font-semibold bg-transparent border-0 border-b border-border-default focus:outline-none focus:border-accent pb-1 text-text-primary`}
              />
              <input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                className={`w-full text-sm ${inp}`}
              />
              {!selected.isDefault && (
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={e => setEditActive(e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  Active
                </label>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!selected.isDefault && (
                <button onClick={deleteWorkspace}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#f5c2c2] text-[#c8252b] rounded text-sm hover:bg-[#fde8e8] transition-colors">
                  <Trash2 size={13} /> Delete
                </button>
              )}
              <button onClick={saveWorkspace} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded disabled:opacity-50 transition-colors">
                <Check size={13} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Field Configuration */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Field configuration</h3>
            <p className="text-xs text-text-muted mb-3">
              Control which fields are shown and whether they're required when creating records in this workspace.
              The <strong>Title</strong> field is always visible and mandatory.
            </p>

            {/* Entity type tabs */}
            <div className="flex gap-0 border-b border-border-default mb-4">
              {(['incident', 'change', 'problem'] as EntityType[]).map(et => (
                <button key={et} onClick={() => setFieldTab(et)}
                  className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors capitalize ${
                    fieldTab === et
                      ? 'border-accent text-accent-text font-medium'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}>
                  {et === 'incident' ? 'Incidents' : et === 'change' ? 'Changes' : 'Problems'}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border-default overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-subtle border-b border-border-default">
                    <th className="text-left px-4 py-2.5 font-medium text-text-muted">Field</th>
                    <th className="text-center px-4 py-2.5 font-medium text-text-muted w-28">Visible</th>
                    <th className="text-center px-4 py-2.5 font-medium text-text-muted w-28">Mandatory</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELD_DEFS[fieldTab].map((def, idx) => {
                    const cfg = fieldMaps[fieldTab][def.key] ?? { visible: true, mandatory: false }
                    return (
                      <tr key={def.key}
                        className={`border-b border-border-default last:border-0 ${idx % 2 !== 0 ? 'bg-subtle/40' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-text-primary">{def.label}</td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={cfg.visible}
                            onChange={e => setField(def.key, 'visible', e.target.checked)}
                            className="w-4 h-4 accent-accent"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={cfg.mandatory}
                            disabled={!cfg.visible}
                            onChange={e => setField(def.key, 'mandatory', e.target.checked)}
                            className="w-4 h-4 accent-accent disabled:opacity-30"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Members */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Members</h3>
            <p className="text-xs text-text-muted mb-3">
              Users assigned to this workspace will see it in the login selector.
              Users with no workspace assignment always fall back to the default workspace.
            </p>

            <div className="flex gap-2 mb-3">
              <select
                value={addUserId}
                onChange={e => setAddUserId(e.target.value)}
                className={`flex-1 ${inp}`}
              >
                <option value="">— add a member —</option>
                {users
                  .filter(u => !selectedUserIds.includes(u.userId))
                  .map(u => <option key={u.userId} value={u.userId}>{u.displayName}</option>)
                }
              </select>
              <button
                onClick={addUser}
                disabled={!addUserId}
                className="px-3 py-1.5 bg-accent text-white text-sm rounded disabled:opacity-40 hover:bg-accent-hover"
              >
                Add
              </button>
            </div>

            {selectedUserIds.length === 0 ? (
              <p className="text-sm text-text-muted italic">No members assigned — all users fall back here if this is the default.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {selectedUserIds.map(uid => {
                  const u = users.find(x => x.userId === uid)
                  return (
                    <div key={uid} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border-default bg-surface">
                      <span className="text-sm text-text-primary">{u?.displayName ?? `User #${uid}`}</span>
                      <button onClick={() => removeUser(uid)} className="text-text-muted hover:text-[#c8252b] transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      ) : !creating && (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Select a workspace to edit, or create a new one.
        </div>
      )}
    </div>
  )
}
