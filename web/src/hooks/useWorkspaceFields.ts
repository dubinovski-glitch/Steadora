import { useAuthStore } from '../store/authStore'

export function useWorkspaceFields() {
  const fields = useAuthStore(s => s.workspaceFields)

  return (entityType: string, fieldKey: string): { visible: boolean; mandatory: boolean } => {
    if (!fields || fields.length === 0) return { visible: true, mandatory: false }
    const cfg = fields.find(f => f.entityType === entityType && f.fieldKey === fieldKey)
    if (!cfg) return { visible: true, mandatory: false }
    return { visible: cfg.isVisible, mandatory: cfg.isMandatory }
  }
}
