import type { ChangePasswordRequest, ChangePasswordResponse, LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse, RegisterRequest, RegisterResponse, UpdateNameRequest, UpdateNameResponse, User } from '~/types/auth'
import { defineStore } from 'pinia'

const TOKEN_KEY = 'ledger_auth_token'
const REFRESH_TOKEN_KEY = 'ledger_refresh_token'
const TOKEN_EXPIRY_KEY = 'ledger_token_expiry'

export const useAuthStore = defineStore('auth', () => {
  const apiStore = useApiStore()
  const { client } = storeToRefs(apiStore)

  const router = useRouter()

  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const tokenExpiryTime = ref<number | null>(null)
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const authInitialized = ref(false)
  const isRefreshing = ref(false)

  const saveToken = (newToken: string, newRefreshToken: string, expiresIn: number) => {
    token.value = newToken
    refreshToken.value = newRefreshToken
    tokenExpiryTime.value = Date.now() + (expiresIn * 1000)

    if (import.meta.client) {
      localStorage.setItem(TOKEN_KEY, newToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
      localStorage.setItem(TOKEN_EXPIRY_KEY, tokenExpiryTime.value.toString())
    }
  }

  const loadToken = () => {
    if (import.meta.client) {
      const savedToken = localStorage.getItem(TOKEN_KEY)
      const savedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      const savedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY)

      if (savedToken && savedRefreshToken) {
        token.value = savedToken
        refreshToken.value = savedRefreshToken
        tokenExpiryTime.value = savedExpiry ? Number.parseInt(savedExpiry) : null
      }
    }
  }

  const clearToken = () => {
    token.value = null
    refreshToken.value = null
    tokenExpiryTime.value = null
    if (import.meta.client) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(TOKEN_EXPIRY_KEY)
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

      saveToken(response.data.access_token, response.data.refresh_token, response.data.expires_in)

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

      saveToken(response.data.access_token, response.data.refresh_token, response.data.expires_in)

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

  const shouldRefreshToken = () => {
    if (!tokenExpiryTime.value) {
      return false
    }

    // Refresh token 1 minute before expiry (60000ms)
    const refreshThreshold = 60000
    return Date.now() + refreshThreshold >= tokenExpiryTime.value
  }

  const refreshAccessToken = async () => {
    if (!refreshToken.value || isRefreshing.value) {
      return false
    }

    isRefreshing.value = true

    try {
      const response = await client.value.post<RefreshTokenResponse>('/api/v1/accounts/refresh', {
        refresh_token: refreshToken.value,
      } as RefreshTokenRequest)

      saveToken(response.data.access_token, response.data.refresh_token, response.data.expires_in)

      // Update user data if available
      if (response.data.account_id && response.data.email) {
        user.value = {
          account_id: response.data.account_id,
          email: response.data.email,
          name: user.value?.name,
        }
      }

      return true
    }
    catch (error) {
      console.error('Token refresh failed:', error)
      // Refresh token expired or invalid, logout user
      await logout()
      return false
    }
    finally {
      isRefreshing.value = false
    }
  }

  const autoLogin = async () => {
    // Prevent multiple initialization attempts
    if (authInitialized.value) {
      return
    }

    loadToken()
    if (token.value) {
      // Check if token needs refresh before fetching user
      if (shouldRefreshToken()) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          authInitialized.value = true
          return
        }
      }

      await fetchCurrentUser()

      // Set up automatic token refresh check (every 30 seconds)
      if (import.meta.client) {
        setInterval(async () => {
          if (shouldRefreshToken() && refreshToken.value) {
            await refreshAccessToken()
          }
        }, 30000)
      }
    }

    authInitialized.value = true
  }

  const updateName = async (name: string) => {
    try {
      const response = await client.value.put<UpdateNameResponse>('/api/v1/accounts/me/name', { name } as UpdateNameRequest)

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
    refreshToken,
    isAuthenticated,
    isRefreshing,
    login,
    register,
    logout,
    autoLogin,
    updateName,
    changePassword,
    refreshAccessToken,
  }
})
