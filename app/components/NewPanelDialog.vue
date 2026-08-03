<template>
  <v-dialog
    v-model="isOpen"
    max-width="560"
    :fullscreen="$vuetify.display.smAndDown"
    persistent
    scrollable
  >
    <v-card>
      <v-card-title class="text-h6 pa-4 pb-2">
        New Panel
      </v-card-title>

      <v-card-text class="pa-4 pt-2">
        <v-form
          ref="formRef"
          v-model="isFormValid"
          @submit.prevent="handleCreate"
        >
          <!-- Title -->
          <v-text-field
            v-model="form.name"
            label="Title"
            variant="outlined"
            density="compact"
            :disabled="loading"
            :rules="nameRules"
            validate-on="input"
            class="mb-4"
          />

          <!-- Panel Type List -->
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis mb-2">
              Type <span class="text-error">*</span>
            </div>

            <div class="panel-type-list">
              <v-card
                v-for="option in panelTypeOptions"
                :key="option.value"
                :variant="form.panelType === option.value
                  ? 'tonal'
                  : 'outlined'"
                :color="form.panelType === option.value
                  ? 'primary'
                  : undefined"
                class="panel-type-row mb-1 cursor-pointer"
                :class="{'row-selected': form.panelType === option.value}"
                @click="form.panelType = option.value as PanelType"
              >
                <div class="d-flex align-center gap-3 pa-2">
                  <v-icon
                    :icon="option.icon"
                    size="20"
                    class="flex-shrink-0"
                    :color="form.panelType === option.value
                      ? 'primary'
                      : undefined"
                  />

                  <div class="min-w-0 flex-grow-1">
                    <div class="text-caption font-weight-medium">
                      {{ option.label }}
                    </div>

                    <div class="text-caption text-medium-emphasis type-description">
                      {{ option.description }}
                    </div>
                  </div>

                  <PanelTypePreview
                    :type="option.value as PanelType"
                    class="flex-shrink-0 opacity-70"
                    :class="{'opacity-100': form.panelType === option.value}"
                  />
                </div>
              </v-card>
            </div>

            <div
              v-if="panelTypeError"
              class="text-error text-caption ml-1 mt-1"
            >
              Panel type is required
            </div>

            <v-alert
              v-if="form.panelType === 'trace_list'"
              type="info"
              variant="tonal"
              density="compact"
              class="mt-2"
              icon="mdi-information-outline"
            >
              Requires SDK tracing.
              <a
                href="https://github.com/ledger-sdk/python#tracing"
                target="_blank"
                class="ml-1"
              >See setup guide.</a>
            </v-alert>
          </div>

          <!-- Project -->
          <v-select
            v-model="form.projectId"
            label="Project"
            variant="outlined"
            density="compact"
            :disabled="loading"
            :items="projectOptions"
            item-title="name"
            item-value="id"
            :rules="projectRules"
            class="mb-4"
          >
            <template #item="{'props': itemProps, item}">
              <v-list-item
                v-bind="itemProps"
                :subtitle="`${item.raw.environment} • ${item.raw.slug}`"
              />
            </template>

            <template #selection="{item}">
              <span>{{ item.raw.name }}</span>

              <v-chip
                size="x-small"
                :color="item.raw.environment === 'production'
                  ? 'error'
                  : 'primary'"
                variant="flat"
                class="ml-2"
              >
                {{ item.raw.environment }}
              </v-chip>
            </template>
          </v-select>

          <!-- Time Range -->
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis mb-2">
              Time Range <span class="text-error">*</span>
            </div>

            <v-btn
              :variant="timeRangeError
                ? 'tonal'
                : 'outlined'"
              :color="timeRangeError
                ? 'error'
                : undefined"
              prepend-icon="mdi-clock-outline"
              size="small"
              class="time-range-btn"
              @click="timeOptionsDialog = true"
            >
              {{ timeRangeLabel }}
            </v-btn>

            <div
              v-if="timeRangeError"
              class="text-error text-caption mt-1"
            >
              {{ timeRangeError }}
            </div>
          </div>

          <!-- Advanced -->
          <v-expansion-panels
            v-if="showAdvanced"
            v-model="advancedOpen"
            variant="accordion"
            class="mb-2"
          >
            <v-expansion-panel value="advanced">
              <v-expansion-panel-title class="text-body-2 font-weight-medium">
                <v-icon
                  icon="mdi-tune"
                  size="16"
                  class="mr-2"
                />
                Advanced
              </v-expansion-panel-title>

              <v-expansion-panel-text class="pt-3">
                <!-- Endpoint URL (metrics) -->
                <v-combobox
                  v-if="form.panelType === 'metrics'"
                  v-model="form.endpointUrl"
                  label="Endpoint URL"
                  variant="outlined"
                  density="compact"
                  :disabled="loading || !form.projectId"
                  :items="availableRoutes"
                  :rules="endpointUrlRules"
                  validate-on="input"
                  :hint="availableRoutes.length > 0
                    ? 'Select from discovered routes or type a custom path'
                    : 'Type an endpoint path (e.g., /api/users)'"
                  class="mb-3"
                  placeholder="/api/..."
                  clearable
                  @update:model-value="normalizeEndpointUrl"
                >
                  <template #no-data>
                    <v-list-item>
                      <v-list-item-title>No routes discovered yet. Type a custom path.</v-list-item-title>
                    </v-list-item>
                  </template>
                </v-combobox>

                <!-- Trace List config -->
                <template v-if="form.panelType === 'trace_list'">
                  <v-text-field
                    v-model="form.serviceFilter"
                    label="Service (optional)"
                    variant="outlined"
                    density="compact"
                    class="mb-3"
                    clearable
                    placeholder="e.g. orders-api"
                  />

                  <v-text-field
                    v-model="form.operationFilter"
                    label="Operation (optional)"
                    variant="outlined"
                    density="compact"
                    class="mb-3"
                    clearable
                    placeholder="e.g. GET /users/{id}"
                  />

                  <v-text-field
                    v-model.number="form.minDurationMs"
                    label="Min duration (ms, optional)"
                    variant="outlined"
                    density="compact"
                    class="mb-3"
                    type="number"
                    min="0"
                    clearable
                    placeholder="e.g. 500"
                  />

                  <v-select
                    v-model="form.hasError"
                    label="Error filter"
                    variant="outlined"
                    density="compact"
                    class="mb-3"
                    :items="errorFilterOptions"
                    item-title="label"
                    item-value="value"
                  />
                </template>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- Error Alert -->
          <v-alert
            v-if="error"
            type="error"
            density="compact"
            class="mt-2"
          >
            {{ error }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4 pt-2">
        <v-spacer />

        <v-btn
          variant="text"
          :disabled="loading"
          @click="handleCancel"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!canSubmit"
          @click="handleCreate"
        >
          Create
        </v-btn>
      </v-card-actions>
    </v-card>

    <TimeOptionsDialog
      v-model="timeOptionsDialog"
      @apply="handleTimeRangeApply"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import type { CreatePanelRequest, Panel, PanelType, TimeRangePreset } from '~/types/panel'

const props = defineProps<{
  modelValue: boolean
  initialProjectId?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': [panel: Panel]
}>()

const panelsStore = usePanelsStore()
const projectsStore = useProjectsStore()

const formRef = ref()
const isFormValid = ref(false)
const loading = ref(false)
const error = ref('')
const timeOptionsDialog = ref(false)
const hasAttemptedSubmit = ref(false)
const advancedOpen = ref<string | undefined>(undefined)

const form = ref<{
  name: string
  projectId: string | null
  panelType: PanelType | null
  endpointUrl: string
  selectedRoutes: string[]
  period: TimeRangePreset | null
  periodFrom: string
  periodTo: string
  serviceFilter: string
  operationFilter: string
  minDurationMs: number | null
  hasError: boolean | null
}>({
  name: '',
  projectId: null,
  panelType: null,
  endpointUrl: '',
  selectedRoutes: [],
  period: 'last7days',
  periodFrom: '',
  periodTo: '',
  serviceFilter: '',
  operationFilter: '',
  minDurationMs: null,
  hasError: null,
})

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const projectOptions = computed(() => projectsStore.projects.map(p => ({
  id: String(p.project_id),
  name: p.name,
  environment: p.environment,
  slug: p.slug,
  availableRoutes: p.available_routes || [],
})))

const selectedProject = computed(() => {
  if (!form.value.projectId)
    return null

  return projectsStore.projects.find(p => String(p.project_id) === form.value.projectId)
})

const availableRoutes = computed(() => selectedProject.value?.available_routes || [])

const allPanelTypeOptions = [
  { label: 'Traffic & Errors', value: 'errors', icon: 'mdi-chart-bar', description: 'Total request volume and error count over time with error-rate trend.' },
  { label: 'Summary KPIs', value: 'summary', icon: 'mdi-view-dashboard-outline', description: 'At-a-glance tiles: total requests, error rate %, avg latency, p95, and throughput.' },
  { label: 'Latency Overview', value: 'latency_overview', icon: 'mdi-chart-timeline-variant', description: 'Project-wide latency lines (avg, p95, p99) aggregated across all endpoints.' },
  { label: 'Endpoint Metrics', value: 'metrics', icon: 'mdi-chart-line', description: 'Latency lines (avg/p95/p99) for one specific endpoint URL.' },
  { label: 'HTTP Request Log', value: 'logs', icon: 'mdi-web', description: 'Live log of HTTP requests with status, method, path, and duration.' },
  { label: 'Error List', value: 'error_list', icon: 'mdi-format-list-bulleted', description: 'Grouped list of recent errors with occurrence counts and stack traces.' },
  { label: 'Bottleneck', value: 'bottleneck', icon: 'mdi-speedometer', description: 'Routes ranked by latency or request count. Click column headers to sort.' },
  { label: 'Error Heatmap', value: 'error_heatmap', icon: 'mdi-grid', description: 'Hour-by-day grid colored by error rate — spot recurring failure patterns.' },
  { label: 'Trace List', value: 'trace_list', icon: 'mdi-format-list-text', description: 'List of recent distributed traces. Click a row to pin it as a trace panel.' },
  { label: 'Country Map', value: 'country_map', icon: 'mdi-map', description: 'World map colored by request volume per country, drills down by continent.' },
]

const panelTypeOptions = allPanelTypeOptions

const showAdvanced = computed(() => {
  const t = form.value.panelType

  return t === 'metrics' || t === 'trace_list'
})

const errorFilterOptions = [
  { label: 'All traces', value: null },
  { label: 'Errors only', value: true },
  { label: 'Success only', value: false },
]

const nameRules = [
  (v: string) => !!v || 'Title is required',
  (v: string) => (v && v.length >= 2) || 'Min 2 characters',
  (v: string) => (v && v.length <= 100) || 'Max 100 characters',
]

const projectRules = [
  (v: string | null) => !!v || 'Project is required',
]

const endpointUrlRules = [
  (v: string) => !v || v.startsWith('/') || 'Endpoint must start with /',
  (v: string) => !v || v.length <= 500 || 'Endpoint URL is too long',
]

const panelTypeError = computed(() => hasAttemptedSubmit.value && !form.value.panelType)

function normalizeEndpointUrl(val: string | null) {
  if (!val)
    return
  const spaceIdx = val.indexOf(' ')
  if (spaceIdx !== -1) {
    form.value.endpointUrl = val.slice(spaceIdx + 1)
  }
}

const hasTimeRange = computed(() => form.value.period || (form.value.periodFrom && form.value.periodTo))

const timeRangeError = computed(() => {
  if (hasAttemptedSubmit.value && !hasTimeRange.value) {
    return 'Time range is required'
  }

  return null
})

const timeRangeLabel = computed(() => {
  if (!hasTimeRange.value)
    return 'Select Time Range'

  if (form.value.period) {
    const presetLabels: Record<TimeRangePreset, string> = {
      today: 'Today',
      last7days: 'Last 7 Days',
      last30days: 'Last 30 Days',
      currentWeek: 'Current Week',
      currentMonth: 'Current Month',
      currentYear: 'Current Year',
    }

    return presetLabels[form.value.period]
  }

  return `${form.value.periodFrom} - ${form.value.periodTo}`
})

const canSubmit = computed(() => {
  if (!isFormValid.value || !hasTimeRange.value || !form.value.panelType)
    return false

  return true
})

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    if (props.initialProjectId) {
      form.value.projectId = props.initialProjectId
    }
  }
  else {
    resetForm()
  }
})

