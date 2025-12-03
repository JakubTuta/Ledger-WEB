<template>
  <v-card
    :class="{'panel-card--disabled': disabled}"
    height="100%"
  >
    <!-- Header -->
    <v-card-title class="d-flex align-center justify-space-between pa-4">
      <div class="d-flex align-center flex-grow-1 gap-2">
        <v-icon
          icon="mdi-format-list-bulleted"
          color="error"
          size="small"
        />

        <div
          v-if="!isEditingName"
          class="d-flex align-center cursor-pointer gap-1"
          @click="startEditingName"
        >
          <span class="text-subtitle-1 font-weight-medium">{{ panel.name }}</span>

          <v-icon
            icon="mdi-pencil"
            size="x-small"
            class="text-grey"
          />
        </div>

        <v-text-field
          v-else
          v-model="editedName"
          density="compact"
          variant="outlined"
          hide-details
          autofocus
          :loading="isSavingName"
          class="panel-name-input"
          @blur="saveNameEdit"
          @keydown.enter="saveNameEdit"
          @keydown.esc="cancelNameEdit"
        />
      </div>

      <div class="d-flex align-center gap-1">
        <v-btn
          variant="text"
          size="small"
          :disabled="disabled"
          prepend-icon="mdi-clock-outline"
          @click="emit('timeOptions')"
        >
          {{ timeRangeText }}
        </v-btn>

        <v-btn
          icon="mdi-delete"
          variant="text"
          size="small"
          color="error"
          :disabled="disabled"
          @click="emit('delete')"
        />
      </div>
    </v-card-title>

    <!-- Project Info -->
    <v-card-subtitle class="px-4 pb-2">
      <div class="d-flex align-center gap-2">
        <v-chip
          size="x-small"
          :color="project?.environment === 'production'
            ? 'error'
            : 'primary'"
          variant="tonal"
        >
          {{ project?.environment || 'Unknown' }}
        </v-chip>

        <span class="text-caption">{{ project?.name || 'Unknown Project' }}</span>
      </div>
    </v-card-subtitle>

    <v-divider />

    <!-- Error List Content -->
    <v-card-text class="pa-4 error-list-container">
      <!-- Loading State -->
      <div
        v-if="loading"
        class="d-flex align-center justify-center"
        style="min-height: 500px;"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </div>

      <!-- No Data State -->
      <div
        v-else-if="!errors || errors.length === 0"
        class="d-flex align-center text-grey justify-center"
        style="min-height: 500px;"
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
          class="mb-2 error-card"
        >
          <v-card-title class="d-flex align-center justify-space-between pa-2">
            <div class="d-flex align-center gap-1">
              <v-icon
                :icon="getErrorIcon(error.level)"
                :color="getIconColor(error.level)"
                size="small"
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

            <v-btn
              :icon="error.expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              size="x-small"
              variant="text"
              density="compact"
              @click="toggleExpanded(error.log_id)"
            />
          </v-card-title>

          <v-card-text class="pa-2 pt-0">
            <div class="d-flex align-center gap-2 text-caption text-medium-emphasis mb-1">
              <span v-if="error.timestamp">
                {{ formatTimestamp(error.timestamp) }}
              </span>
            </div>

            <v-expand-transition>
              <div v-if="error.expanded">
                <div class="mb-2">
                  <div class="text-caption font-weight-bold mb-1">
                    Message:
                  </div>

                  <div class="text-caption">
                    {{ error.message }}
                  </div>
                </div>

                <div class="mb-2">
                  <div class="d-flex align-center gap-1">
                    <v-chip
                      :color="getErrorColor(error.level)"
                      size="x-small"
                      variant="flat"
                    >
                      {{ error.level.toUpperCase() }}
                    </v-chip>

                    <v-chip
                      v-if="project?.name"
                      size="x-small"
                      variant="outlined"
                    >
                      {{ project.name }}
                    </v-chip>
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
              </div>
            </v-expand-transition>
          </v-card-text>
        </v-card>

        <!-- Pagination -->
        <div
          v-if="hasMore || offset > 0"
          class="d-flex justify-center align-center gap-2 mt-4"
        >
          <v-btn
            variant="outlined"
            size="small"
            :disabled="offset === 0 || loading"
            @click="loadPreviousPage"
          >
            Previous
          </v-btn>

          <span class="text-caption text-grey">
            {{ offset + 1 }} - {{ offset + errors.length }}
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
  </v-card>
</template>

<script setup lang="ts">
import type { Panel, TimeRangePreset } from '~/types/panel'
import type { Project } from '~/types/project'
import type { NotificationLevel } from '~/types/notifications'

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

const panelsStore = usePanelsStore()

const isEditingName = ref(false)
const editedName = ref('')
const isSavingName = ref(false)
const currentTime = ref(Date.now())

const timeRangeText = computed(() => {
  if (props.panel.period) {
    const presetLabels: Record<TimeRangePreset, string> = {
      today: 'Today',
      last7days: 'Last 7 Days',
      last30days: 'Last 30 Days',
      currentWeek: 'Current Week',
      currentMonth: 'Current Month',
      currentYear: 'Current Year',
    }

    return presetLabels[props.panel.period as TimeRangePreset] || 'Select Range'
  }

  if (!props.panel.periodFrom || !props.panel.periodTo)
    return 'Select Range'

  const from = formatDateToDisplay(props.panel.periodFrom)
  const to = formatDateToDisplay(props.panel.periodTo)

  return `${from} - ${to}`
})

function formatDateToDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')

  return `${day}/${month}/${year}`
}

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

function startEditingName() {
  if (props.disabled)
    return
  editedName.value = props.panel.name
  isEditingName.value = true
}

async function saveNameEdit() {
  if (!editedName.value.trim() || editedName.value === props.panel.name) {
    cancelNameEdit()

    return
  }

  isSavingName.value = true

  const result = await panelsStore.updatePanel(props.panel.id, {
    name: editedName.value.trim(),
  })

  isSavingName.value = false

  if (result.success) {
    isEditingName.value = false
  }
}

function cancelNameEdit() {
  isEditingName.value = false
  editedName.value = ''
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
.panel-card--disabled {
  opacity: 0.9;
  cursor: move;
  user-select: none;
}

.error-list-container {
  height: 500px;
  overflow-y: auto;
}

.error-list {
  display: flex;
  flex-direction: column;
}

.error-card {
  transition: all 0.2s ease;
}

.stack-trace,
.context-data {
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

.cursor-pointer {
  cursor: pointer;
}

.panel-name-input {
  max-width: 300px;
}
</style>
