<template>
  <v-card
    class="health-card"
    :class="`health-card--${summary.status}`"
    variant="outlined"
    hover
    @click="emit('click', summary.project_id)"
  >
    <!-- Status bar -->
    <div
      class="health-status-bar"
      :class="`bg-${statusColor}`"
    />

    <v-card-text class="pa-3">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-subtitle-2 font-weight-medium text-truncate">
          {{ projectName }}
        </div>
        <v-chip
          size="x-small"
          :color="statusColor"
          variant="flat"
          class="ml-1"
        >
          {{ statusLabel }}
        </v-chip>
      </div>

      <!-- Environment chip -->
      <v-chip
        size="x-small"
        :color="environment === 'production' ? 'error' : 'primary'"
        variant="tonal"
        class="mb-3"
      >
        {{ environment || 'unknown' }}
      </v-chip>

      <!-- Metrics -->
      <div class="d-flex justify-space-between mb-2">
        <div class="text-center">
          <div
            class="text-body-2 font-weight-bold"
            :class="errorRateClass"
          >
            {{ errorRateDisplay }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Error Rate
          </div>
        </div>

        <div class="text-center">
          <div
            class="text-body-2 font-weight-bold"
            :class="p95Class"
          >
            {{ p95Display }}
          </div>
          <div class="text-caption text-medium-emphasis">
            p95
          </div>
        </div>

        <div class="text-center">
          <div class="text-body-2 font-weight-bold">
            {{ rpsDisplay }}
          </div>
          <div class="text-caption text-medium-emphasis">
            RPS
          </div>
        </div>
      </div>

      <!-- Sparkline -->
      <Sparkline
        :points="summary.sparkline"
        :color="sparklineColor"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { ProjectHealthSummary } from '~/types/health'

const props = defineProps<{
  summary: ProjectHealthSummary
  projectName?: string
  environment?: string
}>()

const emit = defineEmits<{
  click: [projectId: string]
}>()

const statusColor = computed(() => {
  switch (props.summary.status) {
    case 'healthy': return 'success'
    case 'degraded': return 'warning'
    case 'down': return 'error'
  }
})

const statusLabel = computed(() => {
  switch (props.summary.status) {
    case 'healthy': return 'Healthy'
    case 'degraded': return 'Degraded'
    case 'down': return 'Down'
  }
})

const sparklineColor = computed(() => {
  switch (props.summary.status) {
    case 'healthy': return '#66bb6a'
    case 'degraded': return '#ffa726'
    case 'down': return '#ef5350'
  }
})

const errorRateDisplay = computed(() => `${(props.summary.error_rate * 100).toFixed(1)}%`)
const p95Display = computed(() => {
  const ms = props.summary.p95_ms
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`
})
const rpsDisplay = computed(() => {
  const r = props.summary.rps
  return r >= 100 ? `${Math.round(r)}` : r.toFixed(1)
})

const errorRateClass = computed(() => {
  const t = props.summary.thresholds
  if (props.summary.error_rate >= t.error_rate_crit) return 'text-error'
  if (props.summary.error_rate >= t.error_rate_warn) return 'text-warning'
  return ''
})

const p95Class = computed(() => {
  const t = props.summary.thresholds
  if (props.summary.p95_ms >= t.p95_crit_ms) return 'text-error'
  if (props.summary.p95_ms >= t.p95_warn_ms) return 'text-warning'
  return ''
})
</script>

<style scoped>
.health-card {
  min-width: 180px;
  max-width: 220px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
  position: relative;
  overflow: hidden;
}

.health-card:hover {
  transform: translateY(-2px);
}

.health-status-bar {
  height: 3px;
  width: 100%;
}
</style>
