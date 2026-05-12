<template>
  <div>
    <div class="text-caption font-weight-bold mb-2">
      Attributes
    </div>
    <v-table
      v-if="attributeEntries.length > 0"
      density="compact"
    >
      <tbody>
        <tr
          v-for="[key, value] in attributeEntries"
          :key="key"
        >
          <td class="text-caption font-weight-medium pr-3 py-1">
            {{ key }}
          </td>
          <td class="text-caption py-1">
            {{ truncate(String(value), 120) }}
          </td>
        </tr>
      </tbody>
    </v-table>
    <div
      v-else
      class="text-caption text-medium-emphasis"
    >
      No attributes
    </div>

    <template v-if="span.events && span.events.length > 0">
      <div class="text-caption font-weight-bold mt-3 mb-2">
        Events
      </div>
      <div
        v-for="(event, idx) in span.events"
        :key="idx"
        class="mb-2"
      >
        <div class="d-flex align-center gap-2">
          <v-chip
            size="x-small"
            variant="tonal"
          >
            {{ event.name }}
          </v-chip>
          <span class="text-caption text-medium-emphasis">{{ formatTime(event.timestamp) }}</span>
        </div>
        <div
          v-if="exceptionStack(event)"
          class="mt-1"
        >
          <pre class="stack-trace text-caption">{{ exceptionStack(event) }}</pre>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Span, SpanEvent } from '~/types/traces'

const props = defineProps<{ span: Span }>()

const attributeEntries = computed(() =>
  Object.entries(props.span.attributes ?? {}),
)

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString()
  }
  catch {
    return ts
  }
}

function exceptionStack(event: SpanEvent): string | null {
  return (event.attributes as any)?.['exception.stacktrace'] ?? null
}
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
  font-size: 11px;
}
</style>
