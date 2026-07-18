import type { Panel } from '~/types/panel'
import type { Project } from '~/types/project'
import type { ExportFormat, PanelExportEnvelope } from '~/utils/export'
import { buildExportFilename, downloadTextFile, toCsv, toJsonExport } from '~/utils/export'

export interface PanelExportBuildResult {
  rows: Record<string, unknown>[]
  summary?: Record<string, unknown>
  extraMeta?: Record<string, unknown>
  truncated?: boolean
}

export function usePanelExport(getPanel: () => Panel, getProject: () => Project | undefined) {
  const isExporting = ref(false)
  const exportError = ref('')

  async function exportPanel(
    format: ExportFormat,
    build: () => Promise<PanelExportBuildResult> | PanelExportBuildResult,
  ) {
    isExporting.value = true
    exportError.value = ''

    try {
      const panel = getPanel()
      const project = getProject()
      const result = await build()

      const envelope: PanelExportEnvelope = {
        meta: {
          exported_at: new Date().toISOString(),
          source: 'ledger-dashboard',
          panel: {
            id: panel.id,
            name: panel.name,
            type: panel.type,
            filters: result.extraMeta,
          },
          project: project
            ? { id: project.project_id, name: project.name }
            : undefined,
          time_range: {
            period: panel.period ?? (panel.periodFrom && panel.periodTo
              ? null
              : 'last7days'),
            from: panel.periodFrom ?? null,
            to: panel.periodTo ?? null,
          },
          row_count: result.rows.length,
          truncated: result.truncated,
        },
        summary: result.summary,
        data: result.rows,
      }

      const filename = buildExportFilename(panel, format)

      if (format === 'json') {
        downloadTextFile(filename, toJsonExport(envelope), 'application/json')
      }
      else {
        downloadTextFile(filename, toCsv(result.rows), 'text/csv;charset=utf-8')
      }
    }
    catch (error) {
      console.error('Error exporting panel data:', error)
      exportError.value = 'Failed to export panel data'
    }
    finally {
      isExporting.value = false
    }
  }

  return { isExporting, exportError, exportPanel }
}
