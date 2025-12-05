<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    :icon="icon"
    :icon-color="iconColor"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
  >
    <template #content>
      <v-card-text class="panel-content-container pa-3">
        <!-- Loading State -->
        <div
          v-if="loading && (!items || items.length === 0)"
          class="d-flex align-center justify-center"
          style="height: 100%;"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>

        <!-- No Data State -->
        <div
          v-else-if="!items || items.length === 0"
          class="text-grey d-flex align-center justify-center"
          style="height: 100%;"
        >
          <div class="text-center">
            <v-icon
              :icon="emptyIcon"
              size="48"
              class="mb-2"
            />

            <div class="text-body-2">
              {{ emptyMessage }}
            </div>
          </div>
        </div>

        <!-- List -->
        <div v-else>
          <v-card
            v-for="item in items"
            :key="item.log_id"
            :color="getItemColor(item)"
            variant="elevated"
            elevation="1"
            class="item-card mb-2"
          >
            <v-card-title
              class="d-flex align-center justify-space-between cursor-pointer pa-2"
              :class="type === 'errors'
                ? 'min-h-50px'
                : ''"
              @click="toggleExpanded(item)"
            >
              <div class="d-flex align-center flex-grow-1 gap-1">
                <v-icon
                  :icon="getItemIcon(item)"
                  :color="getIconColorForItem(item)"
                  size="x-small"
                  class="mr-1"
                />

                <!-- Error type display -->
                <div
                  v-if="type === 'errors'"
                  class="d-flex align-center gap-1"
                >
                  <span class="text-body-2 font-weight-bold">
                    {{ item.error_type }}
                  </span>

                  <v-chip
                    v-if="item.isNew"
                    size="x-small"
                    color="success"
                    variant="flat"
                    class="ml-1"
                  >
                    NEW
                  </v-chip>
                </div>

                <!-- Log message display -->
                <div
                  v-else
                  class="d-flex flex-column flex-grow-1"
                >
                  <span class="text-body-2 font-weight-bold">
                    {{ item.message }}
                  </span>

                  <div class="d-flex align-center gap-1">
                    <v-chip
                      size="x-small"
                      :color="getLevelColor(item.level)"
                      variant="flat"
                    >
                      {{ item.level.toUpperCase() }}
                    </v-chip>

                    <v-chip
                      size="x-small"
                      variant="outlined"
                    >
                      {{ item.log_type }}
                    </v-chip>
                  </div>
                </div>
              </div>

              <span
                v-if="item.timestamp"
                class="text-caption text-medium-emphasis ml-2"
              >
                {{ formatTimestamp(item.timestamp) }}
              </span>
            </v-card-title>

            <v-expand-transition>
              <v-card-text
                v-if="item.expanded"
                class="pa-2 pt-0"
              >
                <!-- Error details -->
                <template v-if="type === 'errors'">
                  <div class="mb-2">
                    <div class="text-caption font-weight-bold mb-1">
                      Message:
                    </div>

                    <div class="text-caption">
                      {{ item.message }}
                    </div>
                  </div>

                  <div
                    v-if="item.attributes?.stack_trace"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Stack Trace:
                    </div>

                    <pre class="stack-trace text-caption">{{ item.attributes.stack_trace }}</pre>
                  </div>

                  <div
                    v-if="item.attributes && Object.keys(item.attributes).length > 0"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Attributes:
                    </div>

                    <pre class="context-data text-caption">{{ JSON.stringify(item.attributes, null, 2) }}</pre>
                  </div>
                </template>

                <!-- Log details -->
                <template v-else>
                  <div
                    v-if="item.error_type || item.error_message"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Error Details:
                    </div>

                    <div
                      v-if="item.error_type"
                      class="text-caption"
                    >
                      <span class="font-weight-bold">Type:</span> {{ item.error_type }}
                    </div>

                    <div
                      v-if="item.error_message"
                      class="text-caption"
                    >
                      <span class="font-weight-bold">Message:</span> {{ item.error_message }}
                    </div>
                  </div>

                  <div
                    v-if="item.stack_trace"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Stack Trace:
                    </div>

                    <pre class="stack-trace text-caption">{{ item.stack_trace }}</pre>
                  </div>

                  <div
                    v-if="item.attributes && Object.keys(item.attributes).length > 0"
                    class="mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      Attributes:
                    </div>

                    <pre class="attributes-data text-caption">{{ JSON.stringify(item.attributes, null, 2) }}</pre>
                  </div>

                  <div class="d-flex mt-2 flex-wrap gap-2">
                    <v-chip
                      v-if="item.environment"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        icon="mdi-earth"
                        start
                      />
                      {{ item.environment }}
                    </v-chip>

                    <v-chip
                      v-if="item.release"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        icon="mdi-tag"
                        start
                      />
                      {{ item.release }}
                    </v-chip>

                    <v-chip
                      v-if="item.sdk_version"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        icon="mdi-package-variant"
                        start
                      />
                      SDK {{ item.sdk_version }}
                    </v-chip>

                    <v-chip
                      v-if="item.platform"
                      size="x-small"
                      variant="outlined"
                    >
                      <v-icon
                        icon="mdi-monitor"
                        start
                      />
                      {{ item.platform }}
                    </v-chip>
                  </div>
                </template>
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Load More Trigger -->
          <div
            v-if="hasMore"
            v-intersect="onIntersect"
            class="d-flex align-center mt-4 justify-center"
          >
            <v-progress-circular
              v-if="loading"
              indeterminate
              color="primary"
              size="24"
            />

            <span
              v-else
              class="text-caption text-grey"
            >
              Scroll to load more...
            </span>
          </div>

          <div
            v-else-if="items.length > 0"
            class="d-flex align-center mt-4 justify-center"
          >
            <span class="text-caption text-grey">
              No more {{ type }} to load
            </span>
          </div>
        </div>
      </v-card-text>
    </template>
  </BasePanelCard>
