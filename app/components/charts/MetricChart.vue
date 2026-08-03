<template>
  <div
    class="metric-chart-wrapper"
    :style="{'height': heightStyle}"
  >
    <EChart
      class="metric-chart"
      :option="chartOption"
      :theme="isDark
        ? 'dark'
        : undefined"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import type { AggregatedMetricData, AggregatedMetricsResponse } from '~/types/panel'
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  metrics?: AggregatedMetricsResponse
  mode?: 'volume' | 'latency' | 'errors'
  height?: number | string
  // Running total vs. per-bucket values, for bar modes only (ignored in
  // 'latency' mode). Controlled by the panel's options menu, not this
  // component - a chart doesn't own its own display preference.
  cumulative?: boolean
}>(), {
  mode: 'volume',
  height: '100%',
})

const heightStyle = computed(() => (typeof props.height === 'number'
  ? `${props.height}px`
  : props.height))

function axisInterval(len: number): number {
  if (len <= 12)
    return 0
  if (len <= 24)
    return 1
  if (len <= 48)
    return 3
  if (len <= 96)
    return 5
  if (len <= 168)
    return 11

  return Math.floor(len / 12)
}

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)
const isCumulative = computed(() => props.cumulative)

const data = computed<AggregatedMetricData[]>(() => props.metrics?.data ?? [])
const isHourly = computed(() => props.metrics?.granularity === 'hourly')

const xAxisData = computed(() => data.value.map((d) => {
  const y = d.date.substring(0, 4)
  const m = d.date.substring(4, 6)
  const day = d.date.substring(6, 8)
  if (isHourly.value && d.hour !== undefined && d.hour !== null) {
    return `${day}/${m} ${String(d.hour).padStart(2, '0')}:00`
  }

  return `${day}/${m}/${y}`
}),
)

function cumulate(arr: number[]): number[] {
  let sum = 0

  return arr.map(v => (sum += v))
}

const surfaceColor = computed(() => (isDark.value
  ? '#424242'
  : '#e0e0e0'))
const textColor = computed(() => (isDark.value
  ? 'rgba(255,255,255,0.7)'
  : 'rgba(0,0,0,0.6)'))

const chartOption = computed(() => {
  if (props.mode === 'latency')
    return buildLatencyOption()

  return buildVolumeOption()
})

