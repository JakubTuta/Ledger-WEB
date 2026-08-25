<template>
  <ListPanelCard
    v-if="panel.type === 'error_list'"
    :panel="panel"
    :project="project"
    :items="panelsStore.getErrorsForPanel(panel.id)"
    :loading="panelsStore.isErrorsLoading(panel.id)"
    :has-more="panelsStore.getErrorsHasMore(panel.id)"
    :offset="panelsStore.getErrorsOffset(panel.id)"
    :error="panelsStore.getErrorsError(panel.id)"
    :disabled="disabled"
    type="error_list"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @refresh="() => panelsStore.fetchErrorsForPanel(panel)"
    @load-page="(offset) => panelsStore.fetchErrorsForPanel(panel, offset)"
  />

  <ListPanelCard
    v-else-if="panel.type === 'logs'"
    :panel="panel"
    :project="project"
    :items="panelsStore.getLogsForPanel(panel.id)"
    :loading="panelsStore.isLogsLoading(panel.id)"
    :has-more="panelsStore.getLogsHasMore(panel.id)"
    :offset="panelsStore.getLogsOffset(panel.id)"
    :error="panelsStore.getLogsError(panel.id)"
    :disabled="disabled"
    type="logs"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @refresh="() => panelsStore.fetchLogsForPanel(panel)"
    @load-page="(offset) => panelsStore.fetchLogsForPanel(panel, offset)"
  />

  <ListPanelCard
    v-else-if="panel.type === 'bottleneck'"
    :panel="panel"
    :project="project"
    :items="panelsStore.getBottleneckListForPanel(panel.id)"
    :loading="panelsStore.isBottleneckListLoading(panel.id)"
    :has-more="panelsStore.getBottleneckListHasMore(panel.id)"
    :max-value="panelsStore.getBottleneckListMeta(panel.id)?.max_value ?? 0"
    :error="panelsStore.getBottleneckListError(panel.id)"
    :disabled="disabled"
    type="bottleneck"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @refresh="() => panelsStore.fetchBottleneckListForPanel(panel)"
    @load-page="() => panelsStore.fetchBottleneckListForPanel(panel, {'append': true})"
  />

  <HeatmapPanelCard
    v-else-if="panel.type === 'error_heatmap'"
    :panel="panel"
    :project="project"
    :metrics="panelsStore.getMetricsForPanel(panel.id)"
    :loading="panelsStore.isMetricsLoading(panel.id)"
    :error="panelsStore.getMetricsError(panel.id)"
    :disabled="disabled"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @refresh="() => panelsStore.fetchMetricsForPanel(panel)"
  />

  <TracePanelCard
    v-else-if="panel.type === 'trace'"
    :panel="panel"
    :project="project"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
  />

  <TraceListPanelCard
    v-else-if="panel.type === 'trace_list'"
    :panel="panel"
    :project="project"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
  />

  <SummaryPanel
    v-else-if="panel.type === 'summary'"
    :panel="panel"
    :project="project"
    :metrics="panelsStore.getMetricsForPanel(panel.id)"
    :loading="panelsStore.isMetricsLoading(panel.id)"
    :error="panelsStore.getMetricsError(panel.id)"
    :disabled="disabled"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @refresh="() => panelsStore.fetchMetricsForPanel(panel)"
  />

  <LatencyOverviewPanel
    v-else-if="panel.type === 'latency_overview'"
    :panel="panel"
    :project="project"
    :metrics="panelsStore.getMetricsForPanel(panel.id)"
    :loading="panelsStore.isMetricsLoading(panel.id)"
    :error="panelsStore.getMetricsError(panel.id)"
    :disabled="disabled"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @refresh="() => panelsStore.fetchMetricsForPanel(panel)"
  />

  <CountryMapPanel
    v-else-if="panel.type === 'country_map'"
    :panel="panel"
    :project="project"
    :countries="panelsStore.getCountryBreakdownForPanel(panel.id)"
    :loading="panelsStore.isCountryBreakdownLoading(panel.id)"
    :error="panelsStore.getCountryBreakdownError(panel.id)"
    :disabled="disabled"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @refresh="() => panelsStore.fetchCountryBreakdownForPanel(panel)"
  />

  <PanelCard
    v-else
    :panel="panel"
    :project="project"
    :metrics="panelsStore.getMetricsForPanel(panel.id)"
    :loading="panelsStore.isMetricsLoading(panel.id)"
    :error="panelsStore.getMetricsError(panel.id)"
    :disabled="disabled"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @refresh="() => panelsStore.fetchMetricsForPanel(panel)"
  />
</template>

<script setup lang="ts">
import type { Panel } from '~/types/panel'

const props = defineProps<{
  panel: Panel
  disabled?: boolean
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  expand: []
}>()

const panelsStore = usePanelsStore()
const projectsStore = useProjectsStore()

const project = computed(() => projectsStore.projects.find(p => String(p.project_id) === props.panel.project_id))
</script>
