import type { TimeRangePreset } from '~/types/panel'

export interface ExploreLogEntry {
  id: number
  project_id: number
  timestamp: string
  ingested_at: string
  level: string
  log_type: string
  importance: string
  environment?: string | null
  release?: string | null
  message?: string | null
  error_type?: string | null
  error_message?: string | null
  stack_trace?: string | null
  attributes?: Record<string, any> | null
  sdk_version?: string | null
  platform?: string | null
  platform_version?: string | null
  processing_time_ms?: number | null
  error_fingerprint?: string | null
  method?: string | null
  path?: string | null
  status_code?: number | null
  duration_ms?: number | null
}

export interface ExploreLogsResponse {
  project_id: number
  logs: ExploreLogEntry[]
  total: number | null
  has_more: boolean
  next_cursor: string | null
}

export interface ExploreFacetValue {
  value: string
  count: number
}

export interface ExploreFacets {
  level: ExploreFacetValue[]
  log_type: ExploreFacetValue[]
  status_class: ExploreFacetValue[]
  environment: ExploreFacetValue[]
}

export type ExploreFacetField = 'level' | 'log_type' | 'status_class' | 'environment'

export interface ExploreFilters {
  projectId: string | null
  period: TimeRangePreset | null
  periodFrom: string | null
  periodTo: string | null
  level: string | null
  logType: string | null
  statusClass: string[]
  environment: string | null
  search: string
}
