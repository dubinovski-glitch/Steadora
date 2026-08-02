import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportIncidentsToCsv } from './exportCsv'
import type { Incident } from '../types'

function makeIncident(over: Partial<Incident> = {}): Incident {
  return {
    incidentId: 1, number: 'INC-1', title: 'Printer down',
    priorityId: 2, priorityCode: 'high', statusId: 1, statusCode: 'new',
    isMajorIncident: false, reassignCount: 0, slaPausedSeconds: 0,
    reopenCount: 0, openedAt: '2026-01-01T10:00:00Z',
    commentCount: 0, linkedCount: 0, updatedAt: '2026-01-02T10:00:00Z',
    ...over,
  }
}

async function captureCsv(incidents: Incident[]): Promise<string> {
  const blobs: Blob[] = []
  // jsdom doesn't implement URL.createObjectURL/revokeObjectURL — define them.
  ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn((b: Blob) => { blobs.push(b); return 'blob:test' })
  ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  exportIncidentsToCsv(incidents, 'out.csv')
  return await blobs[0].text()
}

describe('exportIncidentsToCsv', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('emits a header row and one row per incident', async () => {
    const csv = await captureCsv([makeIncident(), makeIncident({ number: 'INC-2' })])
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines[0]).toContain('Number')
    expect(lines[0]).toContain('Title')
    expect(lines).toHaveLength(3) // header + 2 rows
    expect(lines[1]).toContain('INC-1')
    expect(lines[2]).toContain('INC-2')
  })

  it('quotes and escapes values containing commas and quotes', async () => {
    const csv = await captureCsv([makeIncident({ title: 'Down, hard "outage"' })])
    expect(csv).toContain('"Down, hard ""outage"""')
  })

  it('renders major-incident and SLA-breach flags as Yes/No', async () => {
    const csv = await captureCsv([makeIncident({ isMajorIncident: true, slaBreachedAt: '2026-01-03T00:00:00Z' })])
    const row = csv.replace(/^﻿/, '').split('\r\n')[1]
    // Major Incident column should read Yes, SLA Breached column should read Yes
    expect(row).toMatch(/(^|,)Yes(,|$)/)
  })

  it('prepends a UTF-8 BOM for Excel', async () => {
    // Blob.text() strips a leading BOM per spec, so assert on the raw bytes.
    const blobs: Blob[] = []
    ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn((b: Blob) => { blobs.push(b); return 'blob:test' })
    ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    exportIncidentsToCsv([makeIncident()], 'out.csv')
    const bytes = new Uint8Array(await blobs[0].arrayBuffer())
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
  })
})
