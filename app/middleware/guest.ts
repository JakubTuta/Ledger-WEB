export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const authStore = useAuthStore()

  // Try to restore authentication if not already authenticated
  if (!authStore.isAuthenticated) {
    await authStore.autoLogin()
  }

  // If authenticated, redirect to panel
  if (authStore.isAuthenticated) {
    return navigateTo('/panel')
  }
})
