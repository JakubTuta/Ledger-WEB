<template>
  <v-menu
    v-model="menuOpen"
    :close-on-content-click="false"
    location="bottom end"
    offset="8"
    max-width="400"
    min-width="380"
  >
    <template #activator="{'props': menuProps}">
      <v-btn
        v-bind="menuProps"
        icon
        variant="text"
        color="white"
      >
        <v-badge
          :content="unreadCount > 99
            ? '99+'
            : unreadCount"
          :model-value="unreadCount > 0"
          color="error"
        >
          <v-icon icon="mdi-bell" />
        </v-badge>
      </v-btn>
    </template>

    <v-card
      elevation="8"
      rounded="lg"
    >
      <v-card-title class="d-flex align-center justify-space-between pa-3">
        <span class="text-subtitle-1 font-weight-bold">Notifications</span>

        <div class="d-flex align-center gap-1">
          <v-btn
            :icon="soundEnabled
              ? 'mdi-volume-high'
              : 'mdi-volume-off'"
            variant="text"
            size="small"
            :title="soundEnabled
              ? 'Mute alert sound'
              : 'Unmute alert sound'"
            @click="streamStore.toggleSound"
          />

          <v-btn
            v-if="unreadCount > 0"
            variant="text"
            size="small"
            prepend-icon="mdi-check-all"
            @click="handleMarkAllRead"
          >
            Mark all read
          </v-btn>

          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="menuOpen = false"
          />
        </div>
      </v-card-title>

      <v-divider />

      <div
        v-if="streamStore.inboxLoading && inbox.length === 0"
        class="pa-4"
      >
        <v-skeleton-loader type="list-item-three-line" />

        <v-skeleton-loader type="list-item-three-line" />
      </div>

      <v-list
        v-else-if="displayedNotifications.length > 0"
        class="pa-0"
        max-height="360"
        style="overflow-y: auto;"
      >
        <template
          v-for="(notification, index) in displayedNotifications"
          :key="notification.id"
        >
          <v-list-item
            :class="notification.read_at
              ? 'opacity-60'
              : ''"
            class="px-3 py-2"
          >
            <template #prepend>
              <v-icon
                :icon="getLevelIcon(notification.level)"
                :color="getLevelColor(notification.level)"
                size="20"
                class="mr-2"
              />
            </template>

            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ notification.error_type || notification.message }}
            </v-list-item-title>

            <v-list-item-subtitle class="text-caption">
              <span>{{ notification.project_name }}</span>

              <span class="mx-1">·</span>

              <span>{{ formatRelativeTime(notification.timestamp) }}</span>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center gap-1">
                <v-btn
                  v-if="!notification.read_at"
                  icon="mdi-check"
                  variant="text"
                  size="x-small"
                  title="Mark read"
                  @click.stop="streamStore.markRead(notification.id)"
                />

                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="x-small"
                  title="Delete"
                  @click.stop="streamStore.deleteNotificationFromInbox(notification.id)"
                />
              </div>
            </template>
          </v-list-item>

          <v-divider
            v-if="index < displayedNotifications.length - 1"
            :key="`divider-${notification.id}`"
          />
        </template>
      </v-list>

      <div
        v-else
        class="d-flex flex-column align-center justify-center gap-2 pa-6"
      >
        <v-icon
          icon="mdi-bell-check-outline"
          size="36"
          color="success"
        />

        <span class="text-body-2 text-medium-emphasis">All caught up</span>
      </div>

      <v-divider />

      <v-card-actions class="pa-2">
        <v-btn
          variant="text"
          size="small"
          to="/notifications"
          prepend-icon="mdi-history"
          @click="menuOpen = false"
        >
          View all notifications
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import type { NotificationLevel } from '~/types/notifications'

const streamStore = useNotificationStreamStore()
const { inbox, unreadCount, soundEnabled } = storeToRefs(streamStore)

const menuOpen = ref(false)
const currentTime = ref(Date.now())

let timeInterval: NodeJS.Timeout | null = null

onMounted(() => {
  streamStore.fetchInbox()
  timeInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 30_000)
})

onUnmounted(() => {
  if (timeInterval)
    clearInterval(timeInterval)
})

watch(menuOpen, (open) => {
  if (open)
    streamStore.fetchInbox()
})

const displayedNotifications = computed(() => inbox.value.slice(0, 10))

function getLevelColor(level: NotificationLevel): string {
  const map: Record<string, string> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'info',
  }

  return map[level] ?? 'error'
}

function getLevelIcon(level: NotificationLevel): string {
  const map: Record<string, string> = {
    critical: 'mdi-alert-circle',
    error: 'mdi-alert',
    warning: 'mdi-alert-outline',
    info: 'mdi-information-outline',
  }

  return map[level] ?? 'mdi-alert'
}

function formatRelativeTime(timestamp: string): string {
  try {
    const diff = currentTime.value - new Date(timestamp).getTime()
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
    if (seconds > 5)
      return `${seconds}s ago`

    return 'Just now'
  }
  catch {
    return timestamp
  }
}

async function handleMarkAllRead() {
  await streamStore.markAllRead()
}
</script>
