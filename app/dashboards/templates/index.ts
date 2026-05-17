import type { CreatePanelRequest } from '~/types/panel'

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  icon: string
  panels: Omit<CreatePanelRequest, 'project_id' | 'index'>[]
}

export const apiHealth: DashboardTemplate = {
  id: 'api-health',
  name: 'API Health',
  description: 'Monitor request volume, error rate, and latency',
  icon: 'mdi-heart-pulse',
  panels: [
    { name: 'Request Volume', type: 'metrics', period: 'last7days' },
    { name: 'Error Rate', type: 'errors', period: 'last7days' },
    { name: 'Recent Errors', type: 'error_list', period: 'today' },
    { name: 'Bottleneck Endpoints', type: 'bottleneck', statistic: 'avg', period: 'last7days' },
    { name: 'Heatmap', type: 'error_heatmap', period: 'last30days' },
  ],
}

export const database: DashboardTemplate = {
  id: 'database',
  name: 'Database',
  description: 'Track database query traces and errors',
  icon: 'mdi-database',
  panels: [
    { name: 'DB Traces', type: 'trace_list', operation_filter: 'db', limit: 50, period: 'today' },
    { name: 'DB Errors', type: 'error_list', period: 'today' },
    { name: 'Query Volume', type: 'metrics', period: 'last7days' },
  ],
}

export const errors: DashboardTemplate = {
  id: 'errors',
  name: 'Error Analysis',
  description: 'Deep dive into errors and exceptions',
  icon: 'mdi-bug',
  panels: [
    { name: 'Error List', type: 'error_list', period: 'today' },
    { name: 'Error Heatmap', type: 'error_heatmap', period: 'last30days' },
    { name: 'Error Rate', type: 'errors', period: 'last7days' },
  ],
}

export const empty: DashboardTemplate = {
  id: 'empty',
  name: 'Empty',
  description: 'Blank dashboard — add panels manually',
  icon: 'mdi-plus-box-outline',
  panels: [],
}

export const templates: DashboardTemplate[] = [apiHealth, database, errors, empty]