</template>

<script setup lang="ts">
import type { NotificationLevel } from '~/types/notifications'
import type { Panel } from '~/types/panel'
import type { Project } from '~/types/project'

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'
type LogType = 'console' | 'logger' | 'exception' | 'network' | 'database' | 'endpoint' | 'custom'

interface ListItem {
  log_id: number
  project_id: number
  level: NotificationLevel | LogLevel
  log_type: string | LogType
  message: string
  timestamp: string
  error_type?: string
  error_message?: string
  error_fingerprint?: string
  stack_trace?: string
  attributes?: Record<string, any>
  environment?: string
  release?: string
  sdk_version?: string
  platform?: string
  expanded?: boolean
  isNew?: boolean
}

const props = defineProps<{
  panel: Panel
  project?: Project
  items?: ListItem[]
  loading?: boolean
  disabled?: boolean
  hasMore?: boolean
  offset?: number
  type: 'errors' | 'logs'
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  loadPage: [offset: number]
}>()

const currentTime = ref(Date.now())

const icon = computed(() => (props.type === 'errors'
  ? 'mdi-format-list-bulleted'
  : 'mdi-text-box-outline'))
const iconColor = computed(() => (props.type === 'errors'
  ? 'error'
  : 'primary'))
const emptyIcon = computed(() => (props.type === 'errors'
  ? 'mdi-check-circle'
  : 'mdi-text-box-check'))
const emptyMessage = computed(() => (props.type === 'errors'
  ? 'No errors found'
  : 'No logs found'))

function getItemColor(item: ListItem): string {
  if (props.type === 'errors') {
    const colors: Record<NotificationLevel, string> = {
      critical: 'error',
      error: 'error',
    }

    return colors[item.level as NotificationLevel] || 'error'
  }

  const colors: Record<LogLevel, string> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'info',
    debug: 'grey-lighten-2',
  }

  return colors[item.level as LogLevel] || 'grey-lighten-2'
}

function getIconColorForItem(item: ListItem): string {
  if (props.type === 'errors') {
    return 'white'
  }

  const colors: Record<LogLevel, string> = {
    critical: 'white',
    error: 'white',
    warning: 'black',
    info: 'white',
    debug: 'black',
  }

  return colors[item.level as LogLevel] || 'black'
}

function getItemIcon(item: ListItem): string {
  if (props.type === 'errors') {
    const icons: Record<NotificationLevel, string> = {
      critical: 'mdi-alert-circle',
      error: 'mdi-alert',
    }

    return icons[item.level as NotificationLevel] || 'mdi-alert'
  }

  const level = item.level as LogLevel
  const logType = item.log_type as LogType

  if (level === 'critical' || level === 'error') {
    return 'mdi-alert-circle'
  }
  if (level === 'warning') {
    return 'mdi-alert'
  }

  const typeIcons: Partial<Record<LogType, string>> = {
    console: 'mdi-console',
    logger: 'mdi-file-document',
    exception: 'mdi-alert-octagon',
    network: 'mdi-web',
    database: 'mdi-database',
    endpoint: 'mdi-api',
    custom: 'mdi-cog',
  }

  return typeIcons[logType] || 'mdi-text-box'
}

function getLevelColor(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'info',
    debug: 'grey',
  }

  return colors[level] || 'grey'
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

function toggleExpanded(item: ListItem) {
  item.expanded = !item.expanded
}

function onIntersect(isIntersecting: boolean) {
  if (isIntersecting && props.hasMore && !props.loading) {
    const newOffset = (props.offset || 0) + (props.items?.length || 0)
    emit('loadPage', newOffset)
  }
}

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
</script>

<style scoped>
.item-card {
  transition: all 0.2s ease;
}

.stack-trace,
.context-data,
.attributes-data {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 6px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 150px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.3;
  white-space: pre-wrap;
  word-break: break-all;
}

.context-data {
  max-height: 250px;
}
</style>
