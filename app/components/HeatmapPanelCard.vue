<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    icon="mdi-grid"
    icon-color="error"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @refresh="emit('refresh')"
  >
    <template #content>
      <v-card-text class="panel-content-container pa-2">
        <!-- Loading State -->
        <div
          v-if="loading"
          class="d-flex align-center justify-center"
          style="height: 100%;"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>

        <!-- No Data State -->
        <div
          v-else-if="!metrics || metrics.data.length === 0"
          class="text-grey d-flex align-center justify-center"
          style="height: 100%;"
        >
          <div class="text-center">
            <v-icon
              icon="mdi-grid"
              size="48"
              class="mb-2"
            />
            <div class="text-body-2">
              No data available
            </div>
          </div>
        </div>

        <!-- Heatmap -->
        <HeatmapChart
          v-else
          :metrics="metrics"
        />
      </v-card-text>
    </template>

    <template #footer>
      <v-card-actions class="pa-2">
        <div class="d-flex justify-space-between w-100">
          <div class="text-center">
            <div class="text-body-2 font-weight-medium">
              {{ totalLogs.toLocaleString() }}
            </div>
            <div class="text-caption text-grey">
              Total Logs
            </div>
          </div>

          <div class="text-center">
            <div class="text-body-2 font-weight-medium text-error">
              {{ totalErrors.toLocaleString() }}
            </div>
            <div class="text-caption text-grey">
              Errors
            </div>
          </div>

          <div class="text-center">
            <div class="text-body-2 font-weight-medium">
              {{ errorRateDisplay }}
            </div>
            <div class="text-caption text-grey">
              Error Rate
            </div>
          </div>
        </div>
      </v-card-actions>
    </template>
  </BasePanelCard>
</template>

<script setup lang="ts">
import type { AggregatedMetricsResponse, Panel } from '~/types/panel'
import type { Project } from '~/types/project'

const props = defineProps<{
  panel: Panel
  project?: Project
  metrics?: AggregatedMetricsResponse
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  refresh: []
}>()

const data = computed(() => props.metrics?.data ?? [])
const totalLogs = computed(() => data.value.reduce((s, d) => s + d.log_count, 0))
const totalErrors = computed(() => data.value.reduce((s, d) => s + d.error_count, 0))
const errorRateDisplay = computed(() => {
  if (totalLogs.value === 0) return '-'
  return `${((totalErrors.value / totalLogs.value) * 100).toFixed(1)}%`
})
</script>
