<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    :exporting="isExporting"
    icon="mdi-view-dashboard-outline"
    icon-color="primary"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @refresh="emit('refresh')"
    @export-data="format => exportPanel(format, buildExport)"
  >
    <template #content>
      <v-card-text class="pa-3">
        <!-- Loading -->
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

        <!-- No Data -->
        <div
          v-else-if="!metrics || metrics.data.length === 0"
          class="d-flex align-center text-grey justify-center"
          style="height: 100%;"
        >
          <div class="text-center">
            <v-icon
              icon="mdi-view-dashboard-outline"
              size="48"
              class="mb-2"
            />

            <div class="text-body-2">
              No data available
            </div>
          </div>
        </div>

        <!-- KPI Grid -->
        <div
          v-else
          class="kpi-grid"
        >
          <div
            v-for="kpi in kpis"
            :key="kpi.label"
            class="kpi-tile"
          >
            <v-icon
              :icon="kpi.icon"
              :color="kpi.color"
              size="18"
              class="mb-1"
            />

            <div
              class="text-h6 font-weight-bold"
              :class="`text-${kpi.color}`"
            >
              {{ kpi.value }}
            </div>

            <div class="text-caption text-medium-emphasis">
              {{ kpi.label }}
            </div>
          </div>
        </div>
      </v-card-text>
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
  disabled?: boolean
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  refresh: []
}>()

const { isExporting, exportError, exportPanel } = usePanelExport(() => props.panel, () => props.project)

const showExportError = computed({
  get: () => !!exportError.value,
  set: (v: boolean) => {
    if (!v)
      exportError.value = ''
  },
})

const rawKpis = computed(() => {
  const data = props.metrics?.data ?? []
  if (data.length === 0) {
    return {
      totalRequests: 0,
      totalErrors: 0,
      errorRate: 0,
      avgLatency: 0,
      p95Latency: 0,
      throughput: 0,
    }
  }

  const totalRequests = data.reduce((s, d) => s + d.log_count, 0)
  const totalErrors = data.reduce((s, d) => s + d.error_count, 0)
  const errorRate = totalRequests > 0
    ? (totalErrors / totalRequests) * 100
    : 0

  const weightedAvg = data.reduce((s, d) => s + d.avg_duration_ms * d.log_count, 0)
  const avgLatency = totalRequests > 0
    ? weightedAvg / totalRequests
    : 0

  const weightedP95 = data.reduce((s, d) => s + d.p95_duration_ms * d.log_count, 0)
  const p95Latency = totalRequests > 0
    ? weightedP95 / totalRequests
    : 0

  const start = props.metrics?.start_date
  const end = props.metrics?.end_date
  let days = 1
  if (start && end) {
    const s = new Date(start.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
    const e = new Date(end.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
    days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
  }
  const throughput = Math.round(totalRequests / days)

  return { totalRequests, totalErrors, errorRate, avgLatency, p95Latency, throughput }
})

function buildExport(): PanelExportBuildResult {
  const rows = (props.metrics?.data ?? []).map(d => ({ ...d }))

  return {
    rows,
    summary: {
      total_requests: rawKpis.value.totalRequests,
      total_errors: rawKpis.value.totalErrors,
      error_rate_pct: rawKpis.value.errorRate,
      avg_latency_ms: rawKpis.value.avgLatency,
      p95_latency_ms: rawKpis.value.p95Latency,
      requests_per_day: rawKpis.value.throughput,
    },
    extraMeta: {
      granularity: props.metrics?.granularity,
      start_date: props.metrics?.start_date,
      end_date: props.metrics?.end_date,
    },
  }
}

const kpis = computed(() => {
  if ((props.metrics?.data ?? []).length === 0)
    return []

  const { totalRequests, errorRate, avgLatency, p95Latency, throughput } = rawKpis.value

  return [
    {
      label: 'Total Requests',
      value: formatCount(totalRequests),
      icon: 'mdi-counter',
      color: 'primary',
    },
    {
      label: 'Error Rate',
      value: `${errorRate.toFixed(1)}%`,
      icon: 'mdi-alert-circle-outline',
      color: errorRate > 5
        ? 'error'
        : errorRate > 1
          ? 'warning'
          : 'success',
    },
    {
      label: 'Avg Latency',
      value: formatMs(avgLatency),
      icon: 'mdi-timer-outline',
      color: avgLatency > 1000
        ? 'error'
        : avgLatency > 500
          ? 'warning'
          : 'success',
    },
    {
      label: 'p95 Latency',
      value: formatMs(p95Latency),
      icon: 'mdi-speedometer',
      color: p95Latency > 2000
        ? 'error'
        : p95Latency > 1000
          ? 'warning'
          : 'success',
    },
    {
      label: 'Req / Day',
      value: formatCount(throughput),
      icon: 'mdi-chart-timeline',
      color: 'info',
    },
  ]
})

function formatCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000)
    return `${(n / 1000).toFixed(1)}k`

  return String(n)
}

function formatMs(ms: number): string {
  if (ms >= 1000)
    return `${(ms / 1000).toFixed(1)}s`

  return `${Math.round(ms)}ms`
}
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  height: 100%;
  align-content: center;
}

.kpi-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  text-align: center;
}
</style>
