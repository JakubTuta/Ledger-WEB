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
      <v-card-text class="panel-content-container pa-2">
        <!-- Controls -->
        <div class="d-flex mb-2 gap-2">
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
            style="max-width: 140px;"
          />
        </div>

        <!-- Loading State -->
        <div
          v-if="loading"
          class="d-flex align-center justify-center"
          style="height: calc(100% - 56px);"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>

        <!-- No Data State -->
        <div
          v-else-if="!metrics || selectedRoutes.length === 0 || chartData.length === 0"
          class="text-grey d-flex align-center justify-center"
          style="height: calc(100% - 56px);"
        >
          <div class="text-center">
            <v-icon
              icon="mdi-speedometer"
              size="48"
              class="mb-2"
            />
            <div class="text-body-2">
              {{ selectedRoutes.length === 0 ? 'Select routes to analyze' : 'No data available' }}
            </div>
          </div>
        </div>

        <!-- Chart -->
        <BottleneckChart
          v-else
          :metrics="metrics"
          :selected-routes="selectedRoutes"
          :statistic="selectedStatistic"
          height="calc(100% - 56px)"
        />
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
const chartData = computed(() => props.metrics?.data ?? [])

const routeColors = [
  '#1976D2', '#388E3C', '#D32F2F', '#F57C00',
  '#7B1FA2', '#0097A7', '#C2185B', '#5D4037',
  '#455A64', '#689F38',
]

function getRouteColor(route: string): string {
  const idx = selectedRoutes.value.indexOf(route)
  return routeColors[idx >= 0 ? idx % routeColors.length : 0]!
}

const statisticLabel = computed(() => {
  const labels: Record<BottleneckStatistic, string> = {
    avg: 'Average', min: 'Minimum', max: 'Maximum', median: 'Median', count: 'Count',
  }
  return labels[selectedStatistic.value]
})

function formatValue(v: number): string {
  if (selectedStatistic.value === 'count') {
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toLocaleString()
  }
  return `${Math.round(v)}ms`
}

const summaryStats = computed(() => {
  if (chartData.value.length === 0) {
    return [
      { label: 'Routes', value: '0' },
      { label: 'Data Points', value: '0' },
      { label: statisticLabel.value, value: '-' },
    ]
  }

  const values = chartData.value.map((d: BottleneckMetricData) => d.value).filter((v: number) => v > 0)
  const avg = values.length > 0 ? values.reduce((s: number, v: number) => s + v, 0) / values.length : 0

  return [
    { label: 'Routes', value: selectedRoutes.value.length.toString() },
    { label: 'Data Points', value: chartData.value.length.toString() },
    { label: `Avg ${statisticLabel.value}`, value: values.length > 0 ? formatValue(avg) : '-' },
  ]
})

function handleRefresh() {
  if (selectedRoutes.value.length > 0) {
    emit('update', selectedRoutes.value, selectedStatistic.value)
    emit('refresh')
  }
}

let updateTimeout: ReturnType<typeof setTimeout> | null = null

watch([selectedRoutes, selectedStatistic], ([routes, statistic]) => {
  if (routes.length > 0) {
    emit('update', routes, statistic)

    if (updateTimeout) clearTimeout(updateTimeout)
    updateTimeout = setTimeout(() => {
      emit('updatePanel', routes, statistic)
    }, 1000)
  }
}, { deep: true })

onUnmounted(() => {
  if (updateTimeout) clearTimeout(updateTimeout)
})

onMounted(() => {
  if (props.panel.routes?.length) selectedRoutes.value = [...props.panel.routes]
  else if (availableRoutes.value.length) selectedRoutes.value = [availableRoutes.value[0]!]

  if (props.panel.statistic) selectedStatistic.value = props.panel.statistic

  if (!props.metrics && selectedRoutes.value.length > 0) {
    emit('update', selectedRoutes.value, selectedStatistic.value)
  }
})
</script>
