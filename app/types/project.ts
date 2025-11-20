export interface Project {
  project_id: number
  name: string
  slug: string
  environment: string
  retention_days: number
  daily_quota: number
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
