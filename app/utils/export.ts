import type { Panel, TimeRangePreset } from '~/types/panel'

export type ExportFormat = 'json' | 'csv'

export interface PanelExportEnvelope {
  meta: {
    exported_at: string
    source: 'ledger-dashboard'
    panel: {
      id: string
      name: string
      type: Panel['type']
      filters?: Record<string, unknown>
    }
    project?: {
      id: string | number
      name: string
    }
    time_range: {
      period: TimeRangePreset | null
      from: string | null
      to: string | null
    }
    row_count: number
    truncated?: boolean
  }
  summary?: Record<string, unknown>
  data: Record<string, unknown>[]
}

const CSV_SPECIAL_CHARS = /["\n\r,]/

function csvCell(value: unknown): string {
  if (value === null || value === undefined)
    return ''

  const stringValue = typeof value === 'object'
    ? JSON.stringify(value)
    : String(value)

  if (CSV_SPECIAL_CHARS.test(stringValue))
    return `"${stringValue.replace(/"/g, '""')}"`

  return stringValue
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0)
    return ''

  const headers: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    }
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => csvCell(row[h])).join(','))
  }

  const BOM = String.fromCharCode(0xFEFF)

  return `${BOM}${lines.join('\r\n')}`
}

export function toJsonExport(envelope: PanelExportEnvelope): string {
  return JSON.stringify(envelope, null, 2)
}

export function buildExportFilename(panel: Panel, format: ExportFormat): string {
  const slug = generateSlug(panel.name) || 'panel'

  const rangeLabel = panel.period
    ?? (panel.periodFrom && panel.periodTo
      ? `${panel.periodFrom}_${panel.periodTo}`
      : 'last7days')

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  return `${slug}_${panel.type}_${rangeLabel}_${timestamp}.${format}`
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  if (!import.meta.client)
    return

  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(url)
}

export function omitUiFields<T extends Record<string, unknown>>(row: T, fields: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(row)) {
    if (!fields.includes(key))
      result[key] = row[key]
  }

  return result
}
