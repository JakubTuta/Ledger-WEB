<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    icon="mdi-speedometer"
    icon-color="warning"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @refresh="handleRefresh"
  >
    <template #content>
      <v-card-text class="panel-content-container pa-3">
        <!-- Controls -->
        <div class="d-flex mb-3 gap-2">
          <v-select
            v-model="selectedRoutes"
            :items="availableRoutes"
            label="Routes"
            variant="outlined"
            density="compact"
            multiple
            chips
            closable-chips
            hide-details
            :disabled="disabled || loading"
            class="flex-1"
          >
            <template #chip="{item, 'props': chipProps}">
              <v-chip
                v-bind="chipProps"
                size="x-small"
                :color="getRouteColor(item.value)"
              >
                {{ item.value }}
              </v-chip>
            </template>
          </v-select>

          <v-select
            v-model="selectedStatistic"
            :items="statisticOptions"
            label="Statistic"
            variant="outlined"
            density="compact"
            hide-details
            :disabled="disabled || loading"
            style="max-width: 150px;"
          />
        </div>

        <!-- Loading State -->
        <div
          v-if="loading"
          class="d-flex align-center justify-center"
          style="height: calc(100% - 60px);"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>

        <!-- No Data State -->
        <div
          v-else-if="!metrics || chartData.length === 0 || selectedRoutes.length === 0"
          class="text-grey d-flex align-center justify-center"
          style="height: calc(100% - 60px);"
        >
          <div class="text-center">
            <v-icon
              icon="mdi-chart-bar"
              size="48"
              class="mb-2"
            />

            <div class="text-body-2">
              {{ selectedRoutes.length === 0
                ? 'Select routes to analyze'
                : 'No data available' }}
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
                {{ formatYAxisLabel(maxValue) }}
              </div>

              <div class="y-axis-label">
                {{ formatYAxisLabel(Math.round(maxValue * 0.5)) }}
              </div>

              <div class="y-axis-label">
                0
              </div>
            </div>

            <!-- Bars -->
            <div class="chart-bars">
              <div
                v-for="(timePoint, index) in timePoints"
                :key="index"
                class="chart-bar-group"
              >
                <div class="bar-group-wrapper">
                  <div
                    v-for="route in selectedRoutes"
                    :key="route"
                    class="chart-bar-wrapper"
                  >
                    <v-tooltip location="top">
                      <template #activator="{'props': tooltipProps}">
                        <div
                          v-bind="tooltipProps"
                          class="chart-bar"
                          :style="{
                            'height': `${getBarHeight(timePoint, route)}%`,
                            'backgroundColor': getRouteColor(route),
                          }"
                        />
                      </template>

                      <div class="text-center">
                        <div class="font-weight-bold">
                          {{ formatTooltipDate(timePoint) }}
                        </div>

                        <div>Route: {{ route }}</div>

                        <div>{{ statisticLabel }}: {{ formatValue(getValue(timePoint, route)) }}</div>
                      </div>
                    </v-tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-labels mt-2">
            <span class="text-caption text-grey">{{ chartStartLabel }}</span>

            <span class="text-caption text-grey">{{ chartEndLabel }}</span>
          </div>

          <!-- Legend -->
          <div class="d-flex mt-3 flex-wrap gap-2">
            <v-chip
              v-for="route in selectedRoutes"
              :key="route"
              size="x-small"
              :color="getRouteColor(route)"
              variant="flat"
            >
              {{ route }}
            </v-chip>
          </div>
        </div>
      </v-card-text>
    </template>

    <template #footer>
      <v-card-actions class="pa-2">
        <div class="d-flex justify-space-between w-100">
          <div
            v-for="(stat, idx) in summaryStats"
            :key="idx"
            class="text-center"
          >
            <div class="text-body-2 font-weight-medium">
              {{ stat.value }}
            </div>

            <div class="text-caption text-grey">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </v-card-actions>
    </template>
  </BasePanelCard>
</template>

<script setup lang="ts">
import type { BottleneckMetricData, BottleneckMetricsResponse, BottleneckStatistic, Panel } from '~/types/panel'
import type { Project } from '~/types/project'

const props = defineProps<{
  panel: Panel
  project?: Project
  metrics?: BottleneckMetricsResponse
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  refresh: []
  update: [routes: string[], statistic: BottleneckStatistic]
  updatePanel: [routes: string[], statistic: BottleneckStatistic]
}>()

const selectedRoutes = ref<string[]>([])
const selectedStatistic = ref<BottleneckStatistic>('avg')

const statisticOptions = [
  { title: 'Average', value: 'avg' },
  { title: 'Minimum', value: 'min' },
  { title: 'Maximum', value: 'max' },
  { title: 'Median', value: 'median' },
  { title: 'Count', value: 'count' },
]

const availableRoutes = computed(() => props.project?.available_routes || [])

const chartData = computed(() => {
  if (!props.metrics?.data)
    return []

  return props.metrics.data
})

const timePoints = computed(() => {
  const points = new Set<string>()
  chartData.value.forEach((item) => {
    const key = `${item.date}${item.hour !== null && item.hour !== undefined
      ? `-${item.hour}`
      : ''}`
    points.add(key)
  })

  return Array.from(points).sort()
})

const maxValue = computed(() => {
  if (chartData.value.length === 0)
    return 1

  let values = chartData.value.map(d => d.value)

  if (selectedStatistic.value === 'min') {
    const nonZeroValues = values.filter(v => v > 0)
    if (nonZeroValues.length > 0) {
      values = nonZeroValues
    }
  }

  return Math.max(...values, 1)
})

