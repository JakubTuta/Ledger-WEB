export type AlertComparator = '>' | '<' | '>=' | '<='
export type AlertChannelKind = 'in_app' | 'email' | 'webhook'
// String labels for severity (preference matrix, display). AlertRule.severity uses 0/1/2.
export type AlertSeverity = 'info' | 'warning' | 'critical'

export const SEVERITY_LABELS: Record<number, AlertSeverity> = { 0: 'info', 1: 'warning', 2: 'critical' }
export const SEVERITY_VALUES: Record<AlertSeverity, number> = { info: 0, warning: 1, critical: 2 }

export interface AlertRule {
  id: number
  project_id: number
  name: string
  enabled: boolean
  metric: string
  comparator: AlertComparator
  threshold: number
  window_seconds: number
  cooldown_seconds: number
  severity: number
  last_fired_at: string | null
  last_state: string
  created_at: string
  updated_at: string
}

export interface AlertRuleListResponse {
  rules: AlertRule[]
  total: number
}

export interface CreateAlertRuleRequest {
  project_id: number
  name: string
  metric: string
  comparator: AlertComparator
  threshold: number
  window_seconds?: number
  cooldown_seconds?: number
  severity?: number
}

export interface UpdateAlertRuleRequest {
  name?: string | null
  enabled?: boolean | null
  threshold?: number | null
  cooldown_seconds?: number | null
}

export interface AlertChannel {
  id: number
  project_id: number
  user_id: number
  name: string
  kind: AlertChannelKind
  config: string
  enabled: boolean
  created_at: string
}

export interface AlertChannelListResponse {
  channels: AlertChannel[]
  total: number
}

export interface CreateAlertChannelRequest {
  project_id: number
  kind: AlertChannelKind
  config?: string
}

export interface UpdateAlertChannelRequest {
  config?: string | null
  enabled?: boolean | null
}

export interface ChannelTestResult {
  success: boolean
  message?: string
}
