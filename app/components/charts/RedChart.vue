<template>
  <div
    class="red-chart-wrapper"
    :style="{'height': heightStyle}"
  >
    <EChart
      :option="chartOption"
      :theme="isDark
        ? 'dark'
        : undefined"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import type { RedMetric, RedPoint, RedSeries, ServiceRedResponse } from '~/types/services'
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  data?: ServiceRedResponse
  metric: RedMetric
  height?: number | string
}>(), {
  height: '100%',
})

// Same fixed, CVD-checked ramps as MetricSeriesChart: a series keeps its hue
// when its neighbours change, and carries its own marker symbol.
const SERIES_COLORS_LIGHT = ['#1e88e5', '#d81b60', '#00897b', '#ef6c00', '#5e35b1', '#43a047', '#8e24aa']
const SERIES_COLORS_DARK = ['#1e88e5', '#d81b60', '#00897b', '#e65100', '#7e57c2', '#43a047', '#ab47bc']
const SERIES_SYMBOLS = ['circle', 'rect', 'triangle', 'diamond', 'roundRect', 'pin', 'arrow']
const PERCENTILES: { key: keyof RedPoint, label: string }[] = [
  { key: 'p50_ms', label: 'p50' },
  { key: 'p95_ms', label: 'p95' },
  { key: 'p99_ms', label: 'p99' },
]
const INTERVAL_MINUTES: Record<string, number> = { '1m': 1, '5m': 5, '1h': 60, '1d': 1440 }

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const heightStyle = computed(() => (typeof props.height === 'number'
  ? `${props.height}px`
  : props.height))
const colors = computed(() => (isDark.value
  ? SERIES_COLORS_DARK
  : SERIES_COLORS_LIGHT))
const textColor = computed(() => (isDark.value
  ? 'rgba(255,255,255,0.7)'
  : 'rgba(0,0,0,0.6)'))
const gridColor = computed(() => (isDark.value
  ? '#424242'
  : '#e0e0e0'))

// The server returns series busiest first; the rest stay in the table.
const plotted = computed(() => (props.data?.series ?? []).slice(0, SERIES_COLORS_LIGHT.length))

const buckets = computed(() => {
  const all = new Set<string>()
  for (const series of plotted.value) {
    for (const point of series.points)
      all.add(point.bucket)
  }

  return [...all].sort()
})

const intervalMinutes = computed(() => INTERVAL_MINUTES[props.data?.interval ?? '1m'] ?? 1)

function seriesName(series: RedSeries): string {
  return series.operation ?? series.service
}

function valueOf(point: RedPoint): number {
  if (props.metric === 'rate')
    return point.calls / intervalMinutes.value
  if (props.metric === 'errors') {
    return point.calls > 0
      ? point.errors / point.calls * 100
      : 0
  }

  return point.p95_ms
}

function axisLabel(bucket: string): string {
  const date = new Date(bucket)

  return intervalMinutes.value < 60
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit' })
}

function lines() {
  const bucketList = buckets.value
  // A single series gets its whole latency distribution; several get one
  // comparable line each (p95).
  if (props.metric === 'duration' && plotted.value.length === 1) {
    const lookup = new Map(plotted.value[0]!.points.map(point => [point.bucket, point]))

    return PERCENTILES.map((percentile, index) => ({
      name: percentile.label,
      type: 'line',
      symbol: SERIES_SYMBOLS[index],
      showSymbol: bucketList.length <= 48,
      lineStyle: { width: 2, color: colors.value[index] },
      itemStyle: { color: colors.value[index] },
      data: bucketList.map(bucket => lookup.get(bucket)?.[percentile.key] ?? null),
    }))
  }

  return plotted.value.map((series, index) => {
    const lookup = new Map(series.points.map(point => [point.bucket, point]))

    return {
      name: seriesName(series),
      type: 'line',
      symbol: SERIES_SYMBOLS[index],
      showSymbol: bucketList.length <= 48,
      lineStyle: { width: 2, color: colors.value[index] },
      itemStyle: { color: colors.value[index] },
      emphasis: { focus: 'series' },
      data: bucketList.map((bucket) => {
        const point = lookup.get(bucket)

        return point
          ? valueOf(point)
          : null
      }),
    }
  })
}

function formatValue(value: number): string {
  if (props.metric === 'errors')
    return `${value.toFixed(2)}%`
  if (props.metric === 'duration') {
    return value >= 1000
      ? `${(value / 1000).toFixed(2)} s`
      : `${value.toFixed(1)} ms`
  }

  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}/min`
}

const chartOption = computed(() => {
  const series = lines()
  const showLegend = series.length >= 2

  return {
    backgroundColor: 'transparent',
    grid: { top: showLegend
      ? 36
      : 12, right: 12, bottom: 32, left: 48, containLabel: true },
    legend: {
      show: showLegend,
      type: 'scroll',
      top: 0,
      textStyle: { color: textColor.value, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number | null) => (value === null || value === undefined
        ? '-'
        : formatValue(value)),
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: buckets.value.map(axisLabel),
      axisLabel: { color: textColor.value, fontSize: 10, hideOverlap: true },
      axisLine: { lineStyle: { color: gridColor.value } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { color: textColor.value, fontSize: 10, formatter: (value: number) => formatValue(value) },
      splitLine: { lineStyle: { color: gridColor.value, type: 'dashed' } },
    },
    series,
  }
})
</script>
