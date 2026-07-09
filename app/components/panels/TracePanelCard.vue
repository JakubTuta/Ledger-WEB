<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    icon="mdi-chart-timeline-variant"
    icon-color="info"
    @refresh="handleRefresh"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
  >
    <template #content>
      <div
        v-if="!panel.trace_id"
        class="d-flex flex-column align-center justify-center gap-2 pa-6 text-center"
      >
        <v-icon
          icon="mdi-chart-timeline-variant"
          size="36"
          color="medium-emphasis"
        />

        <span class="text-body-2 text-medium-emphasis">No trace pinned.</span>

        <span class="text-caption text-medium-emphasis">
          Click a row in a Trace List panel to pin a trace here.
        </span>
      </div>

      <div
        v-else-if="isLoading"
        class="d-flex align-center justify-center pa-6"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </div>

      <div
        v-else-if="spans.length === 0"
        class="d-flex flex-column align-center justify-center pa-6 text-center"
      >
        <v-icon
          icon="mdi-alert-outline"
          size="32"
          color="warning"
        />

        <span class="text-body-2 mt-2">Trace not found or expired.</span>
      </div>

      <div
        v-else
        class="trace-panel-body"
      >
        <!-- Header summary -->
        <div class="trace-summary flex-shrink-0 pa-3">
          <div class="d-flex align-center mb-2 flex-wrap gap-2">
            <v-chip
              size="x-small"
              variant="flat"
              :color="rootStatus === 'ERROR'
                ? 'error'
                : 'success'"
              class="font-weight-bold"
              label
            >
              {{ rootStatus === 'ERROR'
                ? 'ERR'
                : 'OK' }}
            </v-chip>

            <span class="text-caption text-mono text-truncate">
              {{ rootSpan?.service_name }} · {{ rootSpan?.name }}
            </span>

            <v-spacer />

            <span class="text-caption text-medium-emphasis text-mono">{{ traceIdShort }}</span>
          </div>

          <div class="d-flex align-center text-caption flex-wrap gap-3">
            <div class="d-flex align-center gap-1">
              <v-icon
                icon="mdi-timer-outline"
                size="14"
              />

              <span class="font-weight-medium">{{ formatDur(totalDuration) }}</span>

              <span class="text-medium-emphasis">total</span>
            </div>

            <v-divider vertical />

            <div class="d-flex align-center gap-1">
              <v-icon
                icon="mdi-chart-timeline"
                size="14"
              />

              <span class="font-weight-medium">{{ spans.length }}</span>

              <span class="text-medium-emphasis">spans</span>
            </div>

            <v-divider vertical />

            <div class="d-flex align-center gap-1">
              <v-icon
                icon="mdi-server"
                size="14"
              />

              <span class="font-weight-medium">{{ services.length }}</span>

              <span class="text-medium-emphasis">svc</span>
            </div>

            <v-divider
              v-if="errorCount > 0"
              vertical
            />

            <div
              v-if="errorCount > 0"
              class="d-flex align-center text-error gap-1"
            >
              <v-icon
                icon="mdi-alert-circle"
                size="14"
              />

              <span class="font-weight-medium">{{ errorCount }}</span>

              <span>errors</span>
            </div>

            <v-spacer />

            <span class="text-caption text-medium-emphasis">{{ formatStartTime }}</span>
          </div>

          <!-- Service chips -->
          <div
            v-if="services.length > 0"
            class="d-flex mt-2 flex-wrap gap-1"
          >
            <v-chip
              v-for="svc in serviceBreakdown"
              :key="svc.name"
              size="x-small"
              variant="flat"
              :style="{'backgroundColor': svc.color,
                       'color': '#fff'}"
            >
              {{ svc.name }} · {{ svc.count }}
            </v-chip>
          </div>
        </div>

        <v-divider />

        <div class="trace-waterfall-scroll flex-grow-1">
          <TraceWaterfall
            :spans="spans"
            class="pa-2"
            @select="openSpan"
          />
        </div>
      </div>
    </template>
  </BasePanelCard>

  <v-navigation-drawer
    v-model="drawerOpen"
    location="right"
    temporary
    width="460"
  >
    <div
      v-if="selectedSpan"
      class="pa-4"
    >
      <div class="d-flex align-center justify-space-between mb-3">
        <span class="text-subtitle-2 font-weight-bold">Span details</span>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="drawerOpen = false"
        />
      </div>

      <v-chip
        size="small"
        variant="flat"
        :color="selectedSpan.status === 'ERROR'
          ? 'error'
          : selectedSpan.status === 'OK'
            ? 'success'
            : 'default'"
        class="font-weight-bold mb-2"
        label
      >
        {{ selectedSpan.status }}
      </v-chip>

      <div class="text-body-2 font-weight-medium text-mono mb-1">
        {{ selectedSpan.name }}
      </div>

      <div class="text-caption text-medium-emphasis mb-3">
        {{ selectedSpan.service_name }}
      </div>

      <v-table density="compact">
        <tbody>
          <tr>
            <td class="text-caption font-weight-medium">
              Duration
            </td>

            <td class="text-caption">
              {{ formatDur(selectedSpan.duration_ms) }}
            </td>
          </tr>

          <tr>
            <td class="text-caption font-weight-medium">
              Start
            </td>

            <td class="text-caption text-mono">
              {{ selectedSpan.start_time }}
            </td>
          </tr>

          <tr>
            <td class="text-caption font-weight-medium">
              Span ID
            </td>

            <td class="text-caption text-mono">
              {{ selectedSpan.span_id }}
            </td>
          </tr>

          <tr v-if="selectedSpan.parent_span_id">
            <td class="text-caption font-weight-medium">
              Parent
            </td>

            <td class="text-caption text-mono">
              {{ selectedSpan.parent_span_id }}
            </td>
          </tr>
        </tbody>
      </v-table>

      <div class="mt-4">
        <SpanRow :span="selectedSpan" />
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import type { Panel } from '~/types/panel'
import type { Project } from '~/types/project'
import type { Span } from '~/types/traces'

