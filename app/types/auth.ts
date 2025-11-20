export interface User {
  account_id: string
  email: string
  name?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  account_id: string
  email: string
  expires_in: number
  name: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface RegisterResponse {
  access_token: string
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
