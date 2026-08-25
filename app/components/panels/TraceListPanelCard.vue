<template>
  <BasePanelCard
    :panel="panel"
    :project="project"
    :exporting="isExporting"
    icon="mdi-format-list-text"
    icon-color="info"
    @refresh="handleRefresh"
    @delete="emit('delete')"
    @time-options="emit('timeOptions')"
    @expand="emit('expand')"
    @export-data="format => exportPanel(format, buildExport)"
  >
    <template #content>
      <div
        v-if="isLoading && traces.length === 0"
        class="d-flex align-center justify-center pa-6"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </div>

      <!--
        Fetch failed: must not render the "no traces yet, set up your SDK"
        onboarding block, which would blame the user's integration for a
        server-side failure.
      -->
      <v-alert
        v-else-if="listError && traces.length === 0"
        type="error"
        variant="tonal"
        density="compact"
        class="ma-3"
      >
        {{ listError }}

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

      <!-- Empty state with SDK setup guidance -->
      <div
        v-else-if="!isLoading && traces.length === 0"
        class="d-flex flex-column align-center justify-center gap-3 pa-6 text-center"
      >
        <v-icon
          icon="mdi-timeline-outline"
          size="40"
          color="medium-emphasis"
        />

        <div>
          <div class="text-body-2 font-weight-medium mb-1">
            No traces yet
          </div>

          <div class="text-caption text-medium-emphasis mb-3">
            Traces are collected via OpenTelemetry — from the Ledger Python SDK or any
            OTel SDK pointed at this project.
          </div>

          <v-sheet
            color="surface-variant"
            rounded
            class="mb-3 pa-3 text-left"
            style="font-family: monospace; font-size: 12px;"
          >
            <div>from ledger import LedgerClient</div>

            <div class="mt-1">
              client = LedgerClient(api_key="ledger_...")
            </div>

            <div class="mt-1">
              with client.tracer.start_as_current_span("operation"):
            </div>

            <div class="ml-4">
              ...
            </div>
          </v-sheet>

          <div class="text-caption text-medium-emphasis mb-3">
            Or from any other language's OpenTelemetry SDK:
            <code>OTEL_EXPORTER_OTLP_ENDPOINT</code>

            + <code>Authorization: Bearer ledger_...</code>
          </div>

          <v-btn
            href="https://github.com/JakubTuta/ledger-sdk#tracing"
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            size="small"
            color="primary"
            append-icon="mdi-open-in-new"
          >
            See setup guide
          </v-btn>
        </div>
      </div>

      <TraceList
        v-else
        :traces="traces"
        :is-loading="isLoading"
        :has-more="hasMore"
        :offset="offset"
        @pin-trace="handlePinTrace"
        @load-page="handleLoadPage"
      />
    </template>

    <template #footer>
      <div class="d-flex align-center gap-2 pa-2">
        <v-chip
          v-if="panel.service_filter"
          size="x-small"
          variant="flat"
          color="info"
        >
          {{ panel.service_filter }}
        </v-chip>

        <v-chip
          v-if="panel.has_error === true"
          size="x-small"
          variant="flat"
          color="error"
        >
          errors only
        </v-chip>

        <v-chip
          v-if="panel.min_duration_ms"
          size="x-small"
          variant="flat"
        >
          &gt;{{ panel.min_duration_ms }}ms
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

  <TraceListPanelEditor
    v-model="configOpen"
    :panel="panel"
    @saved="handleRefresh"
  />

  <v-snackbar
    v-model="pinSnackbar"
    timeout="2500"
    color="info"
    location="bottom right"
  >
    {{ pinSnackbarMessage }}
  </v-snackbar>

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
import type { CreatePanelRequest, Panel } from '~/types/panel'
import type { Project } from '~/types/project'

const props = defineProps<{
  panel: Panel
  project?: Project
}>()

const emit = defineEmits<{
  delete: []
  timeOptions: []
  expand: []
}>()

const configOpen = ref(false)
const pinSnackbar = ref(false)
const pinSnackbarMessage = ref('')

const tracesStore = useTracesStore()
const panelsStore = usePanelsStore()

const traces = computed(() => tracesStore.getListForPanel(props.panel.id).value)
const isLoading = computed(() => tracesStore.isListLoading(props.panel.id).value)
const listError = computed(() => tracesStore.getListError(props.panel.id).value)
const hasMore = computed(() => tracesStore.getListHasMore(props.panel.id).value)
const offset = computed(() => tracesStore.getListOffset(props.panel.id).value)

const { isExporting, exportError, exportPanel } = usePanelExport(() => props.panel, () => props.project)

const showExportError = computed({
  get: () => !!exportError.value,
  set: (v: boolean) => {
    if (!v)
      exportError.value = ''
  },
})

async function buildExport(): Promise<PanelExportBuildResult> {
  const { truncated } = await tracesStore.fetchAllListForPanel(props.panel.id, buildFilters())
  const rows = tracesStore.getListForPanel(props.panel.id).value.map(t => ({ ...t }))

  return {
    rows,
    summary: { total_rows: rows.length },
    extraMeta: buildFilters(),
    truncated,
  }
}

function buildFilters() {
  const now = new Date()

  return {
    project_id: props.panel.project_id,
    service: props.panel.service_filter,
    operation: props.panel.operation_filter,
    min_duration_ms: props.panel.min_duration_ms,
    has_error: props.panel.has_error,
    from: props.panel.periodFrom || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    to: props.panel.periodTo || now.toISOString(),
  }
}

async function handleRefresh() {
  await tracesStore.fetchList(props.panel.id, buildFilters(), true, 0)
}

async function handleLoadPage(newOffset: number) {
  await tracesStore.fetchList(props.panel.id, buildFilters(), false, newOffset)
}

async function handlePinTrace(payload: { trace_id: string }) {
  const existing = panelsStore.findTracePanelByTraceId(payload.trace_id)

  if (existing) {
    pinSnackbarMessage.value = 'Trace panel already pinned'
    pinSnackbar.value = true
    await nextTick()
    const el = document.getElementById(`panel-${existing.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    return
  }

  const hasPeriod = !!props.panel.period
  const hasDates = !!props.panel.periodFrom && !!props.panel.periodTo

  const newPanel: CreatePanelRequest = {
    name: `Trace ${payload.trace_id.slice(0, 8)}…`,
    type: 'trace',
    project_id: props.panel.project_id,
    trace_id: payload.trace_id,
    index: panelsStore.panels.length,
    period: hasPeriod
      ? props.panel.period
      : (hasDates
          ? null
          : 'last7days'),
    periodFrom: hasDates && !hasPeriod
      ? props.panel.periodFrom
      : null,
    periodTo: hasDates && !hasPeriod
      ? props.panel.periodTo
      : null,
  }

  const result = await panelsStore.createPanel(newPanel)

  if (result.success && result.panel) {
    pinSnackbarMessage.value = 'Trace panel created'
    pinSnackbar.value = true
    await nextTick()
    const el = document.getElementById(`panel-${result.panel.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

onMounted(() => {
  tracesStore.fetchList(props.panel.id, buildFilters())
})
</script>
