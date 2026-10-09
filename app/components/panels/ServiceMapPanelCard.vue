<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :disabled="disabled"
    :exporting="isExporting"
    icon="mdi-graph-outline"
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

      <!-- A failed fetch must not look like "no services yet". -->
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
        v-else-if="!data?.nodes.length"
        class="d-flex flex-column align-center justify-center gap-2 pa-6 text-center"
      >
        <v-icon
          icon="mdi-graph-outline"
          size="40"
          color="medium-emphasis"
        />

        <div class="text-body-2 font-weight-medium">
          No traces in this time range
        </div>

        <div class="text-caption text-medium-emphasis">
          The map is built from distributed traces: a span whose parent belongs to
          another service becomes an edge between them.
        </div>

        <v-btn
          to="/how-to-setup#tracing"
          variant="text"
          size="small"
          color="primary"
        >
          See setup guide
        </v-btn>
      </div>

      <div
        v-else
        class="d-flex flex-column fill-height"
      >
        <ServiceMapChart
          :data="data"
          class="flex-grow-1"
          height="100%"
          @select-service="node => selected = node"
        />

        <v-sheet
          v-if="selected"
          class="d-flex align-center flex-wrap gap-2 pa-2"
          color="surface-variant"
        >
          <span class="text-caption font-weight-medium">{{ selected.service }}</span>

          <span
            v-if="selected.calls"
            class="text-caption text-medium-emphasis"
          >
            {{ selected.calls.toLocaleString() }} requests · p95 {{ selected.p95_ms.toFixed(1) }} ms
          </span>

          <v-spacer />

          <v-btn
            v-if="selected.calls"
            size="x-small"
            variant="tonal"
            prepend-icon="mdi-chart-multiline"
            :loading="creating === 'service_red'"
            @click="addDrillDown('service_red')"
          >
            RED by operation
          </v-btn>

          <v-btn
            v-if="selected.calls"
            size="x-small"
            variant="tonal"
            prepend-icon="mdi-format-list-text"
            :loading="creating === 'trace_list'"
            @click="addDrillDown('trace_list')"
          >
            Traces
          </v-btn>

          <v-btn
            icon="mdi-close"
            size="x-small"
            variant="text"
            @click="selected = null"
          />
        </v-sheet>
      </div>
    </template>

    <template #footer>
      <div class="d-flex align-center flex-wrap gap-2 pa-2">
        <v-chip
          v-if="data"
          size="x-small"
          variant="tonal"
        >
          {{ data.nodes.length }} services · {{ data.edges.length }} connections
        </v-chip>

        <v-chip
          v-if="data?.downsampled"
          size="x-small"
          variant="tonal"
          prepend-icon="mdi-chart-timeline-variant"
          title="Long range: served from the hourly rollup; p95 is the highest hourly p95"
        >
          hourly rollup
        </v-chip>

        <v-chip
          v-if="isClamped"
          size="x-small"
          variant="tonal"
          color="warning"
          prepend-icon="mdi-information-outline"
          :title="`Service maps cover at most ${MAX_SERVICE_WINDOW_DAYS} days`"
        >
          last {{ MAX_SERVICE_WINDOW_DAYS }} days
        </v-chip>
      </div>
    </template>
  </BasePanelCard>

  <v-snackbar
    v-model="showMessage"
    timeout="3000"
    :color="messageColor"
    location="bottom right"
  >
    {{ message }}
  </v-snackbar>
</template>

<script setup lang="ts">
import type { PanelExportBuildResult } from '~/composables/usePanelExport'
import type { Panel, PanelType } from '~/types/panel'
import type { Project } from '~/types/project'
import type { ServiceNode } from '~/types/services'
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

const selected = ref<ServiceNode | null>(null)
const creating = ref<PanelType | null>(null)
const message = ref('')
const messageColor = ref<'info' | 'error'>('info')

const data = computed(() => servicesStore.getMap(props.panel.id).value)
const isLoading = computed(() => servicesStore.isLoading(props.panel.id).value)
const loadError = computed(() => servicesStore.getError(props.panel.id).value)
const isClamped = computed(() => servicesStore.isClamped(props.panel.id).value)

const showMessage = computed({
  get: () => !!message.value,
  set: (value: boolean) => {
    if (!value)
      message.value = ''
  },
})

const { isExporting, exportError, exportPanel } = usePanelExport(() => props.panel, () => props.project)

watch(exportError, (value) => {
  if (value) {
    messageColor.value = 'error'
    message.value = value
  }
})

function buildExport(): PanelExportBuildResult {
  const rows = [
    ...(data.value?.nodes ?? []).map(node => ({ kind: 'service', ...node })),
    ...(data.value?.edges ?? []).map(edge => ({ kind: 'call', ...edge })),
  ]

  return {
    rows,
    summary: { total_rows: rows.length },
    extraMeta: { from: data.value?.from_time, to: data.value?.to_time, downsampled: data.value?.downsampled },
  }
}

async function addDrillDown(type: 'service_red' | 'trace_list') {
  if (!selected.value)
    return

  creating.value = type
  try {
    const service = selected.value.service
    const result = await panelsStore.createPanel({
      name: type === 'service_red'
        ? `${service} by operation`
        : `${service} traces`,
      type,
      project_id: props.panel.project_id,
      service_filter: service,
      index: panelsStore.panels.length,
      period: props.panel.period ?? null,
      periodFrom: props.panel.periodFrom ?? null,
      periodTo: props.panel.periodTo ?? null,
    })
    messageColor.value = result.success
      ? 'info'
      : 'error'
    message.value = result.success
      ? 'Panel added'
      : result.error ?? 'Could not add the panel'
    if (result.success && result.panel) {
      await nextTick()
      document.getElementById(`panel-${result.panel.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  finally {
    creating.value = null
  }
}

async function handleRefresh() {
  await servicesStore.fetchMapForPanel(props.panel)
}

watch(
  () => [props.panel.period, props.panel.periodFrom, props.panel.periodTo],
  () => handleRefresh(),
)

onMounted(() => handleRefresh())
</script>
