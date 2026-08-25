<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    :exporting="isExporting"
    icon="mdi-chart-line-variant"
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

      <!--
        A failed fetch must not render the "no data yet, set up your SDK" block:
        that would blame the user's integration for a server-side failure.
      -->
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
        v-else-if="!panel.metric_name"
        class="d-flex flex-column align-center justify-center gap-3 pa-6 text-center"
      >
        <v-icon
          icon="mdi-chart-line-variant"
          size="40"
          color="medium-emphasis"
        />

        <div class="text-body-2 font-weight-medium">
          No metric selected
        </div>

        <div class="text-caption text-medium-emphasis">
          Pick which metric this panel charts.
        </div>

        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-cog"
          @click="configOpen = true"
        >
          Choose metric
        </v-btn>
      </div>

      <div
        v-else-if="isEmpty"
        class="d-flex flex-column align-center justify-center gap-3 pa-6 text-center"
      >
        <v-icon
          icon="mdi-chart-line-variant"
          size="40"
          color="medium-emphasis"
        />

        <div>
          <div class="text-body-2 font-weight-medium mb-1">
            No data for "{{ panel.metric_name }}"
          </div>

          <div class="text-caption text-medium-emphasis mb-3">
            Nothing was recorded in this time range. Metrics are exported on an
            interval (60s by default), so a freshly started service takes a
            moment to appear.
          </div>

          <v-sheet
            color="surface-variant"
            rounded
            class="mb-3 pa-3 text-left"
            style="font-family: monospace; font-size: 12px;"
          >
            <div>ledger.metric_increment("{{ panel.metric_name }}")</div>
          </v-sheet>

          <v-btn
            to="/how-to-setup"
            variant="text"
            size="small"
            color="primary"
          >
            See setup guide
          </v-btn>
        </div>
      </div>

      <MetricSeriesChart
        v-else
        :data="data"
        :mode="chartMode"
        height="100%"
      />
    </template>

    <template #options>
      <div class="d-flex flex-column gap-2">
        <v-btn
          size="small"
          variant="text"
          prepend-icon="mdi-cog"
          @click="configOpen = true"
        >
          Configure metric
        </v-btn>

        <v-btn-toggle
          v-if="hasDistribution"
          v-model="chartMode"
          density="compact"
          variant="outlined"
          mandatory
        >
          <v-btn
            value="series"
            size="small"
          >
            Over time
          </v-btn>

          <v-btn
            value="distribution"
            size="small"
          >
            Distribution
          </v-btn>
        </v-btn-toggle>
      </div>
    </template>

    <template #footer>
      <div class="d-flex align-center flex-wrap gap-2 pa-2">
        <v-chip
          v-if="panel.metric_name"
          size="x-small"
          variant="flat"
          color="primary"
        >
          {{ panel.metric_name }}
        </v-chip>

        <v-chip
          size="x-small"
          variant="tonal"
        >
          {{ aggregationLabel }}
        </v-chip>

        <v-chip
          v-if="data"
          size="x-small"
          variant="tonal"
        >
          {{ data.interval }} buckets
        </v-chip>

        <v-chip
          v-for="key in panel.metric_group_by ?? []"
          :key="key"
          size="x-small"
          variant="tonal"
          color="info"
        >
          by {{ key }}
        </v-chip>

        <!--
          A counter arrives as a running total; the server differences it before
          charting. Saying so keeps "12" from being misread as the lifetime count.
        -->
        <v-chip
          v-if="data?.temporality === 'cumulative'"
          size="x-small"
          variant="tonal"
          color="warning"
          prepend-icon="mdi-information-outline"
          title="Stored as a running total; charted as the increase per bucket"
        >
          per-bucket increase
        </v-chip>

        <v-chip
          v-if="data?.downsampled"
          size="x-small"
          variant="tonal"
          prepend-icon="mdi-chart-timeline-variant"
          title="Long range: served from the hourly rollup, so percentiles are unavailable"
        >
          hourly rollup
        </v-chip>

        <v-chip
          v-if="data?.truncated"
          size="x-small"
          variant="tonal"
          color="warning"
          prepend-icon="mdi-alert-outline"
          title="Too many points in range - the chart covers only part of the window"
        >
          partial range
        </v-chip>

        <v-spacer />

        <v-btn
          icon="mdi-cog"
          variant="text"
          size="x-small"
          @click="configOpen = true"
        />
      </div>
    </template>
  </BasePanelCard>

  <MetricPanelEditor
    v-model="configOpen"
    :panel="panel"
    @saved="handleRefresh"
  />

  <v-snackbar
    v-model="showExportError"
    timeout="3000"
    color="error"
    location="bottom right"
  >
    {{ exportError }}
  </v-snackbar>
</template>

<script setup lang="ts">
import type { PanelExportBuildResult } from '~/composables/usePanelExport'
import type { MetricSeriesQuery } from '~/types/metrics'
import type { Panel } from '~/types/panel'
import type { Project } from '~/types/project'

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

const metricsStore = useMetricsStore()

const configOpen = ref(false)
const chartMode = ref<'series' | 'distribution'>('series')

const data = computed(() => metricsStore.getSeries(props.panel.id).value)
const isLoading = computed(() => metricsStore.isSeriesLoading(props.panel.id).value)
const loadError = computed(() => metricsStore.getSeriesError(props.panel.id).value)

const isEmpty = computed(() => !isLoading.value && (data.value?.series.length ?? 0) === 0)
const hasDistribution = computed(() => (data.value?.histograms.length ?? 0) > 0)

const aggregationLabel = computed(() => props.panel.metric_aggregation ?? 'avg')

const { isExporting, exportError, exportPanel } = usePanelExport(() => props.panel, () => props.project)

const showExportError = computed({
  get: () => !!exportError.value,
  set: (value: boolean) => {
    if (!value)
      exportError.value = ''
  },
})

function buildQuery(): MetricSeriesQuery {
  const now = new Date()

  return {
    project_id: props.panel.project_id,
    name: props.panel.metric_name ?? '',
    aggregation: props.panel.metric_aggregation ?? 'avg',
    group_by: props.panel.metric_group_by ?? [],
    tag_filters: props.panel.metric_tag_filters ?? {},
    interval: props.panel.metric_interval ?? null,
    from: props.panel.periodFrom || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    to: props.panel.periodTo || now.toISOString(),
  }
}

function buildExport(): PanelExportBuildResult {
  const rows = (data.value?.series ?? []).flatMap(series => series.points.map(point => ({
    metric: data.value?.name ?? '',
    ...series.tags,
    bucket: point.bucket,
    value: point.value,
  })))

  return {
    rows,
    summary: { total_rows: rows.length },
    extraMeta: {
      metric_name: props.panel.metric_name,
      aggregation: data.value?.aggregation,
      interval: data.value?.interval,
      downsampled: data.value?.downsampled,
    },
    truncated: data.value?.truncated ?? false,
  }
}

async function handleRefresh() {
  if (!props.panel.metric_name) {
    metricsStore.clearPanel(props.panel.id)

    return
  }

  await metricsStore.fetchSeries(props.panel.id, buildQuery(), true)
}

watch(hasDistribution, (available) => {
  if (!available)
    chartMode.value = 'series'
})

watch(
  () => [props.panel.metric_name, props.panel.metric_aggregation, props.panel.metric_interval, props.panel.periodFrom, props.panel.periodTo],
  () => handleRefresh(),
)

onMounted(() => {
  if (props.panel.metric_name)
    metricsStore.fetchSeries(props.panel.id, buildQuery())
})
</script>
