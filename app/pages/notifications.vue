<template>
  <v-container
    fluid
    class="pa-4"
  >
    <div class="d-flex align-center mb-4">
      <v-icon
        icon="mdi-bell-outline"
        class="mr-2"
      />

      <span class="text-h5 font-weight-bold">Notifications</span>

      <v-chip
        v-if="streamStore.unreadCount > 0"
        color="error"
        size="small"
        class="ml-2"
      >
        {{ streamStore.unreadCount }} unread
      </v-chip>
    </div>

    <!-- Filters -->
    <v-card
      class="mb-4"
      elevation="1"
    >
      <v-card-text class="py-2">
        <div class="d-flex align-center ga-2 flex-wrap">
          <v-switch
            v-model="filters.unreadOnly"
            label="Unread only"
            density="compact"
            hide-details
            color="primary"
          />

          <v-select
            v-model="filters.projectId"
            label="Project"
            variant="outlined"
            density="compact"
            :items="projectOptions"
            item-title="name"
            item-value="id"
            clearable
            hide-details
            style="max-width: 220px"
          />

          <v-select
            v-model="filters.kind"
            label="Kind"
            variant="outlined"
            density="compact"
            :items="kindOptions"
            item-title="label"
            item-value="value"
            clearable
            hide-details
            style="max-width: 180px"
          />

          <v-text-field
            v-model="filters.from"
            label="From"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 180px"
          />

          <v-text-field
            v-model="filters.to"
            label="To"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 180px"
          />

          <v-spacer />

          <v-btn
            v-if="selectedIds.size > 0"
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-check-all"
            @click="bulkMarkRead"
          >
            Mark {{ selectedIds.size }} read
          </v-btn>

          <v-btn
            v-if="streamStore.unreadCount > 0"
            variant="outlined"
            size="small"
            prepend-icon="mdi-check-all"
            @click="streamStore.markAllRead()"
          >
            Mark all read
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Notifications list -->
    <v-card elevation="1">
      <div
        v-if="isLoading && notifications.length === 0"
        class="pa-4"
      >
        <v-skeleton-loader
          v-for="i in 5"
          :key="i"
          type="list-item-three-line"
          class="mb-2"
        />
      </div>

      <v-list
        v-else-if="notifications.length > 0"
        class="pa-0"
      >
        <template
          v-for="(notification, index) in notifications"
          :key="notification.id"
        >
          <v-list-item
            class="px-4 py-3"
            :class="!notification.read_at
              ? 'bg-surface-variant'
              : ''"
          >
            <template #prepend>
              <v-checkbox
                :model-value="selectedIds.has(notification.id)"
                density="compact"
                hide-details
                class="mr-2"
                @update:model-value="toggleSelect(notification.id)"
              />

              <v-icon
                :icon="getLevelIcon(notification.level)"
                :color="getLevelColor(notification.level)"
                size="22"
                class="mr-3"
              />
            </template>

            <v-list-item-title class="text-body-2 font-weight-medium">
              <span>{{ notification.error_type || notification.message }}</span>

              <v-chip
                v-if="!notification.read_at"
                color="primary"
                size="x-small"
                class="ml-2"
              >
                NEW
              </v-chip>
            </v-list-item-title>

            <v-list-item-subtitle class="text-caption mt-1">
              <span v-if="notification.project_name">{{ notification.project_name }}</span>

              <span
                v-if="notification.project_name"
                class="mx-1"
              >·</span>

              <v-chip
                :color="getLevelColor(notification.level)"
                size="x-small"
                variant="flat"
                class="mr-1"
              >
                {{ notification.level }}
              </v-chip>

              <span>{{ formatTimestamp(notification.timestamp) }}</span>
            </v-list-item-subtitle>

            <v-expand-transition>
              <div
                v-if="notification.expanded"
                class="mt-3"
              >
                <div
                  v-if="notification.message"
                  class="mb-2"
                >
                  <div class="text-caption font-weight-bold mb-1">
                    Message
                  </div>

                  <div class="text-body-2">
                    {{ notification.message }}
                  </div>
                </div>

                <div
                  v-if="notification.stack_trace"
                  class="mb-2"
                >
                  <div class="text-caption font-weight-bold mb-1">
                    Stack Trace
                  </div>

                  <pre class="stack-trace text-caption">{{ notification.stack_trace }}</pre>
                </div>

                <div
                  v-if="notification.context && Object.keys(notification.context).length > 0"
                  class="mb-2"
                >
                  <div class="text-caption font-weight-bold mb-1">
                    Context
                  </div>

                  <pre class="stack-trace text-caption">{{ JSON.stringify(notification.context, null, 2) }}</pre>
                </div>
              </div>
            </v-expand-transition>

            <template #append>
              <div class="d-flex align-center gap-1">
                <v-btn
                  :icon="notification.expanded
                    ? 'mdi-chevron-up'
                    : 'mdi-chevron-down'"
                  variant="text"
                  size="x-small"
                  @click.stop="notification.expanded = !notification.expanded"
                />

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
            v-if="index < notifications.length - 1"
            :key="`d-${notification.id}`"
          />
        </template>
      </v-list>

      <div
        v-else
        class="d-flex flex-column align-center justify-center gap-2 pa-8"
      >
        <v-icon
          icon="mdi-bell-check-outline"
          size="48"
          color="success"
        />

        <span class="text-body-1 text-medium-emphasis">No notifications</span>
      </div>

      <!-- Load more -->
      <div
        v-if="hasMore"
        class="d-flex justify-center pa-3"
      >
        <v-btn
          variant="text"
          :loading="isLoading"
          @click="loadMore"
        >
          Load more
        </v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import type { InboxNotification, NotificationKind, NotificationLevel } from '~/types/notifications'

definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: 'Notifications',
  robots: 'noindex, nofollow',
})

const streamStore = useNotificationStreamStore()
const projectsStore = useProjectsStore()
const { projects } = storeToRefs(projectsStore)

const notifications = ref<InboxNotification[]>([])
const isLoading = ref(false)
const hasMore = ref(false)
const offset = ref(0)
const selectedIds = ref<Set<string>>(new Set())
const LIMIT = 30

const filters = reactive({
  unreadOnly: false,
  projectId: null as number | null,
  kind: null as NotificationKind | null,
  from: '',
  to: '',
})

const projectOptions = computed(() => projects.value.map(p => ({ id: p.project_id, name: p.name })),
)

const kindOptions = [
  { label: 'Error notification', value: 'error_notification' },
  { label: 'Alert', value: 'alert' },
  { label: 'Info', value: 'info' },
]

async function loadNotifications(reset = true) {
  isLoading.value = true
  if (reset) {
    offset.value = 0
    notifications.value = []
    selectedIds.value = new Set()
  }

  const params: Record<string, any> = {
    limit: LIMIT,
    offset: offset.value,
  }
  if (filters.unreadOnly)
    params.unread = true
  if (filters.projectId)
    params.project_id = filters.projectId
  if (filters.kind)
    params.kind = filters.kind
  if (filters.from)
    params.from = filters.from
  if (filters.to)
    params.to = filters.to

  const data = await streamStore.fetchHistory(params)
  if (data) {
    const mapped = data.notifications.map(n => ({ ...n, expanded: false }))
    if (reset) {
      notifications.value = mapped
    }
    else {
      notifications.value.push(...mapped)
    }
    hasMore.value = data.has_more
    offset.value += data.notifications.length
  }
  isLoading.value = false
}

async function loadMore() {
  await loadNotifications(false)
}

watch(filters, () => loadNotifications(true), { deep: true })

function toggleSelect(id: string) {
  if (selectedIds.value.has(id))
    selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

async function bulkMarkRead() {
  await Promise.all([...selectedIds.value].map(id => streamStore.markRead(id)))
  notifications.value.forEach((n) => {
    if (selectedIds.value.has(n.id))
      n.read_at = new Date().toISOString()
  })
  selectedIds.value = new Set()
}

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

function formatTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString()
  }
  catch {
    return timestamp
  }
}

onMounted(() => {
  projectsStore.fetchProjects()
  loadNotifications()
})
</script>

<style scoped>
.stack-trace {
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
</style>
