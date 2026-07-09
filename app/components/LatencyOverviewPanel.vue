<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    icon="mdi-chart-timeline-variant"
    icon-color="success"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @refresh="emit('refresh')"
  >
    <template #content>
      <v-card-text class="panel-content-container pa-2">
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
          v-else-if="!aggregated || aggregated.data.length === 0"
          class="d-flex align-center text-grey justify-center"
          style="height: 100%;"
        >
          <div class="text-center">
            <v-icon
              icon="mdi-chart-timeline-variant"
              size="48"
              class="mb-2"
            />

            <div class="text-body-2">
              No data available
            </div>
          </div>
        </div>

        <!-- Latency chart: project-wide aggregated lines -->
        <MetricChart
          v-else
          :metrics="aggregated"
          mode="latency"
        />
      </v-card-text>
    </template>

    <template #footer>
      <v-card-actions class="pa-2">
        <div class="d-flex justify-space-between w-100">
          <div class="text-center">
            <div class="text-body-2 font-weight-medium">
              {{ formatMs(footerAvg) }}
            </div>

            <div class="text-caption text-grey">
              Avg
            </div>
          </div>

          <div class="text-center">
            <div class="text-body-2 font-weight-medium text-warning">
              {{ formatMs(footerP95) }}
            </div>

            <div class="text-caption text-grey">
              p95
            </div>
          </div>

          <div class="text-center">
            <div class="text-body-2 font-weight-medium text-error">
              {{ formatMs(footerP99) }}
            </div>

            <div class="text-caption text-grey">
              p99
            </div>
          </div>
        </div>
      </v-card-actions>
    </template>
  </BasePanelCard>
</template>

<script setup lang="ts">
import type { AggregatedMetricData, AggregatedMetricsResponse, Panel } from '~/types/panel'
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

const aggregated = computed((): AggregatedMetricsResponse | undefined => {
  if (!props.metrics)
    return undefined

  const raw = props.metrics.data
  if (raw.length === 0)
    return props.metrics

  const byBucket = new Map<string, AggregatedMetricData[]>()
  for (const row of raw) {
    const key = row.hour !== undefined
      ? `${row.date}-${String(row.hour).padStart(2, '0')}`
      : row.date
    const bucket = byBucket.get(key) ?? []
    bucket.push(row)
    byBucket.set(key, bucket)
  }

  const merged: AggregatedMetricData[] = []
  for (const [, rows] of byBucket) {
    const totalCount = rows.reduce((s, r) => s + r.log_count, 0)
    if (totalCount === 0)
      continue

    const wAvg = rows.reduce((s, r) => s + r.avg_duration_ms * r.log_count, 0) / totalCount
    const wP95 = rows.reduce((s, r) => s + r.p95_duration_ms * r.log_count, 0) / totalCount
    const wP99 = rows.reduce((s, r) => s + r.p99_duration_ms * r.log_count, 0) / totalCount
    const minMs = Math.min(...rows.map(r => r.min_duration_ms).filter(v => v > 0))
    const maxMs = Math.max(...rows.map(r => r.max_duration_ms))

    const first = rows[0]!
    merged.push({
      date: first.date,
      hour: first.hour,
      log_count: totalCount,
      error_count: rows.reduce((s, r) => s + r.error_count, 0),
      avg_duration_ms: wAvg,
      min_duration_ms: isFinite(minMs)
        ? minMs
        : 0,
      max_duration_ms: isFinite(maxMs)
        ? maxMs
        : 0,
      p95_duration_ms: wP95,
      p99_duration_ms: wP99,
    })
  }

  merged.sort((a, b) => {
    const ka = a.hour !== undefined
      ? `${a.date}-${String(a.hour).padStart(2, '0')}`
      : a.date
    const kb = b.hour !== undefined
      ? `${b.date}-${String(b.hour).padStart(2, '0')}`
      : b.date

    return ka < kb
      ? -1
      : ka > kb
        ? 1
        : 0
  })

  return { ...props.metrics, data: merged }
})

const footerAvg = computed(() => {
  const data = aggregated.value?.data ?? []
  const total = data.reduce((s, d) => s + d.log_count, 0)
  if (total === 0)
    return 0

  return data.reduce((s, d) => s + d.avg_duration_ms * d.log_count, 0) / total
})

const footerP95 = computed(() => {
  const data = aggregated.value?.data ?? []
  const total = data.reduce((s, d) => s + d.log_count, 0)
  if (total === 0)
    return 0

  return data.reduce((s, d) => s + d.p95_duration_ms * d.log_count, 0) / total
})

const footerP99 = computed(() => {
  const data = aggregated.value?.data ?? []
  const total = data.reduce((s, d) => s + d.log_count, 0)
  if (total === 0)
    return 0

  return data.reduce((s, d) => s + d.p99_duration_ms * d.log_count, 0) / total
})

function formatMs(ms: number): string {
  if (ms <= 0)
    return '—'
  if (ms >= 1000)
    return `${(ms / 1000).toFixed(1)}s`

  return `${Math.round(ms)}ms`
}
</script>

<style scoped>
:deep(.panel-content-container) {
  height: 100%;
  overflow-y: auto;
}
</style>
