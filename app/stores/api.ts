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
    const authStore = useAuthStore()
    if (authStore.token) {
      reqConfig.headers.Authorization = `Bearer ${authStore.token}`
    }

    return reqConfig
  })

  client.interceptors.response.use(
    response => response,
    async (error) => {
      if (error.response?.status === 401) {
        const requestUrl = error.config?.url || ''
        const isAuthEndpoint = requestUrl.includes('/accounts/login')
          || requestUrl.includes('/accounts/register')
          || requestUrl.includes('/accounts/refresh')

        if (!isAuthEndpoint) {
          const authStore = useAuthStore()

          const refreshed = await authStore.refreshAccessToken()

          if (refreshed && error.config) {
            error.config.headers.Authorization = `Bearer ${authStore.token}`
            return client.request(error.config)
          }
        }
      }

      return Promise.reject(error)
    },
  )

  _client = client

  return { client }
}
