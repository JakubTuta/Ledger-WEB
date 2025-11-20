export interface ApiKey {
  key_id: number
  project_id: number
  name: string
  key_prefix: string
  status: string
  created_at: string
  last_used_at: string | null
}

export interface ListApiKeysResponse {
  api_keys: ApiKey[]
  total: number
}

export interface CreateApiKeyRequest {
  name?: string
}

export interface CreateApiKeyResponse {
  key_id: number
  full_key: string
  key_prefix: string
  warning: string
}
