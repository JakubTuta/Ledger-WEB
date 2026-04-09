<template>
  <div class="notification-container">
    <TransitionGroup name="notification">
      <v-card
        v-for="notification in activeNotifications"
        :key="notification.id"
        :color="getNotificationColor(notification.level)"
        variant="elevated"
        elevation="8"
        class="mb-3"
      >
        <v-card-title class="d-flex align-center justify-space-between pa-3">
          <div class="d-flex align-center">
            <v-icon
              :icon="getNotificationIcon(notification.level)"
              :color="getIconColor(notification.level)"
              class="mr-2"
            />

            <span class="text-subtitle-1 font-weight-bold">
              {{ notification.error_type }}
            </span>
          </div>

          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="handleClose(notification.id)"
          />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-3">
          <div class="d-flex align-center text-caption text-medium-emphasis gap-2">
            <span v-if="notification.timestamp">
              {{ formatTimestamp(notification.timestamp) }}
            </span>
          </div>

          <v-expand-transition>
            <div v-if="notification.expanded">
              <v-divider class="my-3" />

              <div class="mb-3">
                <div class="text-caption font-weight-bold mb-1">
                  Message:
                </div>

                <div class="text-body-2">
                  {{ notification.message }}
                </div>
              </div>

              <div class="mb-3">
                <div class="text-caption font-weight-bold mb-1">
                  Details:
                </div>

                <div class="d-flex align-center gap-2">
                  <v-chip
                    :color="getNotificationColor(notification.level)"
                    size="small"
                    variant="flat"
                  >
                    Level: {{ notification.level.toUpperCase() }}
                  </v-chip>

                  <v-chip
                    v-if="notification.project_name"
                    size="small"
                    variant="outlined"
                  >
                    Project: {{ notification.project_name }}
                  </v-chip>
                </div>
              </div>

              <div
                v-if="notification.stack_trace"
                class="mb-3"
              >
                <div class="text-caption font-weight-bold mb-1">
                  Stack Trace:
                </div>

                <pre class="stack-trace text-caption">{{ notification.stack_trace }}</pre>
              </div>

              <div
                v-if="notification.context && Object.keys(notification.context).length > 0"
                class="mb-2"
              >
                <div class="text-caption font-weight-bold mb-1">
                  Context:
                </div>

                <pre class="context-data text-caption">{{ JSON.stringify(notification.context, null, 2) }}</pre>
              </div>
            </div>
          </v-expand-transition>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-2">
          <v-btn
            :prepend-icon="notification.expanded
              ? 'mdi-chevron-up'
              : 'mdi-chevron-down'"
            variant="text"
            size="small"
            @click="handleToggleExpand(notification.id)"
          >
            {{ notification.expanded
              ? 'Hide Details'
              : 'Show Details' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </TransitionGroup>

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
  </div>
</template>

<script setup lang="ts">
import type { NotificationLevel } from '~/types/notifications'

const streamStore = useNotificationStreamStore()
const { notifications } = storeToRefs(streamStore)

const showConnectionError = ref(false)
const currentTime = ref(Date.now())

const activeNotifications = computed(() => {
  return notifications.value
})

let timeUpdateInterval: NodeJS.Timeout | null = null

onMounted(() => {
  timeUpdateInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})

watch(() => streamStore.connectionError, (error) => {
  if (error) {
    showConnectionError.value = true
  }
})

function getNotificationColor(level: NotificationLevel): string {
  const colors: Record<NotificationLevel, string> = {
    critical: 'error',
    error: 'error',
  }

  return colors[level] || 'error'
}

function getIconColor(level: NotificationLevel): string {
  const colors: Record<NotificationLevel, string> = {
    critical: 'white',
    error: 'white',
  }

  return colors[level] || 'white'
}

function getNotificationIcon(level: NotificationLevel): string {
  const icons: Record<NotificationLevel, string> = {
    critical: 'mdi-alert-circle',
    error: 'mdi-alert',
  }

  return icons[level] || 'mdi-alert'
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const diff = currentTime.value - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0)
      return `${days}d ago`
    if (hours > 0)
      return `${hours}h ago`
    if (minutes > 0)
      return `${minutes}m ago`
    if (seconds > 0)
      return `${seconds}s ago`

    return 'Just now'
  }
  catch {
    return timestamp
  }
}

function handleClose(notificationId: string) {
  streamStore.removeNotification(notificationId)
}

function handleToggleExpand(notificationId: string) {
  streamStore.toggleExpanded(notificationId)
}

function handleReconnect() {
  showConnectionError.value = false
  streamStore.connect()
}
</script>

<style scoped>
.notification-container {
  width: 100%;
}

.stack-trace,
.context-data {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>
