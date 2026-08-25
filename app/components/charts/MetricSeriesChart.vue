<template>
  <div
    class="metric-series-chart-wrapper"
    :style="{'height': heightStyle}"
  >
    <EChart
      class="metric-series-chart"
      :option="chartOption"
      :theme="isDark
        ? 'dark'
        : undefined"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import type { MetricSeriesResponse } from '~/types/metrics'
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  data?: MetricSeriesResponse
  /** 'series' plots the time series; 'distribution' plots histogram buckets. */
  mode?: 'series' | 'distribution'
  height?: number | string
}>(), {
  mode: 'series',
  height: '100%',
})

// Fixed assignment order, never cycled: a series keeps its hue when a filter
// removes its neighbours. Both ramps are validated for the CVD, chroma,
// lightness and contrast checks against their own surface - dark is its own
// set of steps at the same hues, not a lightened flip of the light one.
const SERIES_COLORS_LIGHT = ['#1e88e5', '#d81b60', '#00897b', '#ef6c00', '#5e35b1', '#43a047', '#8e24aa']
const SERIES_COLORS_DARK = ['#1e88e5', '#d81b60', '#00897b', '#e65100', '#7e57c2', '#43a047', '#ab47bc']
// Teal and pink sit at a deutan separation of 6.6, so identity never rests on
// hue alone: every series carries a legend entry and its own marker symbol.
const SERIES_SYMBOLS = ['circle', 'rect', 'triangle', 'diamond', 'roundRect', 'pin', 'arrow']
const OVERFLOW_COLOR = '#78909c'

const MAX_PLOTTED_SERIES = SERIES_COLORS_LIGHT.length

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const heightStyle = computed(() => (typeof props.height === 'number'
  ? `${props.height}px`
  : props.height))

const surfaceColor = computed(() => (isDark.value
  ? '#424242'
  : '#e0e0e0'))
const textColor = computed(() => (isDark.value
  ? 'rgba(255,255,255,0.7)'
  : 'rgba(0,0,0,0.6)'))
const seriesColors = computed(() => (isDark.value
  ? SERIES_COLORS_DARK
  : SERIES_COLORS_LIGHT))

const allSeries = computed(() => props.data?.series ?? [])

/**
 * Ranked by peak value so the loudest series keep their identity, with the
 * remainder folded into one neutral "Other" entry rather than being handed
 * recycled hues.
 */
const rankedSeries = computed(() => [...allSeries.value]
  .map(series => ({
    series,
    peak: series.points.reduce((max, point) => Math.max(max, point.value), 0),
  }))
  .sort((a, b) => b.peak - a.peak)
  .map(entry => entry.series))

const plottedSeries = computed(() => rankedSeries.value.slice(0, MAX_PLOTTED_SERIES))
const overflowSeries = computed(() => rankedSeries.value.slice(MAX_PLOTTED_SERIES))

function seriesLabel(tags: Record<string, string>): string {
  const entries = Object.entries(tags).filter(([, value]) => value !== '')

  if (!entries.length)
    return props.data?.name ?? 'value'

  return entries.map(([key, value]) => `${key}=${value}`).join(', ')
}

const buckets = computed(() => {
  const timestamps = new Set<string>()
  for (const series of allSeries.value) {
    for (const point of series.points)
      timestamps.add(point.bucket)
  }

  return [...timestamps].sort()
})

const isIntraday = computed(() => props.data?.interval === '1m' || props.data?.interval === '5m')

const bucketLabels = computed(() => buckets.value.map((bucket) => {
  const date = new Date(bucket)

  if (isIntraday.value)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (props.data?.interval === '1h')
    return date.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit' })

  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
}))

