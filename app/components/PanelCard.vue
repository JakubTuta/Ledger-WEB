<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    :exporting="isExporting"
    :icon="panelTypeIcon"
    :icon-color="panelTypeColor"
    traffic-filter-hint
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @refresh="emit('refresh')"
    @expand="emit('expand')"
    @export-data="format => exportPanel(format, buildExport)"
  >
    <template
      v-if="chartMode === 'volume'"
      #options
    >
      <div class="text-caption text-medium-emphasis mb-2">
        Chart values
      </div>

      <v-btn-toggle
        v-model="chartValueMode"
        density="compact"
        variant="outlined"
        mandatory
        divided
      >
        <v-btn
          value="separate"
          size="small"
        >
          Separate
        </v-btn>

        <v-btn
          value="cumulative"
          size="small"
        >
          Cumulative
        </v-btn>
      </v-btn-toggle>
    </template>

    <template #content>
      <v-card-text class="panel-content-container pa-2">
        <!-- Loading State -->
        <div
          v-if="loading"
          class="d-flex align-center justify-center"
          style="height: 100%;"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>

        <!--
          Fetch failed: kept ahead of the empty state so a server error
          isn't reported to the user as "no data available".
        -->
        <v-alert
          v-else-if="error"
          type="error"
          variant="tonal"
          density="compact"
          class="ma-3"
        >
          {{ error }}

          <template #append>
            <v-btn
              size="small"
              variant="text"
              :loading="loading"
              @click="emit('refresh')"
            >
              Retry
            </v-btn>
          </template>
        </v-alert>

        <!-- No Data State -->
        <div
          v-else-if="!metrics || chartData.length === 0"
          class="text-grey d-flex align-center justify-center"
          style="height: 100%;"
        >
          <div class="text-center">
            <v-icon
              icon="mdi-chart-bar"
              size="48"
              class="mb-2"
            />

            <div class="text-body-2">
              No data available
            </div>
          </div>
        </div>

        <!-- Chart -->
        <MetricChart
          v-else
          :metrics="metrics"
          :mode="chartMode"
          :cumulative="chartValueMode === 'cumulative'"
        />
      </v-card-text>
    </template>

    <template #footer>
      <v-card-actions class="pa-2">
        <div class="d-flex justify-space-between w-100">
          <div class="text-center">
            <div class="text-body-2 font-weight-medium">
              {{ totalLogs.toLocaleString() }}
            </div>

            <div class="text-caption text-grey">
              Total Logs
            </div>
          </div>

          <div class="text-center">
            <div class="text-body-2 font-weight-medium text-error">
              {{ totalErrors.toLocaleString() }}
            </div>

            <div class="text-caption text-grey">
              Errors
            </div>
          </div>

          <div class="text-center">
            <div class="text-body-2 font-weight-medium">
              {{ avgDuration }}
            </div>

            <div class="text-caption text-grey">
              Avg Duration
            </div>
          </div>
        </div>
      </v-card-actions>
    </template>
  </BasePanelCard>

  <v-snackbar
    v-model="showExportError"
    timeout="3000"
    color="error"
    location="bottom right"
  >
    {{ exportError }}
  </v-snackbar>
</template>

<script setup lang="ts">
import type { PanelExportBuildResult } from '~/composables/usePanelExport'
import type { AggregatedMetricsResponse, Panel } from '~/types/panel'
import type { Project } from '~/types/project'

const props = defineProps<{
  panel: Panel
  project?: Project
  metrics?: AggregatedMetricsResponse
  loading?: boolean
  error?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  refresh: []
  expand: []
}>()

const { isExporting, exportError, exportPanel } = usePanelExport(() => props.panel, () => props.project)

const showExportError = computed({
  get: () => !!exportError.value,
  set: (v: boolean) => {
    if (!v)
      exportError.value = ''
  },
})

const panelTypeIcon = computed(() => {
  switch (props.panel.type) {
    case 'logs': return 'mdi-text-box-outline'
    case 'errors': return 'mdi-alert-circle'
    case 'metrics': return 'mdi-chart-line'
    case 'error_list': return 'mdi-format-list-bulleted'
    default: return 'mdi-view-dashboard'
  }
})

const panelTypeColor = computed(() => {
  switch (props.panel.type) {
    case 'errors':
    case 'error_list': return 'error'
    case 'metrics': return 'success'
    default: return 'primary'
  }
})

const chartMode = computed(() => (props.panel.type === 'metrics'
  ? 'latency'
  : 'volume'))
const chartValueMode = ref<'separate' | 'cumulative'>('separate')

const chartData = computed(() => props.metrics?.data ?? [])

const totalLogs = computed(() => chartData.value.reduce((s, d) => s + d.log_count, 0))
const totalErrors = computed(() => chartData.value.reduce((s, d) => s + d.error_count, 0))

const avgDuration = computed(() => {
  const durations = chartData.value.filter(d => d.avg_duration_ms > 0)
  if (durations.length === 0)
    return '-'
  const avg = durations.reduce((s, d) => s + d.avg_duration_ms, 0) / durations.length

  return `${avg.toFixed(0)}ms`
})

function buildExport(): PanelExportBuildResult {
  const rows = chartData.value.map(d => ({ ...d }))

  return {
    rows,
    summary: {
      total_logs: totalLogs.value,
      total_errors: totalErrors.value,
      avg_duration_ms: chartData.value.length > 0
        ? chartData.value.reduce((s, d) => s + d.avg_duration_ms, 0) / chartData.value.length
        : 0,
    },
    extraMeta: {
      metric_type: props.metrics?.metric_type,
      granularity: props.metrics?.granularity,
      start_date: props.metrics?.start_date,
      end_date: props.metrics?.end_date,
    },
  }
}
</script>
