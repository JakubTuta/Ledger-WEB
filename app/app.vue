<template>
  <v-app>
    <AppNavBar />

    <v-main class="gradient-bg">
      <NuxtPage />
    </v-main>

    <!-- Global trace detail drawer -->
    <v-navigation-drawer
      v-model="traceDrawer.isOpen.value"
      location="right"
      temporary
      width="560"
    >
      <div class="d-flex align-center justify-space-between pa-3 border-b">
        <span class="text-subtitle-1 font-weight-bold">Trace Detail</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="traceDrawer.close()"
        />
      </div>

      <TracesTraceDetail
        v-if="traceDrawer.currentTraceId.value"
        :trace-id="traceDrawer.currentTraceId.value"
        class="overflow-y-auto"
        style="height: calc(100% - 56px);"
      />
    </v-navigation-drawer>

    <v-snackbar
      v-model="showConnectionError"
      location="top"
      color="error"
      timeout="-1"
    >
      <div class="d-flex align-center">
        <v-icon
          icon="mdi-cloud-off-outline"
          class="mr-2"
        />
        {{ streamStore.connectionError }}
      </div>

      <template #actions>
        <v-btn
          variant="text"
          @click="handleReconnect"
        >
          Retry
        </v-btn>

        <v-btn
          icon="mdi-close"
          variant="text"
          @click="showConnectionError = false"
        />
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const streamStore = useNotificationStreamStore()
const traceDrawer = useTraceDrawer()

const showConnectionError = ref(false)

if (import.meta.client) {
  watch(() => authStore.isAuthenticated, (isAuthenticated) => {
    if (isAuthenticated) {
      streamStore.connect()
      streamStore.fetchInbox()
    }
    else {
      streamStore.disconnect()
    }
  }, { immediate: true })
}

watch(() => streamStore.connectionError, (error) => {
  if (error) showConnectionError.value = true
})

function handleReconnect() {
  showConnectionError.value = false
  streamStore.connect()
}

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
</style>