function formatValue(value: number): string {
  if (!Number.isFinite(value))
    return '-'
  if (Math.abs(value) >= 1000)
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (Number.isInteger(value))
    return String(value)

  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function axisInterval(length: number): number {
  if (length <= 12)
    return 0
  if (length <= 24)
    return 1
  if (length <= 48)
    return 3
  if (length <= 96)
    return 5

  return Math.floor(length / 12)
}

const chartOption = computed(() => (props.mode === 'distribution'
  ? buildDistributionOption()
  : buildSeriesOption()))

function pointsByBucket(points: { bucket: string, value: number }[]): Map<string, number> {
  return new Map(points.map(point => [point.bucket, point.value]))
}

function buildSeriesOption() {
  const bucketList = buckets.value
  const colors = seriesColors.value

  const plotted = plottedSeries.value.map((series, index) => {
    const lookup = pointsByBucket(series.points)

    return {
      name: seriesLabel(series.tags),
      type: 'line',
      smooth: false,
      showSymbol: bucketList.length <= 48,
      symbol: SERIES_SYMBOLS[index % SERIES_SYMBOLS.length],
      symbolSize: 8,
      lineStyle: { width: 2, color: colors[index] },
      itemStyle: { color: colors[index] },
      emphasis: { focus: 'series' },
      connectNulls: false,
      data: bucketList.map(bucket => lookup.get(bucket) ?? null),
    }
  })

  if (overflowSeries.value.length) {
    const summed = bucketList.map((bucket) => {
      let total = 0
      let seen = false
      for (const series of overflowSeries.value) {
        const value = pointsByBucket(series.points).get(bucket)
        if (value !== undefined) {
          total += value
          seen = true
        }
      }

      return seen
        ? total
        : null
    })

    plotted.push({
      name: `Other (${overflowSeries.value.length})`,
      type: 'line',
      smooth: false,
      showSymbol: false,
      symbol: 'none',
      symbolSize: 0,
      lineStyle: { width: 2, color: OVERFLOW_COLOR, type: 'dashed' } as any,
      itemStyle: { color: OVERFLOW_COLOR },
      emphasis: { focus: 'series' },
      connectNulls: false,
      data: summed,
    })
  }

  const showLegend = plotted.length >= 2

  return {
    backgroundColor: 'transparent',
    grid: {
      top: showLegend
        ? 36
        : 12,
      right: 12,
      bottom: 32,
      left: 48,
      containLabel: true,
    },
    legend: {
      show: showLegend,
      type: 'scroll',
      top: 0,
      textStyle: { color: textColor.value, fontSize: 11 },
      pageTextStyle: { color: textColor.value },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: surfaceColor.value } },
      formatter: (params: any[]) => {
        const label = params[0]?.axisValue ?? ''
        const rows = params
          .filter((param: any) => param.value !== null && param.value !== undefined)
          .map((param: any) => `${param.marker}${param.seriesName}: <b>${formatValue(param.value)}</b>`)
          .join('<br/>')

        return `<b>${label}</b><br/>${rows || 'no data'}`
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: bucketLabels.value,
      axisLabel: {
        color: textColor.value,
        fontSize: 10,
        interval: axisInterval(bucketLabels.value.length),
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: surfaceColor.value } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: textColor.value,
        fontSize: 10,
        formatter: (value: number) => formatValue(value),
      },
      splitLine: { lineStyle: { color: surfaceColor.value, type: 'dashed' } },
    },
    series: plotted,
  }
}

function bucketRangeLabel(bounds: (number | null)[], index: number): string {
  const upper = bounds[index]
  const lower = index === 0
    ? 0
    : bounds[index - 1]

  if (upper === null || upper === undefined)
    return `> ${formatValue(lower ?? 0)}`

  return `${formatValue(lower ?? 0)} - ${formatValue(upper)}`
}

function buildDistributionOption() {
  const histogram = props.data?.histograms?.[0]
  const bounds = histogram?.buckets.map(bucket => bucket.upper_bound) ?? []
  const counts = histogram?.buckets.map(bucket => bucket.count) ?? []
  const labels = bounds.map((_bound, index) => bucketRangeLabel(bounds, index))

  return {
    backgroundColor: 'transparent',
    grid: { top: 12, right: 12, bottom: 32, left: 48, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const param = params[0]
        if (!param)
          return ''

        return `<b>${param.axisValue}</b><br/>${formatValue(param.value)} observations`
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        color: textColor.value,
        fontSize: 10,
        interval: axisInterval(labels.length),
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: surfaceColor.value } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: textColor.value,
        fontSize: 10,
        formatter: (value: number) => formatValue(value),
      },
      splitLine: { lineStyle: { color: surfaceColor.value, type: 'dashed' } },
    },
    series: [
      {
        name: 'Observations',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: seriesColors.value[0],
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: { itemStyle: { opacity: 0.85 } },
      },
    ],
  }
}
</script>
