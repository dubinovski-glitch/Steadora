import { useAuthStore } from '../store/authStore'

// Exposes the active workspace's per-field config. Subscribes to authStore.workspaceFields and
// returns a lookup forms call to decide whether a field is shown and whether it's required.
export function useWorkspaceFields() {
  const fields = useAuthStore(s => s.workspaceFields)

  // (entityType, fieldKey) -> { visible, mandatory }. Defaults to visible/optional when the
  // workspace has no config or this specific field isn't overridden.
  return (entityType: string, fieldKey: string): { visible: boolean; mandatory: boolean } => {
    if (!fields || fields.length === 0) return { visible: true, mandatory: false }
    const cfg = fields.find(f => f.entityType === entityType && f.fieldKey === fieldKey)
    if (!cfg) return { visible: true, mandatory: false }
    return { visible: cfg.isVisible, mandatory: cfg.isMandatory }
  }
}
