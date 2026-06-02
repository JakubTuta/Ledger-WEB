<template>
  <div class="trace-waterfall w-100">
    <div
      v-if="spans.length === 0"
      class="d-flex align-center text-medium-emphasis justify-center pa-4"
    >
      <span>No spans</span>
    </div>

    <template v-else>
      <!-- Time axis -->
      <div class="tw-axis">
        <div class="tw-label-col" />

        <div class="tw-bar-col">
          <div
            v-for="(tick, i) in axisTicks"
            :key="i"
            class="tw-tick"
            :style="{'left': `${tick.pct}%`}"
          >
            <span class="tw-tick-label">{{ tick.label }}</span>
          </div>
        </div>
      </div>

      <!-- Span rows -->
      <div
        v-for="f in flatSpans"
        :key="f.span.span_id"
        class="tw-row"
        :class="{'tw-row--error': f.span.status === 'ERROR'}"
        @click="emit('select', f.span)"
      >
        <div class="tw-label-col">
          <div
            class="tw-label-inner"
            :style="{'paddingLeft': `${f.depth * 14}px`}"
          >
            <span class="tw-kind">{{ kindIcon(f.span.kind) }}</span>

            <span
              class="tw-service-dot"
              :style="{'backgroundColor': serviceColor(f.span.service_name ?? '—')}"
            />

            <span class="tw-service">{{ f.span.service_name ?? '—' }}</span>

            <span class="tw-sep">·</span>

            <span class="tw-name">{{ f.span.name }}</span>
          </div>
        </div>

        <div class="tw-bar-col">
          <div
            class="tw-bar"
            :style="{
              'left': `${barLeftPct(f.span)}%`,
              'width': `max(${barWidthPct(f.span)}%, 3px)`,
              'backgroundColor': serviceColor(f.span.service_name ?? '—'),
              'borderColor': f.span.status === 'ERROR'
                ? '#f44336'
                : 'transparent',
            }"
          />

          <span
            class="tw-dur"
            :class="{'tw-dur--inside': isWideBar(f.span)}"
            :style="durStyle(f.span)"
          >
            {{ formatDur(f.span.duration_ms) }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Span } from '~/types/traces'

const props = defineProps<{
  spans: Span[]
}>()

const emit = defineEmits<{
  select: [span: Span]
}>()

const SERVICE_PALETTE = [
  '#42a5f5',
  '#66bb6a',
  '#ab47bc',
  '#ffa726',
  '#26c6da',
  '#ec407a',
  '#7e57c2',
  '#9ccc65',
  '#ef5350',
  '#5c6bc0',
  '#26a69a',
  '#d4e157',
]

const KIND_ICON_MAP: Record<number, string> = {
  0: '∙',
  1: '←',
  2: '→',
  3: '⤴',
  4: '⤵',
}

interface FlatSpan {
  span: Span
  depth: number
}

const flatSpans = computed<FlatSpan[]>(() => {
  const byId = new Map<string, Span>()
  const children = new Map<string, Span[]>()

  for (const span of props.spans) {
    byId.set(span.span_id, span)
    const parentId = span.parent_span_id ?? 'root'
    if (!children.has(parentId))
      children.set(parentId, [])
    children.get(parentId)!.push(span)
  }

  const roots = props.spans.filter(s => !s.parent_span_id || !byId.has(s.parent_span_id))
  const result: FlatSpan[] = []

  function visit(span: Span, depth: number) {
    result.push({ span, depth })
    const kids = children.get(span.span_id) ?? []
    kids.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    for (const child of kids) visit(child, depth + 1)
  }

  roots.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  for (const root of roots) visit(root, 0)

  return result
})

const traceStart = computed(() => {
  if (flatSpans.value.length === 0)
    return 0

  return Math.min(...flatSpans.value.map(f => new Date(f.span.start_time).getTime()))
})

