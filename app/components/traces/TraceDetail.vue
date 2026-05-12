<template>
  <div class="d-flex flex-column h-100">
    <!-- Summary header -->
    <div class="pa-3 border-b">
      <div class="d-flex align-center gap-2 flex-wrap mb-2">
        <span class="text-caption font-weight-bold text-medium-emphasis">TRACE ID</span>
        <code class="text-caption">{{ traceId }}</code>
        <v-btn
          icon="mdi-content-copy"
          variant="text"
          size="x-small"
          @click="copyTraceId"
        />
      </div>

      <div
        v-if="spans.length > 0"
        class="d-flex align-center gap-3 flex-wrap"
      >
        <div class="text-caption">
          <span class="text-medium-emphasis">Duration:</span>
          <span class="ml-1 font-weight-medium">{{ totalDuration }}ms</span>
        </div>
        <div class="text-caption">
          <span class="text-medium-emphasis">Spans:</span>
          <span class="ml-1 font-weight-medium">{{ spans.length }}</span>
        </div>
        <div class="d-flex align-center gap-1 flex-wrap">
          <v-chip
            v-for="svc in services"
            :key="svc"
            size="x-small"
            variant="tonal"
            color="primary"
          >
            {{ svc }}
          </v-chip>
        </div>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="d-flex align-center justify-center pa-6"
    >
      <v-progress-circular
        indeterminate
        color="primary"
      />
    </div>

    <template v-else>
      <!-- Waterfall -->
      <div class="pa-2 border-b">
        <TracesTraceWaterfall
          :spans="spans"
          @select="selectedSpan = $event"
        />
      </div>

      <!-- Selected span detail -->
      <div
        v-if="selectedSpan"
        class="pa-3 border-b"
      >
        <div class="d-flex align-center gap-2 mb-3">
          <v-chip
            :color="statusColor(selectedSpan.status)"
            size="small"
            variant="tonal"
          >
            {{ selectedSpan.status }}
          </v-chip>
          <span class="text-body-2 font-weight-medium">{{ selectedSpan.name }}</span>
          <span class="text-caption text-medium-emphasis">{{ selectedSpan.duration_ms }}ms</span>
        </div>

        <TracesSpanRow :span="selectedSpan" />
      </div>

      <!-- Linked logs -->
      <v-expansion-panels
        flat
        class="border-t"
      >
        <v-expansion-panel>
          <v-expansion-panel-title class="text-caption font-weight-bold">
            Linked logs
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div
              v-if="logsLoading"
              class="pa-2"
            >
              <v-skeleton-loader type="list-item-two-line" />
            </div>
            <div
              v-else-if="linkedLogs.length === 0"
              class="text-caption text-medium-emphasis pa-2"
            >
              No linked logs
            </div>
            <v-list
              v-else
              density="compact"
            >
              <v-list-item
                v-for="(log, i) in linkedLogs"
                :key="i"
                class="px-0"
              >
                <v-list-item-title class="text-caption">
                  {{ log.message }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ log.timestamp }} · {{ log.level }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Span, SpanStatus } from '~/types/traces'

const props = defineProps<{
  traceId: string
}>()

const tracesStore = useTracesStore()
const { client } = useApiStore()

const selectedSpan = ref<Span | null>(null)
const linkedLogs = ref<any[]>([])
const logsLoading = ref(false)
const logsLoaded = ref(false)

const spans = computed(() => tracesStore.getSpansForTrace(props.traceId).value)
const isLoading = computed(() => tracesStore.isDetailLoading(props.traceId).value)

const totalDuration = computed(() => {
  if (spans.value.length === 0) return 0
  const start = Math.min(...spans.value.map(s => new Date(s.start_time).getTime()))
  const end = Math.max(...spans.value.map(s => new Date(s.end_time).getTime()))
  return end - start
})

const services = computed(() => [...new Set(spans.value.map(s => s.service_name).filter(Boolean))])

function statusColor(status: SpanStatus): string {
  const map: Record<string, string> = { OK: 'success', ERROR: 'error', UNSET: 'default' }
  return map[status] ?? 'default'
}

async function copyTraceId() {
  await navigator.clipboard.writeText(props.traceId)
}

async function fetchLinkedLogs() {
  if (logsLoaded.value) return
  logsLoading.value = true
  try {
    const response = await client.get('/api/v1/logs', {
      params: { trace_id: props.traceId, limit: 50 },
    })
    linkedLogs.value = response.data?.logs ?? response.data ?? []
    logsLoaded.value = true
  }
  catch (error) {
    console.error('Error fetching linked logs:', error)
  }
  finally {
    logsLoading.value = false
  }
}

watch(() => props.traceId, async (id) => {
  if (id) {
    selectedSpan.value = null
    logsLoaded.value = false
    linkedLogs.value = []
    await tracesStore.fetchDetail(id)
  }
}, { immediate: true })
</script>
