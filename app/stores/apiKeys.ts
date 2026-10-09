import type { ApiKey, CreateApiKeyResponse, ListApiKeysResponse } from '~/types/apiKey'
import { defineStore } from 'pinia'

function apiKeyErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback
}

export const useApiKeysStore = defineStore('apiKeys', () => {
  const { client } = useApiStore()

  // The server lists keys per project, so they are cached per project and
  // exposed as one flat list for views that show every project's keys.
  const apiKeysByProject = ref<Map<number, ApiKey[]>>(new Map())
  const loadingProjects = ref<Set<number>>(new Set())
  const error = ref<string | null>(null)
  const lastFetchTime = ref<Date | null>(null)

  const apiKeys = computed(() => [...apiKeysByProject.value.values()].flat())
  const total = computed(() => apiKeys.value.length)
  const isLoading = computed(() => loadingProjects.value.size > 0)
  const hasData = computed(() => apiKeys.value.length > 0)

  function setProjectKeys(projectId: number, keys: ApiKey[]) {
    apiKeysByProject.value.set(projectId, keys)
  }

  const fetchApiKeysForProject = async (projectId: number, force = false) => {
    if (loadingProjects.value.has(projectId))
      return

    if (!force && apiKeysByProject.value.has(projectId))
      return

    loadingProjects.value.add(projectId)

    try {
      const response = await client.get<ListApiKeysResponse>(`/api/v1/projects/${projectId}/api-keys`)

      setProjectKeys(projectId, response.data.api_keys)
      lastFetchTime.value = new Date()
    }
    finally {
      loadingProjects.value.delete(projectId)
    }
  }

  const fetchApiKeys = async (projectIds: number[], force = false) => {
    error.value = null

    const results = await Promise.allSettled(projectIds.map(id => fetchApiKeysForProject(id, force)))
    const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')

    if (failure) {
      console.error('Error fetching API keys:', failure.reason)
      error.value = apiKeyErrorMessage(failure.reason, 'Failed to load API keys')
    }
  }

  const refreshApiKeys = async (projectIds: number[]) => {
    await fetchApiKeys(projectIds, true)
  }

  function buildLocalKey(projectId: number, name: string, response: CreateApiKeyResponse): ApiKey {
    return {
      key_id: response.key_id,
      project_id: projectId,
      name,
      key_prefix: response.key_prefix,
      status: 'active',
      created_at: new Date().toISOString(),
      last_used_at: null,
    }
  }

  const createApiKey = async (projectId: number, data?: { name?: string }) => {
    try {
      const response = await client.post<CreateApiKeyResponse>(`/api/v1/projects/${projectId}/api-keys`, data || {})

      const projectKeys = apiKeysByProject.value.get(projectId) ?? []
      setProjectKeys(projectId, [...projectKeys, buildLocalKey(projectId, data?.name || '', response.data)])

      return { success: true, apiKey: response.data }
    }
    catch (error: any) {
      console.error('Error creating API key:', error)

      return { success: false, error: apiKeyErrorMessage(error, 'Failed to create API key') }
    }
  }

  function removeKeyLocally(keyId: number) {
    for (const [projectId, keys] of apiKeysByProject.value) {
      if (keys.some(key => key.key_id === keyId))
        setProjectKeys(projectId, keys.filter(key => key.key_id !== keyId))
    }
  }

  const revokeApiKey = async (keyId: number) => {
    try {
      await client.delete(`/api/v1/api-keys/${keyId}`)

      removeKeyLocally(keyId)

      return { success: true }
    }
    catch (error: any) {
      console.error('Error revoking API key:', error)

      return { success: false, error: apiKeyErrorMessage(error, 'Failed to revoke API key') }
    }
  }

  const regenerateApiKey = async (keyId: number, projectId: number, name: string, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        await client.delete(`/api/v1/api-keys/${keyId}`)
      }

      const response = await client.post<CreateApiKeyResponse>(`/api/v1/projects/${projectId}/api-keys`, { name })

      removeKeyLocally(keyId)
      const projectKeys = apiKeysByProject.value.get(projectId) ?? []
      setProjectKeys(projectId, [...projectKeys, buildLocalKey(projectId, name, response.data)])

      return { success: true, apiKey: response.data }
    }
    catch (error: any) {
      console.error('Error regenerating API key:', error)

      return { success: false, error: apiKeyErrorMessage(error, 'Failed to regenerate API key') }
    }
  }

  return {
    apiKeys,
    total,
    isLoading,
    error,
    lastFetchTime,
    hasData,
    fetchApiKeys,
    refreshApiKeys,
    createApiKey,
    revokeApiKey,
    regenerateApiKey,
  }
})
