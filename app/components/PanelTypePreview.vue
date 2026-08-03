<template>
  <div class="panel-preview">
    <!-- logs: stacked request rows -->
    <svg
      v-if="type === 'logs'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        v-for="(row, i) in logRows"
        :key="i"
      >
        <rect
          :x="0"
          :y="i * 10 + 2"
          width="3"
          height="7"
          :fill="row.color"
          rx="1"
        />

        <rect
          :x="6"
          :y="i * 10 + 3"
          :width="row.method"
          height="5"
          :fill="row.color"
          rx="1"
          opacity="0.7"
        />

        <rect
          :x="6 + row.method + 3"
          :y="i * 10 + 4"
          :width="row.path"
          height="3"
          fill="currentColor"
          opacity="0.2"
          rx="1"
        />

        <rect
          :x="74"
          :y="i * 10 + 4"
          :width="row.dur"
          height="3"
          fill="currentColor"
          opacity="0.25"
          rx="1"
        />
      </g>
    </svg>

    <!-- errors / traffic: blue+red bar chart with error-rate line -->
    <svg
      v-else-if="type === 'errors'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        v-for="(bar, i) in trafficBars"
        :key="i"
      >
        <rect
          :x="i * 11 + 2"
          :y="52 - bar.total - 2"
          width="5"
          :height="bar.total"
          fill="#5b9cf6"
          rx="1"
          opacity="0.7"
        />

        <rect
          :x="i * 11 + 2"
          :y="50 - bar.err"
          width="5"
          :height="bar.err"
          fill="#f87171"
          rx="1"
        />
      </g>

      <polyline
        :points="errorRateLine"
        fill="none"
        stroke="#f87171"
        stroke-width="1.5"
        opacity="0.6"
      />
    </svg>

    <!-- metrics: latency lines -->
    <svg
      v-else-if="type === 'metrics'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        v-for="line in latencyLines"
        :key="line.id"
        :points="line.points"
        fill="none"
        :stroke="line.color"
        stroke-width="1.5"
        opacity="0.85"
      />
    </svg>

    <!-- latency_overview: same as metrics but more lines -->
    <svg
      v-else-if="type === 'latency_overview'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        v-for="line in latencyOverviewLines"
        :key="line.id"
        :points="line.points"
        fill="none"
        :stroke="line.color"
        stroke-width="1.5"
        :opacity="line.opacity"
      />
    </svg>

    <!-- error_list: grouped error rows -->
    <svg
      v-else-if="type === 'error_list'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        v-for="(row, i) in errorListRows"
        :key="i"
      >
        <rect
          :x="0"
          :y="i * 10 + 2"
          width="3"
          height="7"
          fill="#f87171"
          rx="1"
        />

        <rect
          :x="6"
          :y="i * 10 + 3"
          :width="row.badge"
          height="5"
          fill="#f87171"
          rx="1"
          opacity="0.6"
        />

        <rect
          :x="6 + row.badge + 3"
          :y="i * 10 + 4"
          :width="row.msg"
          height="3"
          fill="currentColor"
          opacity="0.2"
          rx="1"
        />

        <rect
          :x="74"
          :y="i * 10 + 4"
          width="4"
          height="3"
          fill="#f87171"
          opacity="0.4"
          rx="1"
        />
      </g>
    </svg>

    <!-- bottleneck: descending horizontal bars -->
    <svg
      v-else-if="type === 'bottleneck'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        v-for="(bar, i) in bottleneckBars"
        :key="i"
      >
        <rect
          :x="0"
          :y="i * 10 + 2"
          width="3"
          height="7"
          :fill="bar.color"
          rx="1"
        />

        <rect
          :x="5"
          :y="i * 10 + 3"
          :width="bar.w"
          height="5"
          :fill="bar.color"
          rx="1"
          opacity="0.65"
        />
      </g>
    </svg>

    <!-- error_heatmap: colored grid -->
    <svg
      v-else-if="type === 'error_heatmap'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        v-for="cell in heatmapCells"
        :key="`${cell.r}-${cell.c}`"
        :x="cell.c * 9 + 1"
        :y="cell.r * 10 + 1"
        width="7"
        height="8"
        :fill="cell.color"
        rx="1"
      />
    </svg>

    <!-- trace_list: trace rows with duration spans -->
    <svg
      v-else-if="type === 'trace_list'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        v-for="(row, i) in traceRows"
        :key="i"
      >
        <rect
          :x="0"
          :y="i * 10 + 2"
          width="3"
          height="7"
          fill="#7c3aed"
          opacity="0.5"
          rx="1"
        />

        <rect
          :x="6"
          :y="i * 10 + 4"
          :width="row.label"
          height="3"
          fill="currentColor"
          opacity="0.25"
          rx="1"
        />

        <rect
          :x="6 + row.label + 2"
          :y="i * 10 + 3"
          :width="row.span"
          height="5"
          fill="#7c3aed"
          rx="1"
          :opacity="0.3 + i * 0.08"
        />
      </g>
    </svg>

    <!-- summary: KPI tiles grid -->
    <svg
      v-else-if="type === 'summary'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        v-for="(tile, i) in summaryTiles"
        :key="i"
      >
        <rect
          :x="tile.x"
          :y="tile.y"
          width="35"
          height="21"
          fill="currentColor"
          opacity="0.06"
          rx="3"
        />

        <rect
          :x="tile.x + 4"
          :y="tile.y + 4"
          :width="tile.vw"
          height="7"
          :fill="tile.color"
          rx="1"
          opacity="0.7"
        />

        <rect
          :x="tile.x + 4"
          :y="tile.y + 14"
          width="18"
          height="3"
          fill="currentColor"
          opacity="0.2"
          rx="1"
        />
      </g>
    </svg>

    <!-- country_map: continent-shaped blobs colored by a request-volume scale -->
    <svg
      v-else-if="type === 'country_map'"
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        v-for="(blob, i) in mapBlobs"
        :key="i"
        :cx="blob.cx"
        :cy="blob.cy"
        :rx="blob.rx"
        :ry="blob.ry"
        :fill="blob.color"
      />
    </svg>

    <!-- fallback -->
    <svg
      v-else
      viewBox="0 0 80 52"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="10"
        y="10"
        width="60"
        height="32"
        fill="currentColor"
        opacity="0.08"
        rx="4"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import type { PanelType } from '~/types/panel'

