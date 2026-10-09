<template>
  <div
    class="service-map-chart-wrapper"
    :style="{'height': heightStyle}"
  >
    <EChart
      class="service-map-chart"
      :option="chartOption"
      :theme="isDark
        ? 'dark'
        : undefined"
      autoresize
      @click="handleClick"
    />
  </div>
</template>

<script setup lang="ts">
import type { ServiceEdge, ServiceMapResponse, ServiceNode } from '~/types/services'
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  data?: ServiceMapResponse
  height?: number | string
}>(), {
  height: '100%',
})

const emit = defineEmits<{
  selectService: [service: ServiceNode]
}>()

// Error-rate steps, validated against both surfaces; the label carries the
// number, so meaning never rests on hue alone.
const HEALTHY_COLOR = '#43a047'
const DEGRADED_COLOR = '#ef6c00'
const FAILING_COLOR = '#e53935'
const DEPENDENCY_COLOR = '#78909c'
const DEGRADED_ERROR_RATE = 0.01
const FAILING_ERROR_RATE = 0.05

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const heightStyle = computed(() => (typeof props.height === 'number'
  ? `${props.height}px`
  : props.height))

const textColor = computed(() => (isDark.value
  ? 'rgba(255,255,255,0.85)'
  : 'rgba(0,0,0,0.75)'))

function errorRate(item: { calls: number, errors: number }): number {
  return item.calls > 0
    ? item.errors / item.calls
    : 0
}

function healthColor(item: { calls: number, errors: number }): string {
  const rate = errorRate(item)
  if (rate >= FAILING_ERROR_RATE)
    return FAILING_COLOR
  if (rate >= DEGRADED_ERROR_RATE)
    return DEGRADED_COLOR

  return HEALTHY_COLOR
}

function formatCount(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function formatMs(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${value.toFixed(1)} ms`
}

function formatRate(item: { calls: number, errors: number }): string {
  return `${(errorRate(item) * 100).toFixed(2)}%`
}

/** A node with no entry calls of its own: a database or API seen only as a callee. */
function isDependency(node: ServiceNode): boolean {
  return node.calls === 0
}

const maxCalls = computed(() => Math.max(1, ...(props.data?.nodes ?? []).map(node => node.calls), ...(props.data?.edges ?? []).map(edge => edge.calls)))

function scaled(calls: number, min: number, max: number): number {
  return min + (max - min) * Math.log1p(calls) / Math.log1p(maxCalls.value)
}

const chartOption = computed(() => {
  const nodes = props.data?.nodes ?? []
  const edges = props.data?.edges ?? []
  const inboundCalls = new Map<string, number>()
  for (const edge of edges)
    inboundCalls.set(edge.callee, (inboundCalls.get(edge.callee) ?? 0) + edge.calls)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => (params.dataType === 'edge'
        ? edgeTooltip(params.data.edge as ServiceEdge)
        : nodeTooltip(params.data.node as ServiceNode)),
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        force: { repulsion: 420, edgeLength: [90, 180], gravity: 0.08 },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 9,
        label: {
          show: true,
          position: 'bottom',
          color: textColor.value,
          fontSize: 11,
          formatter: (params: any) => params.data.node.service,
        },
        data: nodes.map(node => ({
          name: node.service,
          node,
          symbol: isDependency(node)
            ? 'roundRect'
            : 'circle',
          symbolSize: scaled(isDependency(node)
            ? inboundCalls.get(node.service) ?? 0
            : node.calls, 18, 56),
          itemStyle: {
            color: isDependency(node)
              ? DEPENDENCY_COLOR
              : healthColor(node),
          },
        })),
        links: edges.map(edge => ({
          source: edge.caller,
          target: edge.callee,
          edge,
          lineStyle: {
            width: scaled(edge.calls, 1, 6),
            color: healthColor(edge),
            curveness: 0.12,
            opacity: 0.8,
          },
        })),
        emphasis: { focus: 'adjacency', lineStyle: { width: 6 } },
      },
    ],
  }
})

function nodeTooltip(node: ServiceNode): string {
  if (isDependency(node))
    return `<b>${node.service}</b><br/>called by instrumented services (no spans of its own)`

  return `<b>${node.service}</b><br/>${formatCount(node.calls)} requests · ${formatRate(node)} errors<br/>p95 ${formatMs(node.p95_ms)}`
}

function edgeTooltip(edge: ServiceEdge): string {
  return `<b>${edge.caller} → ${edge.callee}</b><br/>${formatCount(edge.calls)} calls · ${formatRate(edge)} errors<br/>p95 ${formatMs(edge.p95_ms)}`
}

function handleClick(params: any) {
  if (params?.dataType === 'node' && params.data?.node)
    emit('selectService', params.data.node as ServiceNode)
}
</script>
