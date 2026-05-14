export type PanelType = 'logs' | 'errors' | 'metrics' | 'error_list' | 'bottleneck' | 'error_heatmap' | 'trace' | 'trace_list' | 'custom_metric'

export type BottleneckStatistic = 'min' | 'max' | 'avg' | 'median' | 'count'

export type TimeRangePreset = 'today' | 'last7days' | 'last30days' | 'currentWeek' | 'currentMonth' | 'currentYear'

export type CustomMetricAgg = 'sum' | 'avg' | 'rate' | 'p50' | 'p95' | 'p99'
export type CustomMetricViz = 'line' | 'bar' | 'single_stat'

export interface Panel {
  id: string
  project_id: string
  name: string
  type: PanelType
  endpoint?: string
  routes?: string[]
  statistic?: BottleneckStatistic
  period?: TimeRangePreset | null
  periodFrom?: string | null
  periodTo?: string | null
  index: number
  created_at: string
  updated_at: string
  // custom_metric fields
  metric_name?: string
  tag_filter?: Record<string, string>
  agg?: CustomMetricAgg
  viz?: CustomMetricViz
  step?: string
  // trace fields
  trace_id?: string
  service_filter?: string
  operation_filter?: string
  min_duration_ms?: number
  has_error?: boolean
  limit?: number
  // logs filter fields
  statusClass?: '2xx' | '4xx' | '5xx'
  search?: string
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
  routes?: string[]
  statistic?: BottleneckStatistic
  period?: TimeRangePreset | null
  periodFrom?: string | null
  periodTo?: string | null
  index: number
  metric_name?: string
  tag_filter?: Record<string, string>
  agg?: CustomMetricAgg
  viz?: CustomMetricViz
  step?: string
  trace_id?: string
  service_filter?: string
  operation_filter?: string
  min_duration_ms?: number
  has_error?: boolean
  limit?: number
  statusClass?: '2xx' | '4xx' | '5xx'
  search?: string
}

export interface UpdatePanelRequest {
  name: string
  index: number
  project_id: string
  type: PanelType
  endpoint?: string | null
  routes?: string[] | null
  statistic?: BottleneckStatistic | null
  period?: TimeRangePreset | null
  periodFrom?: string | null
  periodTo?: string | null
  metric_name?: string | null
  tag_filter?: Record<string, string> | null
  agg?: CustomMetricAgg | null
  viz?: CustomMetricViz | null
  step?: string | null
  trace_id?: string | null
  service_filter?: string | null
  operation_filter?: string | null
  min_duration_ms?: number | null
  has_error?: boolean | null
  limit?: number | null
  statusClass?: '2xx' | '4xx' | '5xx' | null
  search?: string | null
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

export interface BottleneckMetricData {
  date: string
  hour?: number | null
  route: string
  value: number
}

export interface BottleneckMetricsResponse {
  project_id: number
  statistic: BottleneckStatistic
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  start_date: string
  end_date: string
  data: BottleneckMetricData[]
}
