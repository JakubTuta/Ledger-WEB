export interface ProjectQuotaResponse {
  project_id: number
  project_name: string
  project_slug: string
  environment: string
  daily_quota: number
  daily_usage: number
  quota_remaining: number
  quota_reset_at: string
  retention_days: number
}
