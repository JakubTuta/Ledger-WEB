export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const authStore = useAuthStore()

  // If not authenticated, try to restore from token
  if (!authStore.isAuthenticated) {
    await authStore.autoLogin()
  }

  // After attempting auto-login, check authentication
  if (!authStore.isAuthenticated) {
    return navigateTo('/')
  }
})
