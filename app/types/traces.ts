export type SpanStatus = 'OK' | 'ERROR' | 'UNSET'

export interface SpanEvent {
  name: string
  timestamp: string
  attributes?: Record<string, any>
}

export interface Span {
  span_id: string
  trace_id: string
  parent_span_id?: string | null
  name: string
  service_name: string
  kind?: number
  start_time: string
  end_time: string
  duration_ms: number
  status: SpanStatus
  status_message?: string
  attributes?: Record<string, any>
  events?: SpanEvent[]
  error_fingerprint?: string
}

export interface TraceSummary {
  trace_id: string
  root_service: string
  root_operation: string
  start_time: string
  duration_ms: number
  span_count: number
  has_error: boolean
}

export interface TraceListResponse {
  traces: TraceSummary[]
  total: number
  has_more: boolean
}

export interface TraceDetailResponse {
  trace_id: string
  spans: Span[]
}

export interface TraceListFilters {
  project_id?: string | number
  service?: string
  operation?: string
  min_duration_ms?: number
  has_error?: boolean
  from?: string
  to?: string
  limit?: number
  offset?: number
}
