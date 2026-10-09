<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    :exporting="isExporting"
    icon="mdi-chart-multiline"
    icon-color="primary"
    @refresh="handleRefresh"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @export-data="format => exportPanel(format, buildExport)"
  >
    <template #content>
      <div
        v-if="isLoading && !data"
        class="d-flex align-center justify-center pa-6"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </div>

      <v-alert
        v-else-if="loadError"
        type="error"
        variant="tonal"
        density="compact"
        class="ma-3"
      >
        {{ loadError }}

        <template #append>
          <v-btn
            size="small"
            variant="text"
            :loading="isLoading"
            @click="handleRefresh"
          >
            Retry
          </v-btn>
        </template>
      </v-alert>

      <div
        v-else-if="!data?.series.length"
        class="d-flex flex-column align-center justify-center gap-2 pa-6 text-center"
      >
        <v-icon
          icon="mdi-chart-multiline"
          size="40"
          color="medium-emphasis"
        />

        <div class="text-body-2 font-weight-medium">
          No requests in this time range
        </div>

        <div class="text-caption text-medium-emphasis">
          Rate, errors and duration come from traces: each server span (or trace
          root) is one request.
        </div>
      </div>

      <div
        v-else
        class="d-flex flex-column fill-height"
      >
        <div class="d-flex align-center gap-2 px-2 pt-2">
          <v-btn-toggle
            v-model="metric"
            density="compact"
            variant="outlined"
            mandatory
          >
            <v-btn
              value="rate"
              size="x-small"
            >
              Rate
            </v-btn>

            <v-btn
              value="errors"
              size="x-small"
            >
              Errors
            </v-btn>

            <v-btn
              value="duration"
              size="x-small"
            >
              Duration
            </v-btn>
          </v-btn-toggle>

          <v-chip
            v-if="panel.service_filter"
            size="small"
            closable
            color="info"
            variant="tonal"
            :disabled="updating"
            @click:close="setService(null)"
          >
            {{ panel.service_filter }}
          </v-chip>
        </div>

        <RedChart
          :data="data"
          :metric="metric"
          class="flex-grow-1"
          height="100%"
        />

        <v-table
          density="compact"
          class="red-table"
        >
          <thead>
            <tr>
              <th class="text-caption">
                {{ panel.service_filter
                  ? 'Operation'
                  : 'Service' }}
              </th>

              <th class="text-caption text-right">
                Rate
              </th>

              <th class="text-caption text-right">
                Errors
              </th>

              <th class="text-caption text-right">
                p95
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="series in data.series"
              :key="`${series.service}|${series.operation}`"
              :class="{'cursor-pointer': !panel.service_filter}"
              :title="panel.service_filter
                ? undefined
                : 'Break down by operation'"
              @click="!panel.service_filter && setService(series.service)"
            >
              <td class="text-caption text-truncate">
                {{ series.operation ?? series.service }}
              </td>

              <td class="text-caption text-right">
                {{ formatRate(series.calls) }}
              </td>

              <td
                class="text-caption text-right"
                :class="{'text-error': errorRate(series) >= 5}"
              >
                {{ errorRate(series).toFixed(2) }}%
              </td>

              <td class="text-caption text-right">
                {{ formatMs(series.p95_ms) }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>

    <template #footer>
      <div class="d-flex align-center flex-wrap gap-2 pa-2">
        <v-chip
          v-if="data"
          size="x-small"
          variant="tonal"
        >
          {{ data.interval }} buckets
        </v-chip>

        <v-chip
          v-if="isClamped"
          size="x-small"
          variant="tonal"
          color="warning"
          prepend-icon="mdi-information-outline"
          :title="`RED metrics cover at most ${MAX_SERVICE_WINDOW_DAYS} days`"
        >
          last {{ MAX_SERVICE_WINDOW_DAYS }} days
        </v-chip>
      </div>
    </template>
  </BasePanelCard>
</template>

<script setup lang="ts">
import type { PanelExportBuildResult } from '~/composables/usePanelExport'
import type { Panel } from '~/types/panel'
import type { Project } from '~/types/project'
import type { RedMetric, RedSeries } from '~/types/services'
import { MAX_SERVICE_WINDOW_DAYS } from '~/types/services'

const props = defineProps<{
  panel: Panel
  project?: Project
  disabled?: boolean
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  expand: []
}>()

const servicesStore = useServicesStore()
const panelsStore = usePanelsStore()

const metric = ref<RedMetric>('rate')
const updating = ref(false)

const data = computed(() => servicesStore.getRed(props.panel.id).value)
const isLoading = computed(() => servicesStore.isLoading(props.panel.id).value)
const loadError = computed(() => servicesStore.getError(props.panel.id).value)
const isClamped = computed(() => servicesStore.isClamped(props.panel.id).value)

const windowMinutes = computed(() => {
  if (!data.value)
    return 1

  return Math.max(1, (new Date(data.value.to_time).getTime() - new Date(data.value.from_time).getTime()) / 60_000)
})

const { isExporting, exportPanel } = usePanelExport(() => props.panel, () => props.project)

function errorRate(series: RedSeries): number {
  return series.calls > 0
    ? series.errors / series.calls * 100
    : 0
}

function formatRate(calls: number): string {
  return `${(calls / windowMinutes.value).toLocaleString(undefined, { maximumFractionDigits: 1 })}/min`
}

function formatMs(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${value.toFixed(1)} ms`
}

function buildExport(): PanelExportBuildResult {
  const rows = (data.value?.series ?? []).flatMap(series => series.points.map(point => ({
    service: series.service,
    operation: series.operation,
    ...point,
  })))

  return {
    rows,
    summary: { total_rows: rows.length },
    extraMeta: { service: props.panel.service_filter ?? null, interval: data.value?.interval },
  }
}

async function setService(service: string | null) {
  updating.value = true
  try {
    await panelsStore.updatePanel(props.panel.id, { service_filter: service })
  }
  finally {
    updating.value = false
  }
}

async function handleRefresh() {
  await servicesStore.fetchRedForPanel(props.panel)
}

watch(
  () => [props.panel.service_filter, props.panel.period, props.panel.periodFrom, props.panel.periodTo],
  () => handleRefresh(),
)

onMounted(() => handleRefresh())
</script>

<style scoped>
.red-table {
  max-height: 40%;
  overflow-y: auto;
}
</style>
