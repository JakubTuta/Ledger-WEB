export type PanelType = 'logs' | 'errors' | 'metrics' | 'error_list'

export type TimeRangePreset = 'today' | 'last7days' | 'last30days' | 'currentWeek' | 'currentMonth' | 'currentYear'

export interface Panel {
  id: number
  project_id: string
  name: string
  type: PanelType
  endpoint?: string
  period?: TimeRangePreset | null
  periodFrom?: string | null
  periodTo?: string | null
  index: number
  created_at: string
  updated_at: string
}

export interface PanelListResponse {
  panels: Panel[]
  total: number
}

export interface CreatePanelRequest {
  name: string
  project_id: string
  type: PanelType
  endpoint?: string
  period?: TimeRangePreset | null
  periodFrom?: string | null
  periodTo?: string | null
  index: number
}

export interface UpdatePanelRequest {
  name: string
  index: number
  project_id: string
  type: PanelType
  endpoint?: string | null
  period?: TimeRangePreset | null
  periodFrom?: string | null
  periodTo?: string | null
}

export interface AggregatedMetricData {
  date: string
  hour?: number
  endpoint_method?: string
  endpoint_path?: string
  log_count: number
  error_count: number
  avg_duration_ms: number
  min_duration_ms: number
  max_duration_ms: number
  p95_duration_ms: number
  p99_duration_ms: number
}

export interface AggregatedMetricsResponse {
  project_id: number
  metric_type: 'exception' | 'endpoint'
  granularity: 'hourly' | 'daily'
  start_date: string
  end_date: string
  data: AggregatedMetricData[]
}

export interface MetricsQueryParams {
  type: 'exception' | 'endpoint'
  period?: TimeRangePreset
  periodFrom?: string
  periodTo?: string
  endpointPath?: string
}

export interface TimeRangeSelection {
  preset?: TimeRangePreset
  from: string
  to: string
}
