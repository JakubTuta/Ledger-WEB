<template>
  <div class="w-100 h-100">
    <v-data-table
      :headers="headers"
      :items="traces"
      :loading="isLoading"
      no-data-text="No traces found"
      density="compact"
      item-value="trace_id"
      @click:row="handleRowClick"
    >
      <template #item.start_time="{ item }">
        <span class="text-caption">{{ formatTime(item.start_time) }}</span>
      </template>

      <template #item.duration_ms="{ item }">
        <span class="text-caption">{{ item.duration_ms }}ms</span>
      </template>

      <template #item.has_error="{ item }">
        <v-chip
          :color="item.has_error ? 'error' : 'success'"
          size="x-small"
          variant="tonal"
        >
          {{ item.has_error ? 'ERROR' : 'OK' }}
        </v-chip>
      </template>

      <template #item.trace_id="{ item }">
        <v-btn
          v-if="item.trace_id"
          variant="text"
          size="x-small"
          :prepend-icon="'mdi-link-variant'"
          color="primary"
          @click.stop="useTraceDrawer().openTrace(item.trace_id)"
        >
          {{ item.trace_id.slice(0, 8) }}…
        </v-btn>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import type { TraceSummary } from '~/types/traces'

const props = defineProps<{
  traces: TraceSummary[]
  isLoading?: boolean
}>()

const headers = [
  { title: 'Time', key: 'start_time', sortable: true },
  { title: 'Service', key: 'root_service' },
  { title: 'Operation', key: 'root_operation' },
  { title: 'Duration', key: 'duration_ms', sortable: true },
  { title: 'Spans', key: 'span_count' },
  { title: 'Status', key: 'has_error' },
  { title: 'Trace ID', key: 'trace_id', sortable: false },
]

const { openTrace } = useTraceDrawer()

function handleRowClick(_event: Event, row: { item: TraceSummary }) {
  openTrace(row.item.trace_id)
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString()
  }
  catch {
    return ts
  }
}
</script>
