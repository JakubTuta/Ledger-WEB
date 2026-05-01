<template>
  <VChart
    class="heatmap-chart"
    :option="chartOption"
    :style="{ height: `${height}px` }"
    :theme="isDark ? 'dark' : undefined"
    autoresize
  />
</template>

<script setup lang="ts">
import type { AggregatedMetricData, AggregatedMetricsResponse } from '~/types/panel'
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  metrics?: AggregatedMetricsResponse
  height?: number
}>(), {
  height: 220,
})

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const data = computed<AggregatedMetricData[]>(() => props.metrics?.data ?? [])

const days = computed(() => {
  const set = new Set<string>()
  data.value.forEach(d => set.add(d.date))
  return Array.from(set).sort()
})

function formatDate(dateStr: string): string {
  const y = dateStr.substring(0, 4)
  const m = dateStr.substring(4, 6)
  const d = dateStr.substring(6, 8)
  return `${d}/${m}/${y}`
}

const heatmapData = computed(() => {
  const result: [number, number, number][] = []
  for (const d of data.value) {
    const dayIdx = days.value.indexOf(d.date)
    if (dayIdx === -1) continue
    const hour = d.hour ?? 0
    const errorRate = d.log_count > 0 ? d.error_count / d.log_count : 0
    result.push([hour, dayIdx, Math.round(errorRate * 1000) / 10])
  }
  return result
})

const maxRate = computed(() => {
  const vals = heatmapData.value.map(d => d[2])
  return vals.length > 0 ? Math.max(...vals) : 100
})

const textColor = computed(() => isDark.value ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)')

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  grid: { top: 8, right: 80, bottom: 40, left: 56 },
  tooltip: {
    formatter: (p: any) => {
      const hour = p.data[0]
      const dayLabel = formatDate(days.value[p.data[1]] ?? '')
      const rate = p.data[2]
      return `<b>${dayLabel} ${String(hour).padStart(2, '0')}:00</b><br/>Error rate: ${rate}%`
    },
  },
  xAxis: {
    type: 'category',
    data: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`),
    splitArea: { show: true },
    axisLabel: { color: textColor.value, fontSize: 9 },
  },
  yAxis: {
    type: 'category',
    data: days.value.map(formatDate),
    splitArea: { show: true },
    axisLabel: { color: textColor.value, fontSize: 9 },
  },
  visualMap: {
    min: 0,
    max: Math.max(maxRate.value, 10),
    calculable: true,
    orient: 'vertical',
    right: 0,
    top: 'center',
    textStyle: { color: textColor.value, fontSize: 10 },
    inRange: {
      color: ['#e8f5e9', '#ffeb3b', '#ef5350'],
    },
  },
  series: [{
    name: 'Error Rate %',
    type: 'heatmap',
    data: heatmapData.value,
    label: { show: false },
    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
  }],
}))
</script>

<style scoped>
.heatmap-chart {
  width: 100%;
}
</style>
