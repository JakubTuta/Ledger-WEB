<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    icon="mdi-chart-line-variant"
    icon-color="primary"
    @refresh="handleRefresh"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
  >
    <template #content>
      <div
        v-if="isLoading"
        class="d-flex align-center justify-center pa-6"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </div>

      <div
        v-else-if="!panel.metric_name"
        class="d-flex flex-column align-center justify-center gap-2 pa-6"
      >
        <v-icon
          icon="mdi-chart-line-variant"
          size="36"
          color="medium-emphasis"
        />

        <span class="text-body-2 text-medium-emphasis">No metric configured</span>

        <v-btn
          size="small"
          variant="flat"
          prepend-icon="mdi-cog"
          @click="configOpen = true"
        >
          Configure
        </v-btn>
      </div>

      <CustomMetricChart
        v-else
        :data="seriesData"
        :viz="panel.viz ?? 'line'"
        class="pa-2"
        style="height: 180px;"
      />
    </template>

    <template
      v-if="panel.metric_name"
      #footer
    >
      <div class="d-flex align-center flex-wrap gap-2 pa-2">
        <v-btn-toggle
          :model-value="panel.viz ?? 'line'"
          density="compact"
          variant="outlined"
          mandatory
          @update:model-value="updateViz"
        >
          <v-btn
            value="line"
            size="x-small"
            icon="mdi-chart-line"
            title="Line"
          />

          <v-btn
            value="bar"
            size="x-small"
            icon="mdi-chart-bar"
            title="Bar"
          />

          <v-btn
            value="single_stat"
            size="x-small"
            icon="mdi-numeric"
            title="Single stat"
          />
        </v-btn-toggle>

        <v-chip
          size="x-small"
          variant="flat"
          color="primary"
        >
          {{ panel.agg ?? 'avg' }}
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

  <CustomMetricPanelEditor
    v-model="configOpen"
    :panel="panel"
    :project-id="Number(panel.project_id)"
    @saved="handleConfigSaved"
  />
</template>

<script setup lang="ts">
import type { Panel } from '~/types/panel'
import type { Project } from '~/types/project'

const props = defineProps<{
  panel: Panel
  project?: Project
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
}>()

const customMetricsStore = useCustomMetricsStore()
const panelsStore = usePanelsStore()

const configOpen = ref(false)

const seriesData = computed(() => customMetricsStore.getSeriesForPanel(props.panel.id).value)
const isLoading = computed(() => customMetricsStore.isLoadingPanel(props.panel.id).value)

function buildTimeParams() {
  const now = new Date()
  const from = props.panel.periodFrom || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const to = props.panel.periodTo || now.toISOString()

  return { from, to }
}

async function fetchSeries(force = false) {
  if (!props.panel.metric_name)
    return
  const { from, to } = buildTimeParams()
  await customMetricsStore.fetchSeries(
    props.panel.id,
    {
      name: props.panel.metric_name,
      tags: props.panel.tag_filter,
      agg: props.panel.agg ?? 'avg',
      from,
      to,
      step: props.panel.step,
    },
    force,
  )
}

async function handleRefresh() {
  await fetchSeries(true)
}

async function updateViz(viz: string) {
  await panelsStore.updatePanel(props.panel.id, { viz: viz as any } as any)
}

function handleConfigSaved() {
  fetchSeries(true)
}

onMounted(fetchSeries)

watch(
  () => [props.panel.metric_name, props.panel.agg, props.panel.tag_filter, props.panel.period],
  () => fetchSeries(true),
  { deep: true },
)
</script>
