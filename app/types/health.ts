export type HealthStatus = 'healthy' | 'degraded' | 'down'

export interface HealthThresholds {
  error_rate_warn: number
  error_rate_crit: number
  p95_warn_ms: number
  p95_crit_ms: number
}

export interface ProjectHealthSummary {
  project_id: string
  error_rate: number
  p95_ms: number
  rps: number
  status: HealthStatus
  sparkline: number[]
  thresholds: HealthThresholds
  generated_at: string
}

export interface HealthSummaryResponse {
  summaries: ProjectHealthSummary[]
}
