export type NotificationLevel = 'error' | 'critical' | 'info' | 'warning'

export type NotificationKind
  = | 'error_notification'
    | 'error'
    | 'alert_firing'
    | 'alert_resolved'
    | 'quota_warning'
    | 'alert'
    | 'info'

export interface SSEConnectedEvent {
  timestamp: string
  projects: number[]
}

export interface SSEErrorNotification {
  kind?: NotificationKind
  log_type?: string
  error_type: string
  message: string
  level: NotificationLevel
  timestamp?: string
  project_id?: number
  project_name?: string
  stack_trace?: string
  context?: Record<string, any>
}

export interface NotificationItem extends SSEErrorNotification {
  id: string
  expanded: boolean
  read_at?: string | null
  kind?: NotificationKind
}

export interface InboxNotification {
  id: string
  kind: NotificationKind
  level: NotificationLevel
  message: string
  error_type?: string
  project_id?: number
  project_name?: string
  stack_trace?: string
  context?: Record<string, any>
  timestamp: string
  read_at: string | null
  expanded?: boolean
}

export interface NotificationsListResponse {
  notifications: InboxNotification[]
  total: number
  has_more: boolean
}

export interface RawInboxNotification {
  id: number
  user_id: number
  project_id: number
  kind: NotificationKind
  severity: number
  payload: string
  created_at: string
  read_at: string | null
  expires_at: string
}

export interface RawInboxListResponse {
  notifications: RawInboxNotification[]
  has_more: boolean
}

export interface NotificationFilters {
  unread?: boolean
  kind?: NotificationKind
  project_id?: number
  created_after?: string
  created_before?: string
  limit?: number
  before_id?: number
}
