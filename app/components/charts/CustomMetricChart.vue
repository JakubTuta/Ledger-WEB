<template>
  <div
    class="w-100 h-100"
    style="min-height: 120px;"
  >
    <template v-if="viz === 'single_stat'">
      <div class="d-flex flex-column align-center justify-center h-100 pa-2">
        <div
          class="text-h3 font-weight-bold"
          :style="{ color: `rgb(var(--v-theme-${statColor}))` }"
        >
          {{ formattedLastValue }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          {{ data?.name ?? '' }} ({{ data?.agg ?? '' }})
        </div>
        <EChart
          v-if="sparklineOption"
          class="w-100"
          style="height: 60px; margin-top: 8px;"
          :option="sparklineOption"
          :theme="isDark ? 'dark' : undefined"
          autoresize
        />
      </div>
    </template>

    <EChart
      v-else
      class="w-100 h-100"
      :option="chartOption"
      :theme="isDark ? 'dark' : undefined"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import type { CustomMetricViz } from '~/types/panel'
import type { TimeSeriesData } from '~/types/traces'
import { useTheme } from 'vuetify'

const props = defineProps<{
  data?: TimeSeriesData | null
  viz: CustomMetricViz
}>()

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const points = computed(() => props.data?.points ?? [])
const xData = computed(() => points.value.map(p => p.timestamp))
const yData = computed(() => points.value.map(p => p.value))

const lastValue = computed(() => yData.value.at(-1) ?? null)

const formattedLastValue = computed(() => {
  if (lastValue.value === null) return '—'
  const v = lastValue.value
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`
  return v % 1 === 0 ? String(v) : v.toFixed(3)
})

const statColor = computed(() => {
  if (lastValue.value === null) return 'on-surface'
  return 'primary'
})

const baseGridConfig = { top: 16, right: 8, bottom: 40, left: 48, containLabel: true }

const chartOption = computed(() => {
  const seriesType = props.viz === 'bar' ? 'bar' : 'line'
  return {
    backgroundColor: 'transparent',
    grid: baseGridConfig,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: seriesType === 'bar' ? 'shadow' : 'cross' },
    },
    xAxis: {
      type: 'category',
      data: xData.value,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        name: props.data?.name ?? 'Value',
        type: seriesType,
        data: yData.value,
        smooth: seriesType === 'line',
        areaStyle: seriesType === 'line' ? { opacity: 0.2 } : undefined,
        itemStyle: { color: `rgb(var(--v-theme-primary))` },
      },
    ],
  }
})

const sparklineOption = computed(() => {
  if (yData.value.length === 0) return null
  return {
    backgroundColor: 'transparent',
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    xAxis: { type: 'category', show: false, data: xData.value },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data: yData.value,
        smooth: true,
        symbol: 'none',
        areaStyle: { opacity: 0.3 },
        lineStyle: { width: 1.5 },
        itemStyle: { color: `rgb(var(--v-theme-primary))` },
      },
    ],
  }
})
</script>