watch(() => form.value.projectId, () => {
  form.value.selectedRoutes = []
})

watch(() => form.value.panelType, () => {
  form.value.selectedRoutes = []
  if (showAdvanced.value) {
    advancedOpen.value = 'advanced'
  }
})

function resetForm() {
  form.value = {
    name: '',
    projectId: null,
    panelType: null,
    endpointUrl: '',
    selectedRoutes: [],
    period: 'last7days',
    periodFrom: '',
    periodTo: '',
    serviceFilter: '',
    operationFilter: '',
    minDurationMs: null,
    hasError: null,
  }
  error.value = ''
  hasAttemptedSubmit.value = false
  advancedOpen.value = undefined
  if (formRef.value) {
    formRef.value.reset()
  }
}

function handleTimeRangeApply(params: { period?: TimeRangePreset, periodFrom?: string, periodTo?: string }) {
  if (params.period && !params.periodFrom && !params.periodTo) {
    form.value.period = params.period
    form.value.periodFrom = ''
    form.value.periodTo = ''
  }
  else if (params.periodFrom && params.periodTo) {
    form.value.period = null
    form.value.periodFrom = params.periodFrom
    form.value.periodTo = params.periodTo
  }
}

async function handleCreate() {
  hasAttemptedSubmit.value = true

  if (!canSubmit.value || loading.value || !form.value.projectId || !form.value.panelType)
    return

  error.value = ''
  loading.value = true

  try {
    const panelData: CreatePanelRequest = {
      name: form.value.name,
      project_id: form.value.projectId,
      type: form.value.panelType,
      endpoint: form.value.panelType === 'metrics'
        ? form.value.endpointUrl || undefined
        : undefined,
      routes: undefined,
      statistic: undefined,
      service_filter: form.value.panelType === 'trace_list'
        ? form.value.serviceFilter || undefined
        : undefined,
      operation_filter: form.value.panelType === 'trace_list'
        ? form.value.operationFilter || undefined
        : undefined,
      min_duration_ms: form.value.panelType === 'trace_list' && form.value.minDurationMs != null
        ? form.value.minDurationMs
        : undefined,
      has_error: form.value.panelType === 'trace_list' && form.value.hasError != null
        ? form.value.hasError
        : undefined,
      trace_id: undefined,
      index: panelsStore.panels.length,
      period: form.value.period || null,
      periodFrom: form.value.period
        ? null
        : form.value.periodFrom || null,
      periodTo: form.value.period
        ? null
        : form.value.periodTo || null,
    }

    const result = await panelsStore.createPanel(panelData)

    if (result.success && result.panel) {
      emit('created', result.panel)
      isOpen.value = false
    }
    else {
      error.value = result.error || 'Failed to create panel'
    }
  }
  catch (err: any) {
    error.value = err.message || 'Failed to create panel'
  }
  finally {
    loading.value = false
  }
}

function handleCancel() {
  isOpen.value = false
}
</script>

<style scoped>
.panel-type-list {
  max-height: 340px;
  overflow-y: auto;
}

.panel-type-row {
  transition: all 0.15s ease;
  user-select: none;
}

.panel-type-row:hover:not(.row-selected) {
  border-color: rgba(var(--v-theme-primary), 0.4) !important;
}

.type-description {
  font-size: 10px;
  line-height: 1.3;
  opacity: 0.85;
}

.time-range-btn {
  width: 100%;
  justify-content: flex-start;
}
</style>
