// Shared human-readable labels for lookup codes rendered in the UI.
// Views should never print raw codes ("progress", "pending_approval") — use
// these helpers so badges and chips read professionally everywhere.

export const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}

export const STATUS_LABEL: Record<string, string> = {
  new: 'New', progress: 'In Progress', pending: 'Pending',
  resolved: 'Resolved', closed: 'Closed',
}

export const RISK_LABEL: Record<string, string> = {
  high: 'High', medium: 'Medium', low: 'Low',
}

export const CHANGE_TYPE_LABEL: Record<string, string> = {
  emergency: 'Emergency', normal: 'Normal', standard: 'Standard',
}

// Fallback: turn an unknown snake_case code into Title Case ("vendor_engaged" → "Vendor Engaged").
export function humanize(code: string): string {
  return code
    .split('_')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export const priorityLabel = (code: string) => PRIORITY_LABEL[code] ?? humanize(code)
export const statusLabel = (code: string) => STATUS_LABEL[code] ?? humanize(code)
export const riskLabel = (code: string) => RISK_LABEL[code] ?? humanize(code)
export const changeTypeLabel = (code: string) => CHANGE_TYPE_LABEL[code] ?? humanize(code)
