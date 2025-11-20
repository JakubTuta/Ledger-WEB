import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { defineStore } from 'pinia'

export const useApiStore = defineStore('api', () => {
  const config = useRuntimeConfig()

  const client = ref<AxiosInstance>(axios.create({
    baseURL: config.public.serverUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  }))

  client.value.interceptors.request.use((config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }

    return config
  })

  client.value.interceptors.response.use(
    response => response,
    (error) => {
      if (error.response?.status === 401) {
        const requestUrl = error.config?.url || ''
        const isAuthEndpoint = requestUrl.includes('/accounts/login') || requestUrl.includes('/accounts/register')

        if (!isAuthEndpoint) {
          const authStore = useAuthStore()
          authStore.logout()
        }
      }

      return Promise.reject(error)
    },
  )

  return {
    client,
  }
})
