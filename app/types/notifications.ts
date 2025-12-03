export type NotificationLevel = 'error' | 'critical'

export type NotificationType = 'exception'

export interface ProjectNotificationSettings {
  enabled: boolean
  levels: NotificationLevel[]
  types: NotificationType[]
}

export interface NotificationPreferencesResponse {
  enabled: boolean
  projects: Record<string, ProjectNotificationSettings>
}

export interface NotificationPreferencesUpdate {
  enabled: boolean
  projects: Record<string, ProjectNotificationSettings>
}

export interface SSEConnectedEvent {
  timestamp: string
  projects: number[]
}

export interface SSEErrorNotification {
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
}
