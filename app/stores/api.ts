import type { AxiosInstance } from 'axios'
import axios from 'axios'

let _client: AxiosInstance | null = null

export const useApiStore = () => {
  if (_client) {
    return { client: _client }
  }

  const config = useRuntimeConfig()

  const client = axios.create({
    baseURL: config.public.serverUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use((reqConfig) => {
    const isRefreshEndpoint = reqConfig.url?.includes('/accounts/refresh')
    if (!isRefreshEndpoint) {
      const authStore = useAuthStore()
      if (authStore.token) {
        reqConfig.headers.Authorization = `Bearer ${authStore.token}`
      }
    }

    return reqConfig
  })

  client.interceptors.response.use(
    response => response,
    async (error) => {
      const original = error.config
      if (error.response?.status === 401 && original && !original._retry) {
        const requestUrl = original.url || ''
        const isAuthEndpoint = requestUrl.includes('/accounts/login')
          || requestUrl.includes('/accounts/register')
          || requestUrl.includes('/accounts/refresh')
          || requestUrl.includes('/accounts/logout')

        if (!isAuthEndpoint) {
          original._retry = true
          const authStore = useAuthStore()
          const refreshed = await authStore.refreshAccessToken()

          if (refreshed) {
            original.headers.Authorization = `Bearer ${authStore.token}`
            return client.request(original)
          }
        }
      }

      return Promise.reject(error)
    },
  )

  _client = client

  return { client }
}
