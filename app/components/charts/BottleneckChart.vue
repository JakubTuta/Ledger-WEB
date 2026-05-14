<template>
  <div
    class="bottleneck-chart-wrapper"
    :style="{'height': heightStyle}"
  >
    <EChart
      class="bottleneck-chart"
      :option="chartOption"
      :theme="isDark
        ? 'dark'
        : undefined"
      autoresize
    />

    <div class="chart-toggle">
      <v-btn-toggle
        v-model="isCumulative"
        density="compact"
        variant="outlined"
        mandatory
        rounded="lg"
      >
        <v-btn
          :value="false"
          size="x-small"
          title="Separate values per time bucket"
        >
          Separate
        </v-btn>

        <v-btn
          :value="true"
          size="x-small"
          title="Running cumulative total"
        >
          Cumulative
        </v-btn>
      </v-btn-toggle>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BottleneckMetricData, BottleneckMetricsResponse, BottleneckStatistic } from '~/types/panel'
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  metrics?: BottleneckMetricsResponse
  selectedRoutes: string[]
  statistic: BottleneckStatistic
  height?: number | string
}>(), {
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
const isCumulative = ref(false)

const data = computed<BottleneckMetricData[]>(() => props.metrics?.data ?? [])
const isHourly = computed(() => props.metrics?.granularity === 'hourly')

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
  const idx = props.selectedRoutes.indexOf(route)

  return routeColors[idx >= 0
    ? idx % routeColors.length
    : 0]!
}

const timePoints = computed(() => {
  const dates = new Set<string>()
  data.value.forEach(d => dates.add(d.date))
  const sorted = Array.from(dates).sort()

  if (isHourly.value) {
    const pts: string[] = []
    sorted.forEach((date) => {
      for (let h = 0; h < 24; h++) pts.push(`${date}-${h}`)
    })

    return pts
  }

  return sorted
})

function formatTimePoint(tp: string): string {
  const parts = tp.split('-')
  const d = parts[0]!
  const y = d.substring(0, 4)
  const m = d.substring(4, 6)
  const day = d.substring(6, 8)

  return parts[1] !== undefined
    ? `${day}/${m} ${parts[1].padStart(2, '0')}:00`
    : `${day}/${m}/${y}`
}

function getRawValues(route: string): (number | null)[] {
  return timePoints.value.map((tp) => {
    const item = data.value.find((d) => {
      const key = `${d.date}${d.hour != null
        ? `-${d.hour}`
        : ''}`

      return key === tp && d.route === route
    })

    return item?.value ?? null
  })
}

function cumulateNullable(arr: (number | null)[]): (number | null)[] {
  let sum = 0

  return arr.map((v) => {
    if (v === null) {
      return sum > 0
        ? sum
        : null
    }
    sum += v

    return sum
  })
}

function formatValue(v: number): string {
  if (props.statistic === 'count') {
    return v >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : String(Math.round(v))
  }

  return v >= 1000
    ? `${(v / 1000).toFixed(2)}s`
    : `${Math.round(v)}ms`
}

const surfaceColor = computed(() => (isDark.value
  ? '#424242'
  : '#e0e0e0'))
const textColor = computed(() => (isDark.value
  ? 'rgba(255,255,255,0.7)'
  : 'rgba(0,0,0,0.6)'))

const chartOption = computed(() => {
  const categories = timePoints.value.map(formatTimePoint)

  const series = props.selectedRoutes.map((route) => {
    const raw = getRawValues(route)
    const seriesData = isCumulative.value
      ? cumulateNullable(raw)
      : raw

    return {
      name: route,
      type: 'bar',
      data: seriesData,
      itemStyle: { color: getRouteColor(route), borderRadius: [2, 2, 0, 0] },
      emphasis: { itemStyle: { opacity: 0.8 } },
    }
  })

  const yFormatter = props.statistic === 'count'
    ? (v: number) => (v >= 1000
        ? `${(v / 1000).toFixed(0)}k`
        : String(v))
    : (v: number) => (v >= 1000
        ? `${(v / 1000).toFixed(1)}s`
        : `${v}ms`)

  return {
    backgroundColor: 'transparent',
    grid: { top: 8, right: 8, bottom: 56, left: 52, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const label = params[0]?.axisValue ?? ''
        const cumLabel = isCumulative.value
          ? ' (cumul.)'
          : ''
        let html = `<b>${label}</b>`
        for (const p of params) {
          if (p.value != null) {
            html += `<br/><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:4px"></span>${p.seriesName}: ${formatValue(p.value)}${cumLabel}`
          }
        }

        return html
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: textColor.value,
        fontSize: 10,
        rotate: categories.length > 15
          ? 45
          : 0,
        interval: axisInterval(categories.length),
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: surfaceColor.value } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor.value, fontSize: 10, formatter: yFormatter },
      splitLine: { lineStyle: { color: surfaceColor.value, type: 'dashed' } },
    },
    series,
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: textColor.value, fontSize: 10 },
      itemWidth: 10,
      itemHeight: 8,
    },
  }
})

// Reset to separate when routes/data changes so cumulative doesn't carry stale sums
watch(() => props.selectedRoutes, () => { isCumulative.value = false })
watch(() => props.metrics, () => { isCumulative.value = false })
</script>

<style scoped>
.bottleneck-chart-wrapper {
  position: relative;
  width: 100%;
}

.bottleneck-chart {
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
