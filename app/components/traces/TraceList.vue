<template>
  <div class="trace-list">
    <!-- Column headers -->
    <div class="trace-header-row d-flex align-center">
      <div class="trace-status-bar flex-shrink-0" />

      <span class="text-caption font-weight-medium text-medium-emphasis trace-status-chip mr-2 flex-shrink-0">Status</span>

      <span class="text-caption font-weight-medium text-medium-emphasis mr-2 flex-grow-1">Service · Operation</span>

      <span class="text-caption font-weight-medium text-medium-emphasis mr-3 flex-shrink-0 trace-duration-col">Duration</span>

      <span class="text-caption font-weight-medium text-medium-emphasis mr-3 flex-shrink-0 trace-spans-col">Spans</span>

      <span class="text-caption font-weight-medium text-medium-emphasis trace-time-col flex-shrink-0">Time</span>

      <div class="trace-pin-col flex-shrink-0" />
    </div>

    <div
      v-for="trace in traces"
      :key="trace.trace_id"
      class="trace-row"
    >
      <div class="trace-row-inner d-flex align-center">
        <div
          class="trace-status-bar flex-shrink-0"
          :class="trace.has_error ? 'trace-bar--error' : 'trace-bar--success'"
        />

        <v-chip
          :color="trace.has_error ? 'error' : 'success'"
          size="x-small"
          variant="flat"
          class="trace-status-chip font-weight-bold mr-2 flex-shrink-0"
          label
        >
          {{ trace.has_error ? 'ERR' : 'OK' }}
        </v-chip>

        <span class="text-caption text-mono mr-2 flex-grow-1 text-truncate">
          {{ trace.root_service }} · {{ trace.root_operation }}
        </span>

        <span class="text-caption text-medium-emphasis mr-3 flex-shrink-0 trace-duration-col">
          {{ formatDuration(trace.duration_ms) }}
        </span>

        <v-chip
          color="default"
          variant="text"
          size="x-small"
          class="mr-3 flex-shrink-0 trace-spans-col"
        >
          {{ trace.span_count }}
        </v-chip>

        <v-tooltip
          :text="formatFullTimestamp(trace.start_time)"
          location="top"
        >
          <template #activator="{'props': tooltipProps}">
            <span
              v-bind="tooltipProps"
              class="text-caption text-medium-emphasis trace-time-col flex-shrink-0"
            >
              {{ formatTimestamp(trace.start_time) }}
            </span>
          </template>
        </v-tooltip>

        <v-btn
          icon="mdi-pin-outline"
          variant="text"
          size="x-small"
          class="trace-pin-col flex-shrink-0"
          title="Pin trace"
          @click="emit('pin-trace', { trace_id: trace.trace_id })"
        />
      </div>
    </div>

    <div
      v-if="hasMore"
      v-intersect="onIntersect"
      class="d-flex align-center my-4 justify-center"
    >
      <v-progress-circular
        v-if="isLoading"
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
      v-else-if="traces.length > 0"
      class="d-flex align-center my-4 justify-center"
    >
      <span class="text-caption text-grey">No more traces to load</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TraceSummary } from '~/types/traces'

const props = defineProps<{
  traces: TraceSummary[]
  isLoading?: boolean
  hasMore?: boolean
  offset?: number
}>()

const emit = defineEmits<{
  'pin-trace': [payload: { trace_id: string; project_id?: string }]
  'load-page': [offset: number]
}>()

function onIntersect(isIntersecting: boolean) {
  if (isIntersecting && props.hasMore && !props.isLoading) {
    const newOffset = (props.offset ?? 0) + (props.traces?.length ?? 0)
    emit('load-page', newOffset)
  }
}

const currentTime = ref(Date.now())

let timeUpdateInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timeUpdateInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  if (timeUpdateInterval)
    clearInterval(timeUpdateInterval)
})

function formatDuration(ms: number): string {
  if (ms >= 1000)
    return `${(ms / 1000).toFixed(1)}s`

  return `${ms}ms`
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const diff = currentTime.value - date.getTime()

    if (diff < 24 * 60 * 60 * 1000) {
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      if (hours > 0)
        return `${hours}h ago`
      if (minutes > 0)
        return `${minutes}m ago`
      if (seconds > 0)
        return `${seconds}s ago`

      return 'Just now'
    }

    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')

    return `${dd}-${mm} ${hh}:${min}`
  }
  catch {
    return timestamp
  }
}

function formatFullTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')

    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`
  }
  catch {
    return timestamp
  }
}
</script>

<style scoped>
.trace-list {
  height: 100%;
  overflow-y: auto;
}

.trace-header-row {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: rgb(var(--v-theme-surface));
  padding: 4px 8px 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-height: 28px;
}

.trace-row {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.trace-row:last-child {
  border-bottom: none;
}

.trace-row-inner {
  padding: 6px 8px 6px 0;
  min-height: 36px;
}

.trace-row-inner:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.trace-status-bar {
  width: 3px;
  align-self: stretch;
  min-height: 36px;
  flex-shrink: 0;
  margin-right: 10px;
}

.trace-bar--success { background-color: rgb(var(--v-theme-success)); }
.trace-bar--error   { background-color: rgb(var(--v-theme-error)); }

.trace-status-chip {
  font-size: 10px;
  min-width: 36px;
  justify-content: center;
}

.trace-duration-col {
  min-width: 52px;
  text-align: right;
}

.trace-spans-col {
  min-width: 36px;
  text-align: right;
}

.trace-time-col {
  min-width: 72px;
  text-align: right;
}

.trace-pin-col {
  width: 28px;
  margin-left: 4px;
}
</style>