const traceTotal = computed(() => {
  if (flatSpans.value.length === 0)
    return 1
  const end = Math.max(...flatSpans.value.map(f => new Date(f.span.start_time).getTime() + f.span.duration_ms))

  return Math.max(end - traceStart.value, 1)
})

const serviceColors = computed(() => {
  const services = Array.from(new Set(flatSpans.value.map(f => f.span.service_name ?? '—')))
  const map: Record<string, string> = {}
  services.forEach((svc, i) => {
    map[svc] = SERVICE_PALETTE[i % SERVICE_PALETTE.length] ?? '#78909c'
  })

  return map
})

const axisTicks = computed(() => {
  const total = traceTotal.value
  const steps = 5
  const ticks: { pct: number, label: string }[] = []
  for (let i = 0; i <= steps; i++) {
    const ms = (total * i) / steps
    ticks.push({ pct: (i / steps) * 100, label: formatDur(ms) })
  }

  return ticks
})

function serviceColor(name: string): string {
  return serviceColors.value[name] ?? '#78909c'
}

function kindIcon(kind?: number): string {
  return KIND_ICON_MAP[kind ?? 0] ?? '∙'
}

function barLeftPct(span: Span): number {
  const offset = new Date(span.start_time).getTime() - traceStart.value

  return (offset / traceTotal.value) * 100
}

function barWidthPct(span: Span): number {
  return (span.duration_ms / traceTotal.value) * 100
}

function isWideBar(span: Span): boolean {
  return (barLeftPct(span) + barWidthPct(span)) > 85
}

function durStyle(span: Span): Record<string, string> {
  const left = barLeftPct(span)
  const width = barWidthPct(span)
  if (isWideBar(span)) {
    return {
      left: `calc(${left + width}% - 4px)`,
      transform: 'translate(-100%, -50%)',
      color: '#fff',
    }
  }

  return { left: `calc(${left + width}% + 6px)` }
}

function formatDur(ms: number): string {
  if (ms >= 1000)
    return `${(ms / 1000).toFixed(2)}s`
  if (ms < 1 && ms > 0)
    return `${(ms * 1000).toFixed(0)}μs`
  if (ms <= 0)
    return '0'

  return `${ms.toFixed(1)}ms`
}
</script>

<style scoped>
.trace-waterfall {
  font-size: 12px;
}

.tw-axis {
  display: flex;
  align-items: center;
  height: 22px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  position: sticky;
  top: 0;
  background: rgb(var(--v-theme-surface));
  z-index: 2;
}

.tw-row {
  display: flex;
  align-items: center;
  min-height: 28px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.05);
  cursor: pointer;
  transition: background-color 0.12s;
}

.tw-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.tw-row--error {
  background: rgba(244, 67, 54, 0.05);
}

.tw-label-col {
  flex: 0 0 auto;
  min-width: 240px;
  max-width: 50%;
  padding-right: 8px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.tw-label-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: visible;
  padding: 4px 6px;
}

.tw-kind {
  opacity: 0.6;
  font-weight: 600;
  width: 12px;
  text-align: center;
}

.tw-service-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.tw-service {
  font-weight: 600;
  font-size: 11px;
}

.tw-sep {
  opacity: 0.4;
}

.tw-name {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  opacity: 0.85;
}

.tw-bar-col {
  flex: 1 1 auto;
  position: relative;
  height: 22px;
  margin: 0 8px;
}

.tw-bar {
  position: absolute;
  top: 50%;
  height: 14px;
  transform: translateY(-50%);
  border-radius: 2px;
  border: 1px solid transparent;
  box-sizing: border-box;
}

.tw-dur {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  opacity: 0.65;
  white-space: nowrap;
  pointer-events: none;
}

.tw-tick {
  position: absolute;
  top: 0;
  height: 100%;
  border-left: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
}

.tw-tick:first-child {
  border-left: none;
}

.tw-tick-label {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  opacity: 0.55;
  white-space: nowrap;
}
</style>
