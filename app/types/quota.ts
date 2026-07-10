export interface SignalQuota {
  quota: number
  usage: number
  remaining: number
}

export interface ProjectQuotaResponse {
  project_id: number
  project_name: string
  project_slug: string
  environment: string
  logs: SignalQuota
  spans: SignalQuota
  metrics: SignalQuota
  quota_reset_at: string
  retention_days: number
}

export interface UsageStatsDay {
  date: string
  log_count: number
  span_count: number
  metric_point_count: number
  logs_daily_quota: number
  spans_daily_quota: number
  metrics_daily_quota: number
  logs_quota_used_percent: number
  spans_quota_used_percent: number
  metrics_quota_used_percent: number
}

export interface UsageStatsResponse {
  project_id: number
  usage: UsageStatsDay[]
}
