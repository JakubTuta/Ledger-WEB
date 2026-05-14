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

export const jobs: DashboardTemplate = {
  id: 'jobs',
  name: 'Background Jobs',
  description: 'Monitor job throughput, failures, and duration',
  icon: 'mdi-briefcase-clock',
  panels: [
    { name: 'Job Throughput', type: 'custom_metric', metric_name: 'jobs.processed', agg: 'rate', viz: 'line', period: 'last7days' },
    { name: 'Job Failures', type: 'custom_metric', metric_name: 'jobs.failed', agg: 'sum', viz: 'bar', period: 'last7days' },
    { name: 'Job Duration p95', type: 'custom_metric', metric_name: 'jobs.duration', agg: 'p95', viz: 'line', period: 'last7days' },
    { name: 'Job Errors', type: 'error_list', period: 'today' },
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

export const custom: DashboardTemplate = {
  id: 'custom',
  name: 'Custom',
  description: 'Start from scratch — configure each panel yourself',
  icon: 'mdi-tune',
  panels: [
    { name: 'Metric 1', type: 'custom_metric', viz: 'line', period: 'last7days' },
    { name: 'Metric 2', type: 'custom_metric', viz: 'bar', period: 'last7days' },
    { name: 'Metric 3', type: 'custom_metric', viz: 'single_stat', period: 'last7days' },
    { name: 'Metric 4', type: 'custom_metric', viz: 'line', period: 'last7days' },
    { name: 'Metric 5', type: 'custom_metric', viz: 'bar', period: 'last7days' },
    { name: 'Metric 6', type: 'custom_metric', viz: 'single_stat', period: 'last7days' },
  ],
}

export const empty: DashboardTemplate = {
  id: 'empty',
  name: 'Empty',
  description: 'Blank dashboard — add panels manually',
  icon: 'mdi-plus-box-outline',
  panels: [],
}

export const templates: DashboardTemplate[] = [apiHealth, database, jobs, errors, custom, empty]