const props = defineProps<{
  panel: Panel
  project?: Project
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
}>()

const tracesStore = useTracesStore()

const drawerOpen = ref(false)
const selectedSpan = ref<Span | null>(null)

const SERVICE_PALETTE = [
  '#42a5f5',
  '#66bb6a',
  '#ab47bc',
  '#ffa726',
  '#26c6da',
  '#ec407a',
  '#7e57c2',
  '#9ccc65',
  '#ef5350',
  '#5c6bc0',
  '#26a69a',
  '#d4e157',
]

const spans = computed(() => (props.panel.trace_id
  ? tracesStore.getSpansForTrace(props.panel.trace_id).value
  : []),
)

const isLoading = computed(() => (props.panel.trace_id
  ? tracesStore.isDetailLoading(props.panel.trace_id).value
  : false),
)

const traceIdShort = computed(() => props.panel.trace_id?.slice(0, 16) ?? '')

const rootSpan = computed<Span | undefined>(() => spans.value.find(s => !s.parent_span_id) ?? spans.value[0])

const rootStatus = computed(() => {
  const anyError = spans.value.some(s => s.status === 'ERROR')
  if (anyError)
    return 'ERROR'

  return rootSpan.value?.status ?? 'UNSET'
})

const totalDuration = computed(() => {
  if (spans.value.length === 0)
    return 0
  const starts = spans.value.map(s => new Date(s.start_time).getTime())
  const ends = spans.value.map(s => new Date(s.start_time).getTime() + s.duration_ms)

  return Math.max(...ends) - Math.min(...starts)
})

const errorCount = computed(() => spans.value.filter(s => s.status === 'ERROR').length)

const services = computed(() => Array.from(new Set(spans.value.map(s => s.service_name ?? '—'))))

const serviceBreakdown = computed(() => {
  const counts = new Map<string, number>()
  for (const s of spans.value) {
    const k = s.service_name ?? '—'
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }

  return Array.from(counts.entries()).map(([name, count], i) => ({
    name,
    count,
    color: SERVICE_PALETTE[i % SERVICE_PALETTE.length] ?? '#78909c',
  }))
})

const formatStartTime = computed(() => {
  if (!rootSpan.value)
    return ''
  try {
    const d = new Date(rootSpan.value.start_time)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mn = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')

    return `${dd}-${mm} ${hh}:${mn}:${ss}`
  }
  catch {
    return ''
  }
})

function formatDur(ms: number): string {
  if (ms >= 1000)
    return `${(ms / 1000).toFixed(2)}s`
  if (ms < 1 && ms > 0)
    return `${(ms * 1000).toFixed(0)}μs`
  if (ms <= 0)
    return '<1μs'

  return `${ms.toFixed(1)}ms`
}

function openSpan(span: Span) {
  selectedSpan.value = span
  drawerOpen.value = true
}

async function handleRefresh() {
  if (props.panel.trace_id) {
    await tracesStore.fetchDetail(props.panel.trace_id, props.panel.project_id, true)
  }
}

onMounted(() => {
  if (props.panel.trace_id) {
    tracesStore.fetchDetail(props.panel.trace_id, props.panel.project_id)
  }
})
</script>

<style scoped>
.trace-panel-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.trace-summary {
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.trace-waterfall-scroll {
  overflow: auto;
  min-height: 0;
}
</style>
