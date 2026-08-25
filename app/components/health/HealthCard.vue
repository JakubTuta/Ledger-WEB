<template>
  <v-card
    class="health-card"
    :class="[
      `health-card--${derivedStatus}`,
      {'health-card--selected': selected},
    ]"
    variant="elevated"
    elevation="2"
    hover
    @click="emit('click', summary.project_id)"
  >
    <!-- Status bar -->
    <div
      class="health-status-bar"
      :class="`bg-${statusColor}`"
    />

    <!-- Selected indicator -->
    <div
      v-if="selected"
      class="health-card__selected-badge"
    >
      <v-icon
        size="14"
        color="white"
      >
        mdi-check
      </v-icon>
    </div>

    <v-card-text class="pa-3">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-title-large font-weight-bold text-on-surface text-truncate">
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
        :color="environment === 'production'
          ? 'error'
          : 'primary'"
        variant="flat"
        class="mb-3"
      >
        {{ environment || 'unknown' }}
      </v-chip>

      <!-- Metrics -->
      <div class="d-flex justify-space-between mb-2">
        <v-tooltip
          location="top"
          text="Error Rate — percentage of requests that resulted in an error over the selected period."
        >
          <template #activator="{'props': tipProps}">
            <div
              v-bind="tipProps"
              class="metric-cell text-center"
            >
              <div
                class="text-body-1 font-weight-bold"
                :class="errorRateClass"
              >
                {{ errorRateDisplay }}
              </div>

              <div class="text-caption text-on-surface">
                Error Rate
              </div>
            </div>
          </template>
        </v-tooltip>

        <v-tooltip
          location="top"
          text="p95 latency — 95% of requests completed faster than this value (response time)."
        >
          <template #activator="{'props': tipProps}">
            <div
              v-bind="tipProps"
              class="metric-cell text-center"
            >
              <div
                class="text-body-1 font-weight-bold"
                :class="p95Class"
              >
                {{ p95Display }}
              </div>

              <div class="text-caption text-on-surface">
                p95
              </div>
            </div>
          </template>
        </v-tooltip>

        <v-tooltip
          location="top"
          text="RPS — average requests per second over the selected period."
        >
          <template #activator="{'props': tipProps}">
            <div
              v-bind="tipProps"
              class="metric-cell text-center"
            >
              <div class="text-body-1 font-weight-bold text-on-surface">
                {{ rpsDisplay }}
              </div>

              <div class="text-caption text-on-surface">
                RPS
              </div>
            </div>
          </template>
        </v-tooltip>
      </div>

      <!-- Sparkline -->
      <v-tooltip
        location="bottom"
        text="Request volume per hour for the last 24 hours."
      >
        <template #activator="{'props': tipProps}">
          <div v-bind="tipProps">
            <Sparkline
              :points="summary.sparkline"
              :color="sparklineColor"
            />
          </div>
        </template>
      </v-tooltip>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { ProjectHealthSummary } from '~/types/health'

const props = defineProps<{
  summary: ProjectHealthSummary
  projectName?: string
  environment?: string
  compact?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  click: [projectId: string]
}>()

// "down" only when there is genuinely no traffic. High error/p95 with live traffic = "degraded".
const derivedStatus = computed(() => {
  const s = props.summary
  const hasTraffic = s.rps > 0.01 || s.sparkline.some(v => v > 0)

  if (!hasTraffic)
    return 'down'

  if (
    s.error_rate >= s.thresholds.error_rate_crit
    || s.p95_ms >= s.thresholds.p95_crit_ms
    || s.error_rate >= s.thresholds.error_rate_warn
    || s.p95_ms >= s.thresholds.p95_warn_ms
  ) {
    return 'degraded'
  }

  return 'healthy'
})

const statusColor = computed(() => {
  switch (derivedStatus.value) {
    case 'degraded': return 'warning'
    case 'down': return 'error'
    default: return 'success'
  }
})

const statusLabel = computed(() => {
  switch (derivedStatus.value) {
    case 'degraded': return 'Degraded'
    case 'down': return 'Down'
    default: return 'Healthy'
  }
})

const sparklineColor = computed(() => {
  switch (derivedStatus.value) {
    case 'degraded': return '#ffa726'
    case 'down': return '#ef5350'
    default: return '#66bb6a'
  }
})

const errorRateDisplay = computed(() => `${(props.summary.error_rate * 100).toFixed(1)}%`)
const p95Display = computed(() => {
  const ms = props.summary.p95_ms

  return ms >= 1000
    ? `${(ms / 1000).toFixed(2)}s`
    : `${Math.round(ms)}ms`
})
const rpsDisplay = computed(() => {
  const r = Number(props.summary.rps) || 0

  if (r >= 100)
    return `${Math.round(r)}`
  if (r >= 1)
    return r.toFixed(1)
  if (r >= 0.01)
    return r.toFixed(2)

  return '< 0.01'
})

const errorRateClass = computed(() => {
  const t = props.summary.thresholds
  if (props.summary.error_rate >= t.error_rate_crit)
    return 'text-error'
  if (props.summary.error_rate >= t.error_rate_warn)
    return 'text-warning'

  return 'text-success'
})

const p95Class = computed(() => {
  const t = props.summary.thresholds
  if (props.summary.p95_ms >= t.p95_crit_ms)
    return 'text-error'
  if (props.summary.p95_ms >= t.p95_warn_ms)
    return 'text-warning'

  return 'text-on-surface'
})
</script>

<style scoped>
.health-card {
  min-width: v-bind("compact
? '200px'
: '240px'");
  max-width: v-bind("compact
? '240px'
: '280px'");
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
  position: relative;
  overflow: hidden;
}

.health-card:hover {
  transform: translateY(-2px);
}

.health-card--selected {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  transform: translateY(-4px) scale(1.03);
  box-shadow:
    0 0 0 5px rgba(var(--v-theme-primary), 0.18),
    0 0 20px 6px rgba(var(--v-theme-primary), 0.22),
    0 10px 24px rgba(0, 0, 0, 0.3) !important;
  z-index: 2;
}

.health-card__selected-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-shadow: 0 2px 6px rgba(var(--v-theme-primary), 0.5);
}

.health-status-bar {
  height: 4px;
  width: 100%;
}

.metric-cell {
  cursor: help;
  flex: 1;
  padding: 0 4px;
}
</style>
