import type { ApiKey, CreateApiKeyResponse, ListApiKeysResponse } from '~/types/apiKey'
import { defineStore } from 'pinia'

export const useApiKeysStore = defineStore('apiKeys', () => {
  const { client } = useApiStore()

  const apiKeys = ref<ApiKey[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const lastFetchTime = ref<Date | null>(null)
  const hasData = computed(() => apiKeys.value.length > 0)

  const fetchApiKeys = async (projectId: number, force = false) => {
    if (isLoading.value)
      return

    if (!force && hasData.value)
      return

    isLoading.value = true

    try {
      const response = await client.get<ListApiKeysResponse>(`/api/v1/projects/${projectId}/api-keys`)

      apiKeys.value = response.data.api_keys
      total.value = response.data.total
      lastFetchTime.value = new Date()
    }
    catch (error) {
      console.error('Error fetching API keys:', error)
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  const refreshApiKeys = async (projectId: number) => {
    await fetchApiKeys(projectId, true)
  }

  const createApiKey = async (projectId: number, data?: { name?: string }) => {
    try {
      const response = await client.post<CreateApiKeyResponse>(`/api/v1/projects/${projectId}/api-keys`, data || {})

      const newKey: ApiKey = {
        key_id: response.data.key_id,
        project_id: projectId,
        name: data?.name || '',
        key_prefix: response.data.key_prefix,
        status: 'active',
        created_at: new Date().toISOString(),
        last_used_at: null,
      }

      apiKeys.value.push(newKey)
      total.value += 1

      return { success: true, apiKey: response.data }
    }
    catch (error: any) {
      console.error('Error creating API key:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to create API key'

      return { success: false, error: errorMessage }
    }
  }

  const revokeApiKey = async (keyId: number) => {
    try {
      await client.delete(`/api/v1/api-keys/${keyId}`)

      apiKeys.value = apiKeys.value.filter(key => key.key_id !== keyId)
      total.value -= 1

      return { success: true }
    }
    catch (error: any) {
      console.error('Error revoking API key:', error)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to revoke API key'

      return { success: false, error: errorMessage }
    }
  }

  return {
    apiKeys,
    total,
    isLoading,
    lastFetchTime,
    hasData,
    fetchApiKeys,
    refreshApiKeys,
    createApiKey,
    revokeApiKey,
  }
})
