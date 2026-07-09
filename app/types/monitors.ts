export type MonitorKind = 'http' | 'heartbeat'

export interface Monitor {
  id: number
  project_id: number
  kind: MonitorKind
  name: string
  target_url: string | null
  token: string | null
  interval_s: number
  timeout_s: number
  expected_status: number
  grace_s: number
  enabled: boolean
  state: string
  created_at: string
  updated_at: string
  last_checked_at: string | null
  last_ok: boolean | null
  last_latency_ms: number | null
  uptime_pct_24h: number
}

export interface CreateMonitorRequest {
  project_id: number
  kind: MonitorKind
  name: string
  target_url?: string | null
  interval_s?: number
  timeout_s?: number
  expected_status?: number
  grace_s?: number
}

export interface UpdateMonitorRequest {
  name?: string
  target_url?: string | null
  interval_s?: number
  timeout_s?: number
  expected_status?: number
  grace_s?: number
  enabled?: boolean
}
