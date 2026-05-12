<template>
  <div
    class="w-100"
    style="min-height: 200px;"
  >
    <div
      v-if="spans.length === 0"
      class="d-flex align-center justify-center pa-4 text-medium-emphasis"
    >
      <span>No spans</span>
    </div>
    <EChart
      v-else
      class="w-100"
      :style="{ height: `${chartHeight}px` }"
      :option="chartOption"
      :theme="isDark ? 'dark' : undefined"
      autoresize
      @click="handleClick"
    />
  </div>
</template>

<script setup lang="ts">
import type { Span } from '~/types/traces'
import { useTheme } from 'vuetify'

const props = defineProps<{
  spans: Span[]
}>()

const emit = defineEmits<{
  select: [span: Span]
}>()

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.current.value.dark)

const ROW_HEIGHT = 28
const MIN_HEIGHT = 200

interface FlatSpan {
  span: Span
  depth: number
  rowIndex: number
}

// Build tree and flatten with depth
const flatSpans = computed<FlatSpan[]>(() => {
  const byId = new Map<string, Span>()
  const children = new Map<string, Span[]>()

  for (const span of props.spans) {
    byId.set(span.span_id, span)
    const parentId = span.parent_span_id ?? 'root'
    if (!children.has(parentId)) children.set(parentId, [])
    children.get(parentId)!.push(span)
  }

  // Find roots (no parent or parent not in set)
  const roots = props.spans.filter(s => !s.parent_span_id || !byId.has(s.parent_span_id))

  const result: FlatSpan[] = []
  let rowIndex = 0

  function visit(span: Span, depth: number) {
    result.push({ span, depth, rowIndex: rowIndex++ })
    const kids = children.get(span.span_id) ?? []
    kids.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    for (const child of kids) visit(child, depth + 1)
  }

  roots.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  for (const root of roots) visit(root, 0)
  return result
})

const chartHeight = computed(() =>
  Math.max(MIN_HEIGHT, flatSpans.value.length * ROW_HEIGHT + 40),
)

const traceStart = computed(() => {
  if (flatSpans.value.length === 0) return 0
  return Math.min(...flatSpans.value.map(f => new Date(f.span.start_time).getTime()))
})

function spanColor(span: Span): string {
  if (span.status === 'ERROR') return '#f44336'
  if (span.status === 'OK') return '#78909c'
  return '#bdbdbd'
}

const chartOption = computed(() => {
  const data = flatSpans.value.map((f) => {
    const start = new Date(f.span.start_time).getTime() - traceStart.value
    const dur = f.span.duration_ms
    const label = `${'  '.repeat(f.depth)}${f.span.name} ${dur}ms`
    return {
      value: [f.rowIndex, start, start + dur, f.span.name],
      itemStyle: { color: spanColor(f.span) },
      label: { show: true, formatter: label, fontSize: 11, position: 'insideLeft' },
      _spanId: f.span.span_id,
    }
  })

  const yCategories = flatSpans.value.map(f =>
    f.span.service_name ?? f.span.name.slice(0, 20),
  )

  const useDataZoom = flatSpans.value.length > 500

  return {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: (params: any) => {
        const f = flatSpans.value[params.value[0]]
        if (!f) return ''
        const { span } = f
        const attrs = Object.entries(span.attributes ?? {}).slice(0, 5)
          .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`)
          .join('<br/>')
        return `
          <b>${span.name}</b><br/>
          Service: ${span.service_name ?? '—'}<br/>
          Duration: ${span.duration_ms}ms<br/>
          Status: ${span.status}<br/>
          ${attrs}
        `
      },
    },
    grid: {
      top: 8,
      right: 16,
      bottom: useDataZoom ? 60 : 16,
      left: 120,
      containLabel: false,
    },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => `${v}ms`, fontSize: 10 },
      min: 0,
    },
    yAxis: {
      type: 'category',
      data: yCategories,
      inverse: true,
      axisLabel: { fontSize: 10, width: 110, overflow: 'truncate' },
    },
    series: [
      {
        type: 'custom',
        renderItem: (_params: any, api: any) => {
          const rowIndex = api.value(0)
          const startMs = api.value(1)
          const endMs = api.value(2)
          const startCoord = api.coord([startMs, rowIndex])
          const endCoord = api.coord([endMs, rowIndex])
          const barHeight = Math.min(ROW_HEIGHT - 4, 20)
          return {
            type: 'rect',
            shape: {
              x: startCoord[0],
              y: startCoord[1] - barHeight / 2,
              width: Math.max(endCoord[0] - startCoord[0], 2),
              height: barHeight,
            },
            style: api.style(),
          }
        },
        data,
        encode: { x: [1, 2], y: 0 },
      },
    ],
    dataZoom: useDataZoom
      ? [{ type: 'slider', yAxisIndex: 0, start: 0, end: Math.min(100, (20 / flatSpans.value.length) * 100) }]
      : [],
  }
})

function handleClick(params: any) {
  if (!params.data?._spanId) return
  const f = flatSpans.value.find(s => s.span.span_id === params.data._spanId)
  if (f) emit('select', f.span)
}
</script>
