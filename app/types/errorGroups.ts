export type ErrorGroupStatus = 'unresolved' | 'resolved' | 'ignored' | 'muted'

export interface ErrorGroup {
  id: number
  project_id: number
  fingerprint: string
  error_type: string
  error_message: string | null
  first_seen: string
  last_seen: string
  occurrence_count: number
  status: ErrorGroupStatus
  assigned_to: number | null
  sample_log_id: number | null
  resolved_at: string | null
  resolved_in_release: string | null
}

export interface ErrorGroupListResponse {
  project_id: number
  groups: ErrorGroup[]
  total: number
  has_more: boolean
}

export interface ErrorGroupSampleLog {
  id: number
  project_id: number
  timestamp: string
  ingested_at: string
  level: string
  log_type: string
  importance: string
  environment: string | null
  release: string | null
  message: string | null
  error_type: string | null
  error_message: string | null
  stack_trace: string | null
  attributes: Record<string, any> | null
  sdk_version: string | null
  platform: string | null
  platform_version: string | null
  error_fingerprint: string | null
  method: string | null
  path: string | null
  status_code: number | null
  duration_ms: number | null
  client_channel: string | null
  client_country: string | null
}

export interface ErrorOccurrenceBucket {
  bucket: string
  count: number
}

export interface ErrorGroupDetail {
  group: ErrorGroup
  sample_stack_trace: string | null
  sample_log: ErrorGroupSampleLog | null
  occurrence_sparkline: ErrorOccurrenceBucket[]
}

export interface UpdateErrorGroupStatusRequest {
  status: ErrorGroupStatus
  resolved_in_release?: string | null
}

export interface AssignErrorGroupRequest {
  assigned_to: number | null
}

export const ERROR_GROUP_STATUS_META: Record<ErrorGroupStatus, { label: string, color: string, icon: string }> = {
  unresolved: { label: 'Unresolved', color: 'error', icon: 'mdi-alert-circle' },
  resolved: { label: 'Resolved', color: 'success', icon: 'mdi-check-circle' },
  ignored: { label: 'Ignored', color: 'grey', icon: 'mdi-eye-off' },
  muted: { label: 'Muted', color: 'blue-grey', icon: 'mdi-bell-off' },
}
