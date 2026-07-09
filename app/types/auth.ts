export interface User {
  account_id: string
  email: string
  name?: string
  email_verified?: boolean
  totp_enabled?: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token?: string
  refresh_token?: string
  token_type: string
  account_id?: string
  email?: string
  expires_in?: number
  name?: string
  requires_2fa?: boolean
  totp_session_token?: string
}

export interface TOTPLoginRequest {
  totp_session_token: string
  code: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface VerifyEmailResponse {
  success: boolean
  message: string
}

export interface ResendVerificationResponse {
  success: boolean
  already_verified: boolean
  message: string
}

export interface Setup2FAResponse {
  secret: string
  provisioning_uri: string
}

export interface Verify2FARequest {
  code: string
}

export interface Verify2FAResponse {
  success: boolean
  backup_codes: string[]
  message: string
}

export interface Disable2FARequest {
  password: string
}

export interface Disable2FAResponse {
  success: boolean
  message: string
}

export interface SessionInfo {
  id: number
  device_info: string | null
  created_at: string
  last_used_at: string | null
  expires_at: string
  is_current: boolean
}

export interface ListSessionsResponse {
  sessions: SessionInfo[]
  total: number
}

export interface RevokeSessionResponse {
  success: boolean
  message: string
}

export interface RevokeAllSessionsResponse {
  revoked_count: number
  message: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface RegisterResponse {
  access_token: string
  refresh_token: string
  token_type: string
  account_id: string
  email: string
  name: string
  expires_in: number
  detail: string
}

export interface UpdateNameRequest {
  name: string
}

export interface UpdateNameResponse {
  detail: string
  name: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export interface ChangePasswordResponse {
  detail: string
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  account_id: string
  email: string
  expires_in: number
}
