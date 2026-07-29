import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  Disable2FARequest,
  Disable2FAResponse,
  ListSessionsResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
  Setup2FAResponse,
  TOTPLoginRequest,
  UpdateNameRequest,
  UpdateNameResponse,
  User,
  Verify2FAResponse,
  VerifyEmailResponse,
} from '~/types/auth'
import { defineStore } from 'pinia'

// NOTE ON TOKEN STORAGE (Phase 4.3 auth hardening):
// - The refresh token is NEVER stored client-side anymore. It lives only in
//   an httpOnly cookie set by the gateway (login/register/refresh/2fa/login
//   responses) — JavaScript cannot read or write it, so XSS can no longer
//   exfiltrate it. The browser attaches it automatically (withCredentials)
//   when calling /accounts/refresh.
// - The access token lives ONLY in the `token` ref below — a plain
//   in-memory Pinia value, never written to localStorage. On a full page
//   reload the ref is gone, so autoLogin() silently calls /accounts/refresh
//   (cookie-only, no body needed) to re-establish a session, same pattern
//   apps like GitHub use.

export const useAuthStore = defineStore('auth', () => {
  const { client } = useApiStore()

  const router = useRouter()

  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const tokenExpiryTime = ref<number | null>(null)
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const authInitialized = ref(false)
  const refreshPromise = ref<Promise<boolean> | null>(null)

  const saveToken = (newToken: string, expiresIn: number) => {
    token.value = newToken
    tokenExpiryTime.value = Date.now() + (expiresIn * 1000)
  }

  const clearToken = () => {
    token.value = null
    tokenExpiryTime.value = null
  }

  const fetchCurrentUser = async () => {
    if (!token.value)
      return false

    try {
      const response = await client.get<User>('/api/v1/accounts/me')

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
      const response = await client.post<LoginResponse>('/api/v1/accounts/login', credentials)

      if (response.data.requires_2fa) {
        // Password was correct but the account has 2FA enabled — no tokens
        // yet. The caller (login page) should show a code-entry step and
        // call completeTwoFactorLogin() with the returned session token.
        return {
          success: false,
          requiresTwoFactor: true,
          totpSessionToken: response.data.totp_session_token,
        }
      }

      saveToken(response.data.access_token!, response.data.expires_in!)

      user.value = {
        account_id: response.data.account_id!,
        email: response.data.email!,
        name: response.data.name,
      }

      authInitialized.value = true
      await fetchCurrentUser()
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

  const completeTwoFactorLogin = async (data: TOTPLoginRequest) => {
    try {
      const response = await client.post<LoginResponse>('/api/v1/accounts/2fa/login', data)

      saveToken(response.data.access_token!, response.data.expires_in!)

      user.value = {
        account_id: response.data.account_id!,
        email: response.data.email!,
      }

      authInitialized.value = true
      await fetchCurrentUser()
      await router.push('/panel')

      return { success: true }
    }
    catch (error: any) {
      console.error('2FA login failed:', error)

      const errorMessage = error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || 'Invalid or expired code'

      return { success: false, error: errorMessage }
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      const response = await client.post<RegisterResponse>('/api/v1/accounts/register', data)

      saveToken(response.data.access_token, response.data.expires_in)

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
        // Server revokes all refresh-token sessions and clears the
        // httpOnly cookie.
        await client.post('/api/v1/accounts/logout')
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

  const refreshAccessToken = (): Promise<boolean> => {
    if (refreshPromise.value)
      return refreshPromise.value

    refreshPromise.value = (async () => {
      try {
        // No body needed — the browser attaches the httpOnly refresh_token
        // cookie automatically (withCredentials on the axios client).
        const response = await client.post<RefreshTokenResponse>(
          '/api/v1/accounts/refresh',
          {},
        )

        saveToken(response.data.access_token, response.data.expires_in)

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
        clearToken()
        user.value = null

        return false
      }
      finally {
        refreshPromise.value = null
      }
    })()

    return refreshPromise.value
  }

  const autoLogin = async () => {
    if (authInitialized.value) {
      return
    }

    // The access token is memory-only and never survives a page reload, so
    // there's nothing to "load" — instead, always attempt a silent refresh
    // via the httpOnly cookie. If there's no valid cookie (never logged in,
    // or it expired), this just fails quietly and the user stays logged out.
    const refreshed = await refreshAccessToken()

    if (refreshed) {
      await fetchCurrentUser()

      if (import.meta.client) {
        setInterval(async () => {
          if (shouldRefreshToken()) {
            await refreshAccessToken()
          }
        }, 30000)
      }
    }

    authInitialized.value = true
  }

  const updateName = async (name: string) => {
    try {
      const response = await client.put<UpdateNameResponse>('/api/v1/accounts/me/name', { name } as UpdateNameRequest)

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
      const response = await client.post<ChangePasswordResponse>('/api/v1/accounts/me/password', data)

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

  // ==================== Email Verification ====================

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await client.post<VerifyEmailResponse>('/api/v1/accounts/verify-email', { token: verificationToken })

      if (user.value) {
        user.value.email_verified = true
      }

      return { success: true, message: response.data.message }
    }
    catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to verify email'

      return { success: false, error: errorMessage }
    }
  }

  const resendVerification = async () => {
    try {
      const response = await client.post<ResendVerificationResponse>('/api/v1/accounts/resend-verification')

      return { success: true, alreadyVerified: response.data.already_verified, message: response.data.message }
    }
    catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to send verification email'

      return { success: false, error: errorMessage }
    }
  }

  // ==================== TOTP 2FA ====================

  const setup2FA = async () => {
    try {
      const response = await client.post<Setup2FAResponse>('/api/v1/accounts/2fa/setup')

      return { success: true, secret: response.data.secret, provisioningUri: response.data.provisioning_uri }
    }
    catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to start 2FA setup'

      return { success: false, error: errorMessage }
    }
  }

  const verify2FASetup = async (code: string) => {
    try {
      const response = await client.post<Verify2FAResponse>('/api/v1/accounts/2fa/verify', { code })

      if (user.value) {
        user.value.totp_enabled = true
      }

      return { success: true, backupCodes: response.data.backup_codes, message: response.data.message }
    }
    catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Invalid verification code'

      return { success: false, error: errorMessage }
    }
  }

  const disable2FA = async (data: Disable2FARequest) => {
    try {
      const response = await client.post<Disable2FAResponse>('/api/v1/accounts/2fa/disable', data)

      if (user.value) {
        user.value.totp_enabled = false
      }

      return { success: true, message: response.data.message }
    }
    catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to disable 2FA'

      return { success: false, error: errorMessage }
    }
  }

  // ==================== Session Management ====================

  const listSessions = async () => {
    try {
      const response = await client.get<ListSessionsResponse>('/api/v1/accounts/sessions')

      return { success: true, sessions: response.data.sessions }
    }
    catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load sessions'

      return { success: false, error: errorMessage, sessions: [] }
    }
  }

  const revokeSession = async (sessionId: number) => {
    try {
      const response = await client.post<RevokeSessionResponse>(`/api/v1/accounts/sessions/${sessionId}/revoke`)

      return { success: true, message: response.data.message }
    }
    catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to revoke session'

      return { success: false, error: errorMessage }
    }
  }

  const revokeAllSessions = async (includeCurrent = false) => {
    try {
      const response = await client.post<RevokeAllSessionsResponse>(
        '/api/v1/accounts/sessions/revoke-all',
        {},
        { params: { include_current: includeCurrent } },
      )

      if (includeCurrent) {
        clearToken()
        user.value = null
        authInitialized.value = false
        await router.push('/login')
      }

      return { success: true, revokedCount: response.data.revoked_count, message: response.data.message }
    }
    catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to revoke sessions'

      return { success: false, error: errorMessage }
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    completeTwoFactorLogin,
    register,
    logout,
    autoLogin,
    updateName,
    changePassword,
    refreshAccessToken,
    verifyEmail,
    resendVerification,
    setup2FA,
    verify2FASetup,
    disable2FA,
    listSessions,
    revokeSession,
    revokeAllSessions,
  }
})
