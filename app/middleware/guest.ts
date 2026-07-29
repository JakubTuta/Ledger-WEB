export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    await authStore.autoLogin()
  }

  if (authStore.isAuthenticated) {
    return navigateTo('/panel')
  }
})
