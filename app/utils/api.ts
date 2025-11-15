export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const apiFetch = async <T>(endpoint: string, options: any = {}): Promise<T> => {
    const headers: Record<string, string> = {
      ...options.headers,
    }

    if (authStore.token) {
      headers.Authorization = `Bearer ${authStore.token}`
    }

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${config.public.serverUrl}${endpoint}`

    return await $fetch<T>(url, {
      ...options,
      headers,
    })
  }

  return {
    get: <T>(endpoint: string, options: any = {}) => apiFetch<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, body?: any, options: any = {}) => apiFetch<T>(endpoint, { ...options, method: 'POST', body }),

    put: <T>(endpoint: string, body?: any, options: any = {}) => apiFetch<T>(endpoint, { ...options, method: 'PUT', body }),

    delete: <T>(endpoint: string, options: any = {}) => apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),

    patch: <T>(endpoint: string, body?: any, options: any = {}) => apiFetch<T>(endpoint, { ...options, method: 'PATCH', body }),
  }
}
