<template>
  <v-app>
    <AppNavBar />

    <v-main class="gradient-bg">
      <NuxtPage />
    </v-main>

    <div class="notifications-wrapper">
      <NotificationPopup />
    </div>
  </v-app>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const streamStore = useNotificationStreamStore()

watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated) {
    streamStore.connect()
  }
  else {
    streamStore.disconnect()
  }
}, { immediate: true })

onMounted(async () => {
  await authStore.autoLogin()
})

onBeforeUnmount(() => {
  streamStore.disconnect()
})
</script>

<style scoped>
.gradient-bg {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
}

.notifications-wrapper {
  position: fixed;
  top: 80px;
  right: 16px;
  max-width: 400px;
  z-index: 9999;
  pointer-events: none;
}

.notifications-wrapper :deep(*) {
  pointer-events: auto;
}
</style>
