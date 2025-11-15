import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '~/types/auth'
import { defineStore } from 'pinia'

const TOKEN_KEY = 'ledger_auth_token'

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  const router = useRouter()

  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isAuthenticated = computed(() => !!user.value && !!token.value)

  const saveToken = (newToken: string) => {
    token.value = newToken
    if (import.meta.client) {
      localStorage.setItem(TOKEN_KEY, newToken)
    }
  }

  const loadToken = () => {
    if (import.meta.client) {
      const savedToken = localStorage.getItem(TOKEN_KEY)
      if (savedToken) {
        token.value = savedToken
      }
    }
  }

  const clearToken = () => {
    token.value = null
    if (import.meta.client) {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  const fetchCurrentUser = async () => {
    if (!token.value)
      return false

    try {
      const response = await $fetch<User>(`${config.public.serverUrl}/api/v1/accounts/me`, {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })

      user.value = response

      return true
    }
    catch (error) {
      console.error('Failed to fetch current user:', error)
      clearToken()
      user.value = null

      return false
    }
  }

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await $fetch<LoginResponse>(`${config.public.serverUrl}/api/v1/accounts/login`, {
        method: 'POST',
        body: credentials,
      })

      saveToken(response.access_token)

      user.value = {
        account_id: response.account_id,
        email: response.email,
      }

      await router.push('/panel')

      return { success: true }
    }
    catch (error: any) {
      console.error('Login failed:', error)

      return { success: false, error: error.message || 'Login failed' }
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      const response = await $fetch<RegisterResponse>(`${config.public.serverUrl}/api/v1/accounts/register`, {
        method: 'POST',
        body: data,
      })

      saveToken(response.access_token)

      user.value = {
        account_id: response.account_id,
        email: response.email,
        name: response.name,
      }

      await router.push('/panel')

      return { success: true, message: response.message }
    }
    catch (error: any) {
      console.error('Registration failed:', error)

      return { success: false, error: error.message || 'Registration failed' }
    }
  }

  const logout = async () => {
    try {
      if (token.value) {
        await $fetch(`${config.public.serverUrl}/api/v1/accounts/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.value}`,
          },
        })
      }
    }
    catch (error) {
      console.error('Logout API call failed:', error)
    }
    finally {
      clearToken()
      user.value = null
      await router.push('/')
    }
  }

  const autoLogin = async () => {
    loadToken()
    if (token.value) {
      const success = await fetchCurrentUser()
      if (success) {
        const currentPath = router.currentRoute.value.path
        if (currentPath === '/' || currentPath === '/login' || currentPath === '/register') {
          await router.push('/panel')
        }
      }
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    autoLogin,
  }
})