defineProps<{ type: PanelType }>()

const logRows = [
  { color: '#4ade80', method: 14, path: 36, dur: 6 },
  { color: '#4ade80', method: 18, path: 28, dur: 4 },
  { color: '#facc15', method: 14, path: 32, dur: 8 },
  { color: '#f87171', method: 18, path: 24, dur: 12 },
  { color: '#4ade80', method: 14, path: 30, dur: 5 },
]

const trafficBars = [
  { total: 18, err: 2 },
  { total: 28, err: 4 },
  { total: 22, err: 3 },
  { total: 38, err: 8 },
  { total: 32, err: 5 },
  { total: 24, err: 3 },
  { total: 42, err: 10 },
]

const errorRateLine = trafficBars.map((b, i) => {
  const rate = (b.err / b.total) * 40

  return `${i * 11 + 4},${50 - rate}`
}).join(' ')

const latencyLines = [
  { id: 'avg', color: '#5b9cf6', points: '2,38 15,32 28,26 41,28 54,22 67,20 80,18' },
  { id: 'p95', color: '#f97316', points: '2,46 15,40 28,34 41,36 54,28 67,24 80,20' },
  { id: 'p99', color: '#f87171', points: '2,50 15,44 28,40 41,42 54,34 67,30 80,24' },
]

const latencyOverviewLines = [
  { id: 'min', color: '#4ade80', points: '2,44 20,42 38,40 56,38 74,36', opacity: 0.7 },
  { id: 'avg', color: '#5b9cf6', points: '2,36 20,30 38,26 56,28 74,24', opacity: 0.9 },
  { id: 'p95', color: '#f97316', points: '2,28 20,22 38,18 56,20 74,16', opacity: 0.8 },
  { id: 'p99', color: '#f87171', points: '2,22 20,16 38,10 56,12 74,8', opacity: 0.65 },
]

const errorListRows = [
  { badge: 12, msg: 36 },
  { badge: 16, msg: 28 },
  { badge: 12, msg: 32 },
  { badge: 12, msg: 30 },
  { badge: 16, msg: 26 },
]

const bottleneckBars = [
  { color: '#f87171', w: 66 },
  { color: '#f87171', w: 54 },
  { color: '#facc15', w: 42 },
  { color: '#facc15', w: 32 },
  { color: '#4ade80', w: 20 },
]

const heatmapPattern = [
  [0, 0, 1, 0, 2, 0, 1, 0],
  [0, 1, 0, 2, 1, 0, 0, 2],
  [1, 0, 2, 1, 0, 1, 0, 0],
  [0, 2, 1, 0, 1, 2, 0, 1],
  [0, 0, 0, 1, 0, 1, 2, 0],
]
const heatmapColors = ['#4ade80', '#facc15', '#f87171']
const heatmapCells = heatmapPattern.flatMap((row, r) => row.map((v, c) => ({ r, c, color: heatmapColors[v]! })),
)

const traceRows = [
  { label: 20, span: 38 },
  { label: 16, span: 28 },
  { label: 24, span: 22 },
  { label: 14, span: 32 },
  { label: 18, span: 18 },
]

const mapBlobs = [
  { cx: 16, cy: 14, rx: 10, ry: 7, color: '#5b9cf6' },
  { cx: 40, cy: 12, rx: 7, ry: 6, color: '#93c5fd' },
  { cx: 34, cy: 28, rx: 8, ry: 9, color: '#f87171' },
  { cx: 58, cy: 22, rx: 9, ry: 8, color: '#facc15' },
  { cx: 66, cy: 40, rx: 7, ry: 6, color: '#bfdbfe' },
]

const summaryTiles = [
  { x: 2, y: 2, vw: 20, color: '#5b9cf6' },
  { x: 43, y: 2, vw: 14, color: '#4ade80' },
  { x: 2, y: 28, vw: 16, color: '#f87171' },
  { x: 43, y: 28, vw: 22, color: '#f97316' },
]
</script>

<style scoped>
.panel-preview {
  width: 80px;
  height: 52px;
  flex-shrink: 0;
  color: currentColor;
}
.panel-preview svg {
  width: 100%;
  height: 100%;
}
</style>
