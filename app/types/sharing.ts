export type ProjectRole = 'owner' | 'member'

export interface ProjectMember {
  account_id: number
  email: string
  name: string
  role: ProjectRole
  joined_at: string
}

export interface MembersListResponse {
  members: ProjectMember[]
  total: number
}

export interface InviteCodeResponse {
  code: string
  expires_at: string
}

export interface AcceptInviteResponse {
  project_id: number
  role: ProjectRole
  project_name: string
  project_slug: string
}
