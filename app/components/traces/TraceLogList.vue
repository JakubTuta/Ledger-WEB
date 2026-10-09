<template>
  <div class="trace-log-list">
    <div
      v-if="isLoading && logs.length === 0"
      class="d-flex justify-center pa-4"
    >
      <v-progress-circular
        indeterminate
        size="24"
        color="primary"
      />
    </div>

    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="ma-2"
    >
      {{ error }}
    </v-alert>

    <div
      v-else-if="logs.length === 0"
      class="text-caption text-medium-emphasis pa-3 text-center"
    >
      No logs were emitted {{ spanId
        ? 'inside this span'
        : 'during this trace' }}.
    </div>

    <template v-else>
      <div
        v-for="log in logs"
        :key="log.id"
        class="trace-log-row d-flex align-center gap-2 px-2 py-1"
        :title="log.message ?? ''"
      >
        <span class="text-caption text-mono text-medium-emphasis flex-shrink-0">
          {{ formatTime(log.timestamp) }}
        </span>

        <v-chip
          size="x-small"
          label
          variant="flat"
          :color="logLevelColor(log.level)"
          class="flex-shrink-0"
        >
          {{ log.level }}
        </v-chip>

        <span
          v-if="serviceOf(log)"
          class="text-caption text-medium-emphasis flex-shrink-0"
        >
          {{ serviceOf(log) }}
        </span>

        <span class="text-caption text-truncate">
          {{ log.message || log.error_message || log.error_type }}
        </span>
      </div>

      <div
        v-if="truncated"
        class="text-caption text-medium-emphasis pa-2"
      >
        Showing the first {{ logs.length }} logs of this trace.
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ExploreLogEntry } from '~/types/explore'

const props = defineProps<{
  traceId: string
  projectId: string | number
  /** Only the logs emitted inside this span. */
  spanId?: string | null
}>()

const tracesStore = useTracesStore()

const logs = computed(() => tracesStore.getTraceLogs(props.traceId, props.spanId).value)
const truncated = computed(() => tracesStore.areTraceLogsTruncated(props.traceId, props.spanId).value)
const isLoading = computed(() => tracesStore.areTraceLogsLoading(props.traceId, props.spanId).value)
const error = computed(() => tracesStore.getTraceLogsError(props.traceId, props.spanId).value)

function serviceOf(log: ExploreLogEntry): string | null {
  const service = log.attributes?.['service.name']

  return typeof service === 'string'
    ? service
    : null
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)

  return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${String(date.getMilliseconds()).padStart(3, '0')}`
}

function load(force = false) {
  tracesStore.fetchTraceLogs(props.traceId, props.projectId, props.spanId, force)
}

defineExpose({ refresh: () => load(true) })

watch(() => [props.traceId, props.spanId], () => load())

onMounted(() => load())
</script>

<style scoped>
.trace-log-row {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-width: 0;
}
</style>
