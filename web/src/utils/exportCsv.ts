import type { Incident } from '../types'

function cell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Wrap in quotes if the value contains a comma, quote, or newline
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
    return `"${s.replace(/"/g, '""')}"`
  return s
}

const COLUMNS: { header: string; get: (i: Incident) => string | number | boolean | null | undefined }[] = [
  { header: 'Number',           get: i => i.number },
  { header: 'Title',            get: i => i.title },
  { header: 'Status',           get: i => i.statusCode },
  { header: 'Priority',         get: i => i.priorityCode },
  { header: 'Impact',           get: i => i.impactCode ?? '' },
  { header: 'Urgency',          get: i => i.urgencyCode ?? '' },
  { header: 'Severity',         get: i => i.severityCode ?? '' },
  { header: 'Major Incident',   get: i => i.isMajorIncident ? 'Yes' : 'No' },
  { header: 'Service',          get: i => i.serviceName ?? '' },
  { header: 'Category',         get: i => i.categoryName ?? '' },
  { header: 'Subcategory',      get: i => i.subCategoryName ?? '' },
  { header: 'CI Asset Tag',     get: i => i.ciAssetTag ?? '' },
  { header: 'Caller',           get: i => i.callerName ?? '' },
  { header: 'Assignee',         get: i => i.assigneeName ?? '' },
  { header: 'Group',            get: i => i.groupName ?? '' },
  { header: 'Contact Method',   get: i => i.contactMethodCode ?? '' },
  { header: 'Location',         get: i => i.location ?? '' },
  { header: 'Description',      get: i => i.description ?? '' },
  { header: 'Resolution Code',  get: i => i.resolutionCode ?? '' },
  { header: 'Resolution Notes', get: i => i.resolutionNotes ?? '' },
  { header: 'Opened At',        get: i => i.openedAt ? new Date(i.openedAt).toLocaleString() : '' },
  { header: 'Updated At',       get: i => i.updatedAt ? new Date(i.updatedAt).toLocaleString() : '' },
  { header: 'Resolved At',      get: i => i.resolvedAt ? new Date(i.resolvedAt).toLocaleString() : '' },
  { header: 'Closed At',        get: i => i.closedAt ? new Date(i.closedAt).toLocaleString() : '' },
  { header: 'SLA Target (min)', get: i => i.slaTargetMinutes ?? '' },
  { header: 'SLA Breached',     get: i => i.slaBreachedAt ? 'Yes' : 'No' },
  { header: 'Comments',         get: i => i.commentCount },
  { header: 'Linked',           get: i => i.linkedCount },
]

export function exportIncidentsToCsv(incidents: Incident[], filename = 'incidents.csv') {
  const header = COLUMNS.map(c => cell(c.header)).join(',')
  const rows = incidents.map(i => COLUMNS.map(c => cell(c.get(i))).join(','))
  const csv = [header, ...rows].join('\r\n')

  // BOM so Excel auto-detects UTF-8
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
