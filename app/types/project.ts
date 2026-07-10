export interface Project {
  project_id: number
  name: string
  slug: string
  environment: string
  retention_days: number
  logs_daily_quota: number
  spans_daily_quota: number
  metrics_daily_quota: number
  available_routes: string[]
}

export interface ProjectListResponse {
  projects: Project[]
  total: number
}

export interface CreateProjectRequest {
  name: string
  slug: string
  environment?: string
}
