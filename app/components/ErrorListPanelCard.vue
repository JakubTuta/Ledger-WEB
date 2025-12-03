<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    icon="mdi-format-list-bulleted"
    icon-color="error"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
  >
    <template #content>
      <v-card-text class="panel-content-container pa-4">
        <!-- Loading State -->
        <div
          v-if="loading"
          class="panel-empty-state"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>

        <!-- No Data State -->
        <div
          v-else-if="!errors || errors.length === 0"
          class="panel-empty-state text-grey"
        >
          <div class="text-center">
            <v-icon
              icon="mdi-check-circle"
              size="48"
              class="mb-2"
            />

            <div class="text-body-2">
              No errors found
            </div>
          </div>
        </div>

        <!-- Error List -->
        <div
          v-else
          class="error-list"
        >
          <v-card
            v-for="error in errors"
            :key="error.log_id"
            :color="getErrorColor(error.level)"
            variant="elevated"
            elevation="1"
            class="error-card mb-2"
          >
            <v-card-title
              class="d-flex align-center justify-space-between min-h-50px cursor-pointer pa-2"
              @click="toggleExpanded(error.log_id)"
            >
              <div class="d-flex align-center gap-1">
                <v-icon
                  :icon="getErrorIcon(error.level)"
                  :color="getIconColor(error.level)"
                  size="x-small"
                  class="mr-1"
                />

                <span class="text-body-2 font-weight-bold">
                  {{ error.error_type }}
                </span>

                <v-chip
                  v-if="error.isNew"
                  size="x-small"
                  color="success"
                  variant="flat"
                  class="ml-1"
                >
                  NEW
                </v-chip>
              </div>

              <span
                v-if="error.timestamp"
                class="text-caption text-medium-emphasis"
              >
                {{ formatTimestamp(error.timestamp) }}
              </span>
            </v-card-title>

            <v-expand-transition>
              <v-card-text
                v-if="error.expanded"
                class="pa-2 pt-0"
              >
                <div class="mb-2">
                  <div class="text-caption font-weight-bold mb-1">
                    Message:
                  </div>

                  <div class="text-caption">
                    {{ error.message }}
                  </div>
                </div>

                <div
                  v-if="error.attributes?.stack_trace"
                  class="mb-2"
                >
                  <div class="text-caption font-weight-bold mb-1">
                    Stack Trace:
                  </div>

                  <pre class="stack-trace text-caption">{{ error.attributes.stack_trace }}</pre>
                </div>

                <div
                  v-if="error.attributes && Object.keys(error.attributes).length > 0"
                >
                  <div class="text-caption font-weight-bold mb-1">
                    Attributes:
                  </div>

                  <pre class="context-data text-caption">{{ JSON.stringify(error.attributes, null, 2) }}</pre>
                </div>
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Pagination -->
          <div
            v-if="hasMore || (offset || 0) > 0"
            class="d-flex align-center mt-4 justify-center gap-2"
          >
            <v-btn
              variant="outlined"
              size="small"
              :disabled="(offset || 0) === 0 || loading"
              @click="loadPreviousPage"
            >
              Previous
            </v-btn>

            <span class="text-caption text-grey">
              {{ (offset || 0) + 1 }} - {{ (offset || 0) + errors.length }}
            </span>

            <v-btn
              variant="outlined"
              size="small"
              :disabled="!hasMore || loading"
              @click="loadNextPage"
            >
              Next
            </v-btn>
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

interface ErrorItem {
  log_id: number
  project_id: number
  level: NotificationLevel
  log_type: string
  message: string
  timestamp: string
  error_type: string
  error_fingerprint: string
  attributes?: Record<string, any>
  sdk_version?: string
  platform?: string
  expanded?: boolean
  isNew?: boolean
}

const props = defineProps<{
  panel: Panel
  project?: Project
  errors?: ErrorItem[]
  loading?: boolean
  disabled?: boolean
  hasMore?: boolean
  offset?: number
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  loadPage: [offset: number]
}>()

const currentTime = ref(Date.now())

function getErrorColor(level: NotificationLevel): string {
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

function getErrorIcon(level: NotificationLevel): string {
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

function toggleExpanded(logId: number) {
  const error = props.errors?.find(e => e.log_id === logId)
  if (error) {
    error.expanded = !error.expanded
  }
}

function loadNextPage() {
  const newOffset = (props.offset || 0) + (props.errors?.length || 100)
  emit('loadPage', newOffset)
}

function loadPreviousPage() {
  const newOffset = Math.max(0, (props.offset || 0) - 100)
  emit('loadPage', newOffset)
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
/* Error list specific styles */
.error-list {
  display: flex;
  flex-direction: column;
}

.error-card {
  transition: all 0.2s ease;
}

.stack-trace {
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
  background-color: rgba(0, 0, 0, 0.1);
  padding: 6px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 250px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.3;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