const statisticLabel = computed(() => {
  const labels: Record<BottleneckStatistic, string> = {
    avg: 'Average',
    min: 'Minimum',
    max: 'Maximum',
    median: 'Median',
    count: 'Count',
  }

  return labels[selectedStatistic.value]
})

const chartStartLabel = computed(() => {
  if (timePoints.value.length === 0)
    return ''

  return formatDateLabel(timePoints.value[0]!)
})

const chartEndLabel = computed(() => {
  if (timePoints.value.length === 0)
    return ''

  return formatDateLabel(timePoints.value[timePoints.value.length - 1]!)
})

const summaryStats = computed(() => {
  if (chartData.value.length === 0) {
    return [
      { label: 'Routes', value: '0' },
      { label: 'Data Points', value: '0' },
      { label: statisticLabel.value, value: '-' },
    ]
  }

  const values = chartData.value.map(d => d.value).filter(v => v > 0)
  const avg = values.length > 0
    ? values.reduce((sum, v) => sum + v, 0) / values.length
    : 0

  return [
    { label: 'Routes', value: selectedRoutes.value.length.toString() },
    { label: 'Data Points', value: chartData.value.length.toString() },
    {
      label: `Avg ${statisticLabel.value}`,
      value: values.length > 0
        ? formatValue(avg)
        : '-',
    },
  ]
})

const routeColors = [
  '#1976D2',
  '#388E3C',
  '#D32F2F',
  '#F57C00',
  '#7B1FA2',
  '#0097A7',
  '#C2185B',
  '#5D4037',
  '#455A64',
  '#689F38',
]

function getRouteColor(route: string): string {
  const index = selectedRoutes.value.indexOf(route)
  if (index === -1)
    return routeColors[0]!

  return routeColors[index % routeColors.length]!
}

function getValue(timePoint: string, route: string): number {
  const item = chartData.value.find((d) => {
    const key = `${d.date}${d.hour !== null && d.hour !== undefined
      ? `-${d.hour}`
      : ''}`

    return key === timePoint && d.route === route
  })

  return item?.value || 0
}

function getBarHeight(timePoint: string, route: string): number {
  const value = getValue(timePoint, route)

  if (selectedStatistic.value === 'min' && value === 0) {
    const allValues = chartData.value.map(d => d.value)
    const hasNonZeroValues = allValues.some(v => v > 0)

    if (hasNonZeroValues) {
      return 0
    }
  }

  return Math.max((value / maxValue.value) * 100, 2)
}

function formatValue(value: number): string {
  if (selectedStatistic.value === 'count') {
    return Math.round(value).toLocaleString()
  }

  return `${Math.round(value)}ms`
}

function formatDateLabel(timePoint: string): string {
  const parts = timePoint.split('-')
  const dateStr = parts[0]!
  const year = dateStr.substring(0, 4)
  const month = dateStr.substring(4, 6)
  const day = dateStr.substring(6, 8)

  return `${day}/${month}/${year}`
}

function formatTooltipDate(timePoint: string): string {
  const parts = timePoint.split('-')
  const dateStr = parts[0]!
  const year = dateStr.substring(0, 4)
  const month = dateStr.substring(4, 6)
  const day = dateStr.substring(6, 8)
  const hour = parts[1]

  if (hour !== undefined) {
    return `${day}/${month}/${year} ${hour}:00`
  }

  return `${day}/${month}/${year}`
}

function formatYAxisLabel(value: number): string {
  if (selectedStatistic.value === 'count') {
    if (value >= 1_000_000)
      return `${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000)
      return `${(value / 1_000).toFixed(2)}K`

    return Math.round(value).toString()
  }

  if (value >= 1000)
    return `${(value / 1000).toFixed(2)}s`

  return `${Math.round(value)}ms`
}

function handleRefresh() {
  if (selectedRoutes.value.length > 0) {
    emit('update', selectedRoutes.value, selectedStatistic.value)
    emit('refresh')
  }
}

let updateTimeout: NodeJS.Timeout | null = null

watch([selectedRoutes, selectedStatistic], ([routes, statistic]) => {
  if (routes.length > 0) {
    emit('update', routes, statistic)

    if (updateTimeout) {
      clearTimeout(updateTimeout)
    }

    updateTimeout = setTimeout(() => {
      emit('updatePanel', routes, statistic)
    }, 1000)
  }
}, { deep: true })

onUnmounted(() => {
  if (updateTimeout) {
    clearTimeout(updateTimeout)
  }
})

onMounted(() => {
  if (props.panel.routes && props.panel.routes.length > 0) {
    selectedRoutes.value = [...props.panel.routes]
  }
  else if (availableRoutes.value.length > 0 && selectedRoutes.value.length === 0) {
    selectedRoutes.value = [availableRoutes.value[0]!]
  }

  if (props.panel.statistic) {
    selectedStatistic.value = props.panel.statistic
  }

  if (!props.metrics && selectedRoutes.value.length > 0) {
    emit('update', selectedRoutes.value, selectedStatistic.value)
  }
})
</script>

<style scoped>
.chart-container {
  height: calc(100% - 60px);
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

.chart-bar-group {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.bar-group-wrapper {
  width: 100%;
  display: flex;
  gap: 1px;
  align-items: flex-end;
  height: 100%;
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
