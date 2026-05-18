<template>
  <div class="alert-toast-stack">
    <v-card
      v-for="toast in toasts"
      :key="toast.id"
      color="error"
      theme="dark"
      elevation="8"
      rounded="lg"
      class="alert-toast mb-3"
    >
      <div class="d-flex gap-2 pa-3 align-start">
        <v-icon
          icon="mdi-fire"
          size="22"
          class="mt-1"
        />

        <div class="min-w-0 flex-grow-1">
          <div class="text-subtitle-2 font-weight-bold">
            {{ toast.error_type || 'Alert firing' }}
          </div>

          <div class="text-body-2 toast-message">
            {{ toast.message }}
          </div>

          <div class="text-caption text-medium-emphasis mt-1">
            <span v-if="toast.project_name">{{ toast.project_name }}</span>

            <span
              v-if="toast.project_name"
              class="mx-1"
            >·</span>

            <span>{{ formatRelativeTime(toast.timestamp) }}</span>
          </div>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="x-small"
          @click="streamStore.dismissToast(toast.id)"
        />
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
const streamStore = useNotificationStreamStore()
const { toasts } = storeToRefs(streamStore)

const AUTO_DISMISS_MS = 8000
const timers = new Map<string, ReturnType<typeof setTimeout>>()

watch(toasts, (list) => {
  for (const toast of list) {
    if (!timers.has(toast.id)) {
      const handle = setTimeout(() => {
        streamStore.dismissToast(toast.id)
        timers.delete(toast.id)
      }, AUTO_DISMISS_MS)
      timers.set(toast.id, handle)
    }
  }

  const activeIds = new Set(list.map(t => t.id))
  for (const [id, handle] of timers) {
    if (!activeIds.has(id)) {
      clearTimeout(handle)
      timers.delete(id)
    }
  }
}, { deep: true })

onUnmounted(() => {
  for (const handle of timers.values())
    clearTimeout(handle)
  timers.clear()
})

function formatRelativeTime(timestamp: string): string {
  try {
    const diff = Date.now() - new Date(timestamp).getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0)
      return `${minutes}m ago`
    if (seconds > 5)
      return `${seconds}s ago`

    return 'Just now'
  }
  catch {
    return timestamp
  }
}
</script>

<style scoped>
.alert-toast-stack {
  position: fixed;
  top: 72px;
  right: 16px;
  z-index: 2400;
  width: 360px;
  max-width: calc(100vw - 32px);
  pointer-events: none;
}

.alert-toast {
  pointer-events: auto;
}

.toast-message {
  word-break: break-word;
}

.min-w-0 {
  min-width: 0;
}
</style>
