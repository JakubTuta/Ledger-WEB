<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    :icon="panelTypeIcon"
    :icon-color="panelTypeColor"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @refresh="emit('refresh')"
  >
    <template #content>
      <v-card-text class="panel-content-container pa-3">
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

        <!-- Bar Chart -->
        <div
          v-else
          class="chart-container"
        >
          <div class="chart-wrapper">
            <!-- Y-axis labels -->
            <div class="chart-y-axis">
              <div class="y-axis-label">
                {{ formatYAxisLabel(maxLogCount) }}
              </div>

              <div class="y-axis-label">
                {{ formatYAxisLabel(Math.round(maxLogCount * 0.5)) }}
              </div>

              <div class="y-axis-label">
                0
              </div>
            </div>

            <!-- Bars -->
            <div class="chart-bars">
              <div
                v-for="(item, index) in chartData"
                :key="index"
                class="chart-bar-wrapper"
              >
                <v-tooltip location="top">
                  <template #activator="{'props': tooltipProps}">
                    <div
                      v-bind="tooltipProps"
                      class="chart-bar"
                      :style="{
                        'height': `${getBarHeight(item.log_count)}%`,
                        'backgroundColor': getBarColor(item),
                      }"
                    />
                  </template>

                  <div class="text-center">
                    <div class="font-weight-bold">
                      {{ formatTooltipDate(item) }}
                    </div>

                    <div>Logs: {{ item.log_count.toLocaleString() }}</div>

                    <div v-if="item.error_count > 0">
                      Errors: {{ item.error_count.toLocaleString() }}
                    </div>

                    <div v-if="item.avg_duration_ms">
                      Avg: {{ item.avg_duration_ms.toFixed(0) }}ms
                    </div>
                  </div>
                </v-tooltip>
              </div>
            </div>
          </div>

          <div class="chart-labels mt-2">
            <span class="text-caption text-grey">{{ chartStartLabel }}</span>

            <span class="text-caption text-grey">{{ chartEndLabel }}</span>
          </div>
        </div>
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

const panelTypeIcon = computed(() => {
  switch (props.panel.type) {
    case 'logs':
      return 'mdi-text-box-outline'
    case 'errors':
      return 'mdi-alert-circle'
    case 'metrics':
      return 'mdi-chart-line'
    case 'error_list':
      return 'mdi-format-list-bulleted'
    default:
      return 'mdi-view-dashboard'
  }
})

const panelTypeColor = computed(() => {
  switch (props.panel.type) {
    case 'errors':
      return 'error'
    case 'error_list':
      return 'error'
    case 'metrics':
      return 'success'
    default:
      return 'primary'
  }
})

const chartData = computed(() => {
  if (!props.metrics?.data)
    return []

  return props.metrics.data
})

const maxLogCount = computed(() => {
  if (chartData.value.length === 0)
    return 1

  return Math.max(...chartData.value.map(d => d.log_count), 1)
})

const totalLogs = computed(() => chartData.value.reduce((sum, d) => sum + d.log_count, 0),
)

const totalErrors = computed(() => chartData.value.reduce((sum, d) => sum + d.error_count, 0),
)

const avgDuration = computed(() => {
  const durations = chartData.value.filter(d => d.avg_duration_ms > 0)
  if (durations.length === 0)
    return '-'
  const avg = durations.reduce((sum, d) => sum + d.avg_duration_ms, 0) / durations.length

  return `${avg.toFixed(0)}ms`
})

const chartStartLabel = computed(() => {
  if (chartData.value.length === 0)
    return ''

  return formatDateLabel(chartData.value[0]!)
})

const chartEndLabel = computed(() => {
  if (chartData.value.length === 0)
    return ''

  return formatDateLabel(chartData.value[chartData.value.length - 1]!)
})

function getBarHeight(logCount: number): number {
  return Math.max((logCount / maxLogCount.value) * 100, 2)
}

function getBarColor(item: AggregatedMetricData): string {
  if (item.error_count > 0) {
    const errorRatio = item.error_count / item.log_count
    if (errorRatio > 0.5)
      return 'rgb(var(--v-theme-error))'
    if (errorRatio > 0.1)
      return 'rgb(var(--v-theme-warning))'
  }

  return 'rgb(var(--v-theme-primary))'
}

function formatDateLabel(item: AggregatedMetricData): string {
  const date = item.date
  const year = date.substring(0, 4)
  const month = date.substring(4, 6)
  const day = date.substring(6, 8)

  return `${day}/${month}/${year}`
}

function formatTooltipDate(item: AggregatedMetricData): string {
  const date = item.date
  const year = date.substring(0, 4)
  const month = date.substring(4, 6)
  const day = date.substring(6, 8)

  if (item.hour !== undefined && item.hour !== null && props.metrics?.granularity === 'hourly') {
    return `${day}/${month}/${year} ${item.hour}:00`
  }

  return `${day}/${month}/${year}`
}

function formatYAxisLabel(value: number): string {
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)
    return `${(value / 1_000).toFixed(1)}K`

  return value.toString()
}
</script>

<style scoped>
/* Chart-specific styles */
.chart-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-wrapper {
  flex: 1;
  display: flex;
  gap: 8px;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 40px;
  flex-shrink: 0;
}

.y-axis-label {
  font-size: 10px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
  text-align: right;
}

.chart-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 0 4px;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.chart-bar {
  width: 100%;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
  transition: height 0.3s ease;
  cursor: pointer;
}

.chart-bar:hover {
  opacity: 0.8;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
}
</style>
