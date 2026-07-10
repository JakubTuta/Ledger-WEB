<template>
  <div
    class="usage-history-chart-wrapper"
    :style="{'height': heightStyle}"
  >
    <EChart
      class="usage-history-chart"
      :option="chartOption"
      :theme="isDark
        ? 'dark'
        : undefined"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import type { UsageStatsDay } from '~/types/quota'
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  usage?: UsageStatsDay[]
  days?: number
  height?: number | string
}>(), {
  usage: () => [],
  days: 30,
  height: '100%',
})

const heightStyle = computed(() => (typeof props.height === 'number'
  ? `${props.height}px`
  : props.height))

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const surfaceColor = computed(() => (isDark.value
  ? '#424242'
  : '#e0e0e0'))
const textColor = computed(() => (isDark.value
  ? 'rgba(255,255,255,0.7)'
  : 'rgba(0,0,0,0.6)'))

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const zeroFilledDays = computed<UsageStatsDay[]>(() => {
  const byDate = new Map(props.usage.map(day => [day.date, day]))

  const result: UsageStatsDay[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  for (let i = props.days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const date = isoDate(d)

    result.push(byDate.get(date) ?? {
      date,
      log_count: 0,
      span_count: 0,
      metric_point_count: 0,
      logs_daily_quota: 0,
      spans_daily_quota: 0,
      metrics_daily_quota: 0,
      logs_quota_used_percent: 0,
      spans_quota_used_percent: 0,
      metrics_quota_used_percent: 0,
    })
  }

  return result
})

const xAxisData = computed(() => zeroFilledDays.value.map((d) => {
  const [, m, day] = d.date.split('-')

  return `${day}/${m}`
}))

const chartOption = computed(() => {
  const logData = zeroFilledDays.value.map(d => d.log_count)
  const spanData = zeroFilledDays.value.map(d => d.span_count)
  const metricData = zeroFilledDays.value.map(d => d.metric_point_count)
  const logPercent = zeroFilledDays.value.map(d => d.logs_quota_used_percent)
  const spanPercent = zeroFilledDays.value.map(d => d.spans_quota_used_percent)
  const metricPercent = zeroFilledDays.value.map(d => d.metrics_quota_used_percent)

  const rotate = xAxisData.value.length > 20
    ? 45
    : 0

  return {
    backgroundColor: 'transparent',
    grid: { top: 8, right: 8, bottom: 56, left: 48, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const label = params[0]?.axisValue ?? ''
        const index = params[0]?.dataIndex ?? 0
        let html = `<b>${label}</b>`
        html += `<br/>Logs: ${logData[index]?.toLocaleString()} (${logPercent[index]}%)`
        html += `<br/>Spans: ${spanData[index]?.toLocaleString()} (${spanPercent[index]}%)`
        html += `<br/>Metrics: ${metricData[index]?.toLocaleString()} (${metricPercent[index]}%)`

        return html
      },
    },
    xAxis: {
      type: 'category',
      data: xAxisData.value,
      axisLabel: {
        color: textColor.value,
        fontSize: 10,
        rotate,
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
          ? `${(v / 1000).toFixed(0)}k`
          : String(v)),
      },
      splitLine: { lineStyle: { color: surfaceColor.value, type: 'dashed' } },
    },
    series: [
      {
        name: 'Logs',
        type: 'bar',
        data: logData,
        itemStyle: { color: '#42a5f5', borderRadius: [2, 2, 0, 0] },
        emphasis: { itemStyle: { opacity: 0.8 } },
      },
      {
        name: 'Spans',
        type: 'bar',
        data: spanData,
        itemStyle: { color: '#ab47bc', borderRadius: [2, 2, 0, 0] },
        emphasis: { itemStyle: { opacity: 0.8 } },
      },
      {
        name: 'Metrics',
        type: 'bar',
        data: metricData,
        itemStyle: { color: '#ffa726', borderRadius: [2, 2, 0, 0] },
        emphasis: { itemStyle: { opacity: 0.8 } },
      },
    ],
    legend: {
      bottom: 0,
      textStyle: { color: textColor.value, fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
  }
})
</script>

<style scoped>
.usage-history-chart-wrapper {
  position: relative;
  width: 100%;
}

.usage-history-chart {
  width: 100%;
  height: 100%;
}
</style>
