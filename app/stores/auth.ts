import type { ChangePasswordRequest, ChangePasswordResponse, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, UpdateNameRequest, UpdateNameResponse, User } from '~/types/auth'
import { defineStore } from 'pinia'

const TOKEN_KEY = 'ledger_auth_token'

export const useAuthStore = defineStore('auth', () => {
  const apiStore = useApiStore()
  const { client } = storeToRefs(apiStore)

  const router = useRouter()

  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const authInitialized = ref(false)

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
      const response = await client.value.get<User>('/api/v1/accounts/me')

      user.value = response.data

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
      const response = await client.value.post<LoginResponse>('/api/v1/accounts/login', credentials)

      saveToken(response.data.access_token)

      user.value = {
        account_id: response.data.account_id,
        email: response.data.email,
        name: response.data.name,
      }

      authInitialized.value = true
      await router.push('/panel')

      return { success: true }
    }
    catch (error: any) {
      console.error('Login failed:', error)

      const errorMessage = error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || 'Login failed'

      return { success: false, error: errorMessage }
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      const response = await client.value.post<RegisterResponse>('/api/v1/accounts/register', data)

      saveToken(response.data.access_token)

      user.value = {
        account_id: response.data.account_id,
        email: response.data.email,
        name: response.data.name,
      }

      authInitialized.value = true
      await router.push('/panel')

      return { success: true, message: response.data.detail }
    }
    catch (error: any) {
      console.error('Registration failed:', error)

      const errorMessage = error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || 'Registration failed'

      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      if (token.value) {
        await client.value.post('/api/v1/accounts/logout')
      }
    }
    catch (error) {
      console.error('Logout API call failed:', error)
    }
    finally {
      clearToken()
      user.value = null
      authInitialized.value = false
      await router.push('/')
    }
  }

  const autoLogin = async () => {
    // Prevent multiple initialization attempts
    if (authInitialized.value) {
      return
    }

    loadToken()
    if (token.value) {
      await fetchCurrentUser()
    }

    authInitialized.value = true
  }

  const updateName = async (name: string) => {
    try {
      const response = await client.value.patch<UpdateNameResponse>('/api/v1/accounts/me/name', { name } as UpdateNameRequest)

      if (user.value) {
        user.value.name = response.data.name
      }

      return { success: true, message: response.data.detail }
    }
    catch (error: any) {
      console.error('Failed to update name:', error)

      const errorMessage = error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || 'Failed to update name'

      return { success: false, error: errorMessage }
    }
  }

  const changePassword = async (data: ChangePasswordRequest) => {
    try {
      const response = await client.value.post<ChangePasswordResponse>('/api/v1/accounts/me/password', data)

      return { success: true, message: response.data.detail }
    }
    catch (error: any) {
      console.error('Failed to change password:', error)

      const errorMessage = error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || 'Failed to change password'

      return { success: false, error: errorMessage }
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
    updateName,
    changePassword,
  }
})