function buildVolumeOption() {
  const rawLogs = data.value.map(d => d.log_count)
  const rawErrors = data.value.map(d => d.error_count)

  const errorData = isCumulative.value
    ? cumulate(rawErrors)
    : rawErrors
  const logData = isCumulative.value
    ? cumulate(rawLogs)
    : rawLogs

  const suffix = isCumulative.value
    ? ' (cumulative)'
    : ''

  const errorRates = logData.map((logs, i) => {
    if (logs === 0)
      return '0%'

    return `${((errorData[i]! / logs) * 100).toFixed(1)}%`
  })

  const rotate = xAxisData.value.length > 20
    ? 45
    : 0

  return {
    backgroundColor: 'transparent',
    grid: { top: 8, right: 8, bottom: 64, left: 48, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const label = params[0]?.axisValue ?? ''
        const logs = params.find((p: any) => p.seriesName === `Logs${suffix}`)?.value ?? 0
        const errors = params.find((p: any) => p.seriesName === `Errors${suffix}`)?.value ?? 0
        const cumLabel = isCumulative.value
          ? ' cumul.'
          : ''

        return `<b>${label}</b><br/>Logs: ${Number(logs).toLocaleString()}${cumLabel}<br/>Errors: ${Number(errors).toLocaleString()}${cumLabel}`
      },
    },
    xAxis: {
      type: 'category',
      data: xAxisData.value,
      axisLabel: {
        color: textColor.value,
        fontSize: 10,
        rotate,
        interval: axisInterval(xAxisData.value.length),
        hideOverlap: true,
        formatter: (_value: string, index: number) => {
          const date = xAxisData.value[index] ?? ''
          const rate = errorRates[index] ?? '0%'

          return `{date|${date}}\n{rate|${rate}}`
        },
        rich: {
          date: { fontSize: 10, color: textColor.value, lineHeight: 16 },
          rate: { fontSize: 9, color: '#ef5350', lineHeight: 14 },
        },
      },
      axisLine: { lineStyle: { color: surfaceColor.value } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: textColor.value,
        fontSize: 10,
        formatter: (v: number) => (v >= 1000
          ? `${(v / 1000).toFixed(0)}k`
          : String(v)),
      },
      splitLine: { lineStyle: { color: surfaceColor.value, type: 'dashed' } },
    },
    series: [
      {
        name: `Logs${suffix}`,
        type: 'bar',
        data: logData,
        itemStyle: { color: '#42a5f5', borderRadius: [2, 2, 0, 0] },
        emphasis: { itemStyle: { opacity: 0.8 } },
      },
      {
        name: `Errors${suffix}`,
        type: 'bar',
        data: errorData,
        itemStyle: { color: '#ef5350', borderRadius: [2, 2, 0, 0] },
        emphasis: { itemStyle: { color: '#e53935' } },
      },
    ],
    legend: {
      bottom: 0,
      textStyle: { color: textColor.value, fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
  }
}

function buildLatencyOption() {
  const toNum = (v: number | undefined | null) => (v == null || Number.isNaN(v)
    ? null
    : Math.round(v))
  const avgData = data.value.map(d => toNum(d.avg_duration_ms))
  const p95Data = data.value.map(d => toNum(d.p95_duration_ms))
  const p99Data = data.value.map(d => toNum(d.p99_duration_ms))
  const minData = data.value.map(d => toNum(d.min_duration_ms))
  const maxData = data.value.map(d => toNum(d.max_duration_ms))

  return {
    backgroundColor: 'transparent',
    grid: { top: 8, right: 8, bottom: 56, left: 52, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const label = params[0]?.axisValue ?? ''
        let html = `<b>${label}</b>`
        for (const p of params) {
          if (p.value != null)
            html += `<br/>${p.seriesName}: ${p.value}ms`
        }

        return html
      },
    },
    xAxis: {
      type: 'category',
      data: xAxisData.value,
      axisLabel: {
        color: textColor.value,
        fontSize: 10,
        rotate: xAxisData.value.length > 20
          ? 45
          : 0,
        interval: axisInterval(xAxisData.value.length),
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
        formatter: (v: number) => (v >= 1000
          ? `${(v / 1000).toFixed(1)}s`
          : `${v}ms`),
      },
      splitLine: { lineStyle: { color: surfaceColor.value, type: 'dashed' } },
    },
    series: [
      {
        name: 'Min',
        type: 'line',
        data: minData,
        lineStyle: { color: '#66bb6a', width: 1, type: 'dashed' },
        itemStyle: { color: '#66bb6a' },
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: true,
        connectNulls: true,
      },
      {
        name: 'Avg',
        type: 'line',
        data: avgData,
        lineStyle: { color: '#42a5f5', width: 2 },
        itemStyle: { color: '#42a5f5' },
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: true,
        connectNulls: true,
        areaStyle: { color: '#42a5f5', opacity: 0.08 },
      },
      {
        name: 'p95',
        type: 'line',
        data: p95Data,
        lineStyle: { color: '#ffa726', width: 1.5 },
        itemStyle: { color: '#ffa726' },
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: true,
        connectNulls: true,
      },
      {
        name: 'p99',
        type: 'line',
        data: p99Data,
        lineStyle: { color: '#ef5350', width: 1.5 },
        itemStyle: { color: '#ef5350' },
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: true,
        connectNulls: true,
      },
      {
        name: 'Max',
        type: 'line',
        data: maxData,
        lineStyle: { color: '#ab47bc', width: 1, type: 'dashed' },
        itemStyle: { color: '#ab47bc' },
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: true,
        connectNulls: true,
      },
    ],
    legend: {
      bottom: 0,
      textStyle: { color: textColor.value, fontSize: 11 },
      itemWidth: 16,
      itemHeight: 4,
    },
  }
}
</script>

<style scoped>
.metric-chart-wrapper {
  position: relative;
  width: 100%;
}

.metric-chart {
  width: 100%;
  height: 100%;
}

.chart-toggle {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
}
</style>
