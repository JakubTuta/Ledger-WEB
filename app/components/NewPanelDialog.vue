<template>
  <v-dialog
    v-model="isOpen"
    max-width="500"
    :fullscreen="$vuetify.display.smAndDown"
    persistent
  >
    <v-card>
      <v-card-title class="text-h6">
        Create New Panel
      </v-card-title>

      <v-card-text>
        <v-form
          ref="formRef"
          v-model="isFormValid"
          @submit.prevent="handleCreate"
        >
          <!-- Panel Name -->
          <v-text-field
            v-model="form.name"
            label="Panel Name"
            variant="outlined"
            :disabled="loading"
            :rules="nameRules"
            validate-on="input"
            hint="A descriptive name for your panel"
            class="mb-4"
          >
            <template #append-inner>
              <v-icon
                v-if="form.name && nameRules.every(rule => rule(form.name) === true)"
                color="success"
              >
                mdi-check-circle
              </v-icon>

              <v-icon
                v-else-if="form.name && nameRules.some(rule => rule(form.name) !== true)"
                color="error"
              >
                mdi-close-circle
              </v-icon>
            </template>
          </v-text-field>

          <!-- Project Select -->
          <v-select
            v-model="form.projectId"
            label="Project"
            variant="outlined"
            :disabled="loading"
            :items="projectOptions"
            item-title="name"
            item-value="id"
            :rules="projectRules"
            hint="Select the project to monitor"
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

          <!-- Panel Type Select -->
          <v-select
            v-model="form.panelType"
            label="Panel Type"
            variant="outlined"
            :disabled="loading"
            :items="panelTypeOptions"
            item-title="label"
            item-value="value"
            :rules="panelTypeRules"
            :hint="selectedPanelTypeDescription || 'Choose what data to display'"
            persistent-hint
            class="mb-4"
          >
            <template #item="{'props': itemProps, item}">
              <v-list-item
                v-bind="itemProps"
                :subtitle="item.raw.description"
                lines="two"
              >
                <template #prepend>
                  <v-icon :icon="item.raw.icon" />
                </template>
              </v-list-item>
            </template>

            <template #selection="{item}">
              <v-icon
                :icon="item.raw.icon"
                class="mr-2"
              />

              <span>{{ item.raw.label }}</span>
            </template>
          </v-select>

          <!-- Tracing requirement notice -->
          <v-alert
            v-if="needsTracing"
            type="warning"
            variant="flat"
            density="compact"
            class="mb-4"
          >
            <div class="mb-2">
              <strong>Tracing must be enabled</strong>
              for this project before you can create
              <strong>{{ form.panelType === 'trace_list'
                ? 'Trace List'
                : 'Single Trace' }}</strong>
              panels.
            </div>

            <v-alert
              v-if="tracingError"
              type="error"
              density="compact"
              class="mb-2"
            >
              {{ tracingError }}
            </v-alert>

            <v-btn
              size="small"
              color="warning"
              variant="flat"
              prepend-icon="mdi-toggle-switch"
              :loading="enablingTracing"
              @click="enableTracing"
            >
              Enable tracing
            </v-btn>
          </v-alert>

          <!-- Endpoint URL (conditional) -->
          <v-combobox
            v-if="form.panelType === 'metrics'"
            v-model="form.endpointUrl"
            label="Endpoint URL"
            variant="outlined"
            :disabled="loading || !form.projectId"
            :items="availableRoutes"
            :rules="endpointUrlRules"
            validate-on="input"
            :hint="availableRoutes.length > 0
              ? 'Select from discovered routes or type a custom path'
              : 'Type an endpoint path (e.g., /api/users)'"
            class="mb-4"
            placeholder="/api/..."
            clearable
            @update:model-value="normalizeEndpointUrl"
          >
            <template #no-data>
              <v-list-item>
                <v-list-item-title>
                  No routes discovered yet. Type a custom path.
                </v-list-item-title>
              </v-list-item>
            </template>
          </v-combobox>

          <!-- Bottleneck Routes Select (conditional) -->
          <v-select
            v-if="form.panelType === 'bottleneck'"
            v-model="form.selectedRoutes"
            label="Routes to Analyze"
            variant="outlined"
            :disabled="loading || !form.projectId"
            :items="availableRoutes"
            :rules="routesRules"
            hint="Select one or more routes to monitor"
            class="mb-4"
            multiple
            chips
            closable-chips
          >
            <template #no-data>
              <v-list-item>
                <v-list-item-title>
                  No routes available for this project
                </v-list-item-title>
              </v-list-item>
            </template>
          </v-select>

          <!-- Bottleneck Statistic Select (conditional) -->
          <v-select
            v-if="form.panelType === 'bottleneck'"
            v-model="form.selectedStatistic"
            label="Statistic"
            variant="outlined"
            :disabled="loading"
            :items="statisticOptions"
            item-title="label"
            item-value="value"
            :rules="statisticRules"
            hint="Choose the metric to analyze"
            class="mb-4"
          >
            <template #item="{'props': itemProps, item}">
              <v-list-item
                v-bind="itemProps"
                :subtitle="item.raw.description"
              />
            </template>
          </v-select>

          <!-- Trace List config (conditional) -->
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

            <v-text-field
              v-model.number="form.traceLimit"
              label="Max results"
              variant="outlined"
              density="compact"
              class="mb-4"
              type="number"
              min="1"
              max="500"
              :rules="traceLimitRules"
            />
          </template>

          <!-- Single Trace config (conditional) -->
          <v-text-field
            v-if="form.panelType === 'trace'"
            v-model="form.traceId"
            label="Trace ID"
            variant="outlined"
            :disabled="loading"
            :rules="traceIdRules"
            validate-on="input"
            hint="The specific trace ID to display"
            class="mb-4"
            clearable
          />

          <!-- Custom Metric config (conditional) -->
          <template v-if="form.panelType === 'custom_metric'">
            <v-autocomplete
              v-model="form.metricName"
              label="Metric name"
              variant="outlined"
              density="compact"
              class="mb-3"
              :items="metricNames"
              :loading="customMetricsStore.namesLoading"
              :rules="metricNameRules"
              clearable
              @update:search="onMetricSearch"
              @update:model-value="onMetricSelected"
            />

            <div
              v-if="tagKeys.length > 0"
              class="mb-3"
            >
              <div class="text-caption text-medium-emphasis mb-2">
                Tag filters
              </div>

              <div
                v-for="key in tagKeys"
                :key="key"
                class="d-flex align-center mb-2 gap-2"
              >
                <span class="text-body-2 w-25">{{ key }}</span>

                <v-select
                  v-model="tagFilter[key]"
                  :items="tagValues(key)"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  placeholder="Any"
                  style="flex: 1;"
                />
              </div>
            </div>

            <v-select
              v-model="form.metricAgg"
              label="Aggregation"
              variant="outlined"
              density="compact"
              class="mb-3"
              :items="aggOptions"
              item-title="label"
              item-value="value"
            />

            <v-btn-toggle
              v-model="form.metricViz"
              mandatory
              density="compact"
              color="primary"
              variant="outlined"
              class="mb-3"
            >
              <v-btn
                value="line"
                size="small"
              >
                <v-icon
                  icon="mdi-chart-line"
                  class="mr-1"
                />
                Line
              </v-btn>

              <v-btn
                value="bar"
                size="small"
              >
                <v-icon
                  icon="mdi-chart-bar"
                  class="mr-1"
                />
                Bar
              </v-btn>

              <v-btn
                value="single_stat"
                size="small"
              >
                <v-icon
                  icon="mdi-numeric"
                  class="mr-1"
                />
                Single Stat
              </v-btn>
            </v-btn-toggle>

            <v-select
              v-model="form.metricStep"
              label="Step (auto)"
              variant="outlined"
              density="compact"
              class="mb-4"
              clearable
              :items="stepOptions"
            />
          </template>

          <!-- Time Range Button -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">
              Time Range <span class="text-error">*</span>
            </div>

            <v-btn
              variant="outlined"
              :color="timeRangeError
                ? 'error'
                : undefined"
              prepend-icon="mdi-clock-outline"
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

            <div
              v-else
              class="text-grey text-caption mt-1"
            >
              Select the time period for this panel
            </div>
          </div>

          <!-- Error Alert -->
          <v-alert
            v-if="error"
            type="error"
            density="compact"
            class="mt-4"
          >
            {{ error }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions>
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
          :loading="loading"
          :disabled="!canSubmit"
          @click="handleCreate"
        >
          Create Panel
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Time Options Dialog -->
    <TimeOptionsDialog
      v-model="timeOptionsDialog"
      @apply="handleTimeRangeApply"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import type { BottleneckStatistic, CreatePanelRequest, CustomMetricAgg, CustomMetricViz, Panel, PanelType, TimeRangePreset } from '~/types/panel'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': [panel: Panel]
}>()

const panelsStore = usePanelsStore()
const projectsStore = useProjectsStore()
const customMetricsStore = useCustomMetricsStore()

const formRef = ref()
const isFormValid = ref(false)
const loading = ref(false)
const error = ref('')
const timeOptionsDialog = ref(false)
const hasAttemptedSubmit = ref(false)

const form = ref<{
  name: string
  projectId: string | null
  panelType: PanelType | null
  endpointUrl: string
  selectedRoutes: string[]
  selectedStatistic: BottleneckStatistic | null
  period: TimeRangePreset | null
  periodFrom: string
  periodTo: string
  // trace_list
  serviceFilter: string
  operationFilter: string
  minDurationMs: number | null
  hasError: boolean | null
  traceLimit: number
  // trace
  traceId: string
  // custom_metric
  metricName: string
  metricAgg: CustomMetricAgg
  metricViz: CustomMetricViz
  metricStep: string
}>({
  name: '',
  projectId: null,
  panelType: null,
  endpointUrl: '',
  selectedRoutes: [],
  selectedStatistic: null,
  period: null,
  periodFrom: '',
  periodTo: '',
  serviceFilter: '',
  operationFilter: '',
  minDurationMs: null,
  hasError: null,
  traceLimit: 50,
  traceId: '',
  metricName: '',
  metricAgg: 'avg',
  metricViz: 'line',
  metricStep: '',
})

const tagFilter = reactive<Record<string, string>>({})

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

const availableRoutes = computed(() => {
  return selectedProject.value?.available_routes || []
})

const selectedPanelTypeDescription = computed(() => {
  return panelTypeOptions.value.find(o => o.value === form.value.panelType)?.description || ''
})

const { tracing, customMetrics } = useProjectFeatures(selectedProject)

const allPanelTypeOptions = [
  {
    label: 'Logs',
    value: 'logs',
    icon: 'mdi-text-box-outline',
    description: 'Stacked bar chart of log volume vs errors over time.',
    requires: null,
  },
  {
    label: 'Metrics',
    value: 'metrics',
    icon: 'mdi-chart-line',
    description: 'Latency lines (min, avg, p95, p99, max) for a specific endpoint.',
    requires: null,
  },
  {
    label: 'Error List',
    value: 'error_list',
    icon: 'mdi-format-list-bulleted',
    description: 'Paginated list of recent errors with stack traces and metadata.',
    requires: null,
  },
  {
    label: 'Bottleneck Analysis',
    value: 'bottleneck',
    icon: 'mdi-speedometer',
    description: 'Grouped bars comparing route latency or request count.',
    requires: null,
  },
  {
    label: 'Error Heatmap',
    value: 'error_heatmap',
    icon: 'mdi-grid',
    description: 'Hour-by-day grid colored by error rate.',
    requires: null,
  },
  {
    label: 'Trace List',
    value: 'trace_list',
    icon: 'mdi-format-list-text',
    description: 'List of recent traces filterable by service, operation, and duration.',
    requires: 'tracing',
  },
  {
    label: 'Single Trace',
    value: 'trace',
    icon: 'mdi-chart-timeline-variant',
    description: 'Pinned waterfall view for a specific trace ID.',
    requires: 'tracing',
  },
  {
    label: 'Custom Metric',
    value: 'custom_metric',
    icon: 'mdi-chart-line-variant',
    description: 'Line, bar, or single-stat panel for a custom metric.',
    requires: 'custom_metrics',
  },
]

const panelTypeOptions = computed(() => allPanelTypeOptions.filter((o) => {
  if (o.requires === 'custom_metrics')
    return customMetrics.value

  return true
}),
)

const needsTracing = computed(() => (form.value.panelType === 'trace' || form.value.panelType === 'trace_list')
  && !!selectedProject.value
  && !tracing.value,
)

const enablingTracing = ref(false)
const tracingError = ref('')

async function enableTracing() {
  if (!selectedProject.value)
    return
  enablingTracing.value = true
  tracingError.value = ''
  const result = await projectsStore.updateFeature(selectedProject.value.project_id, 'tracing', true)
  if (!result.success) {
    tracingError.value = result.error || 'Failed to enable tracing'
  }
  enablingTracing.value = false
}

const statisticOptions = [
  { label: 'Average', value: 'avg', description: 'Average response time in milliseconds' },
  { label: 'Minimum', value: 'min', description: 'Fastest response time' },
  { label: 'Maximum', value: 'max', description: 'Slowest response time' },
  { label: 'Median', value: 'median', description: 'Middle response time value' },
  { label: 'Count', value: 'count', description: 'Number of requests (traffic volume)' },
]

const errorFilterOptions = [
  { label: 'All traces', value: null },
  { label: 'Errors only', value: true },
  { label: 'Success only', value: false },
]

const aggOptions = [
  { label: 'Sum', value: 'sum' },
  { label: 'Average', value: 'avg' },
  { label: 'Rate', value: 'rate' },
  { label: 'P50', value: 'p50' },
  { label: 'P95', value: 'p95' },
  { label: 'P99', value: 'p99' },
]

const stepOptions = ['1m', '5m', '15m', '1h', '1d']

const metricNames = computed(() => customMetricsStore.names)

const tagInfo = computed(() => (form.value.metricName
  ? customMetricsStore.tagsByMetric.get(form.value.metricName)
  : null),
)

const tagKeys = computed(() => tagInfo.value?.keys ?? [])

function tagValues(key: string): string[] {
  return tagInfo.value?.sample_values[key] ?? []
}

function onMetricSearch(val: string) {
  customMetricsStore.fetchNames(val ?? '')
}

function onMetricSelected(name: string | null) {
  if (name)
    customMetricsStore.fetchTags(name)
}

const nameRules = [
  (v: string) => !!v || 'Panel name is required',
  (v: string) => (v && v.length >= 2) || 'Name must be at least 2 characters',
  (v: string) => (v && v.length <= 100) || 'Name must be at most 100 characters',
]

const projectRules = [
  (v: string | null) => !!v || 'Project is required',
]

const panelTypeRules = [
  (v: string | null) => !!v || 'Panel type is required',
]

const endpointUrlRules = [
  (v: string) => !v || v.startsWith('/') || 'Endpoint must start with /',
  (v: string) => !v || v.length <= 500 || 'Endpoint URL is too long',
]

const routesRules = [
  (v: string[]) => (v && v.length > 0) || 'At least one route is required',
]

const statisticRules = [
  (v: BottleneckStatistic | null) => !!v || 'Statistic is required',
]

const traceLimitRules = [
  (v: number) => !!v || 'Required',
  (v: number) => v >= 1 || 'Min 1',
  (v: number) => v <= 500 || 'Max 500',
]

const traceIdRules = [
  (v: string) => !!v?.trim() || 'Trace ID is required',
]

const metricNameRules = [
  (v: string) => !!v?.trim() || 'Metric name is required',
]

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
  if (!hasTimeRange.value) {
    return 'Select Time Range'
  }

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
  if (!isFormValid.value || !hasTimeRange.value)
    return false

  if (needsTracing.value)
    return false

  if (form.value.panelType === 'bottleneck') {
    return form.value.selectedRoutes.length > 0 && !!form.value.selectedStatistic
  }

  if (form.value.panelType === 'trace') {
    return !!form.value.traceId.trim()
  }

  if (form.value.panelType === 'custom_metric') {
    return !!form.value.metricName.trim()
  }

  return true
})

watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    resetForm()
  }
})

watch(() => form.value.projectId, () => {
  form.value.selectedRoutes = []
})

watch(() => form.value.panelType, () => {
  form.value.selectedRoutes = []
  form.value.selectedStatistic = null
})

watch(() => form.value.panelType, (type) => {
  if (type === 'custom_metric') {
    customMetricsStore.fetchNames('')
  }
})

function resetForm() {
  form.value = {
    name: '',
    projectId: null,
    panelType: null,
    endpointUrl: '',
    selectedRoutes: [],
    selectedStatistic: null,
    period: null,
    periodFrom: '',
    periodTo: '',
    serviceFilter: '',
    operationFilter: '',
    minDurationMs: null,
    hasError: null,
    traceLimit: 50,
    traceId: '',
    metricName: '',
    metricAgg: 'avg',
    metricViz: 'line',
    metricStep: '',
  }
  Object.keys(tagFilter).forEach(k => delete tagFilter[k])
  error.value = ''
  hasAttemptedSubmit.value = false
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
    const activeTagFilter = Object.fromEntries(
      Object.entries(tagFilter).filter(([, v]) => !!v),
    )

    const panelData: CreatePanelRequest = {
      name: form.value.name,
      project_id: form.value.projectId,
      type: form.value.panelType,
      endpoint: form.value.panelType === 'metrics'
        ? form.value.endpointUrl || undefined
        : undefined,
      routes: form.value.panelType === 'bottleneck' && form.value.selectedRoutes.length > 0
        ? form.value.selectedRoutes
        : undefined,
      statistic: form.value.panelType === 'bottleneck' && form.value.selectedStatistic
        ? form.value.selectedStatistic
        : undefined,
      // trace_list
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
      limit: form.value.panelType === 'trace_list'
        ? form.value.traceLimit
        : undefined,
      // trace
      trace_id: form.value.panelType === 'trace'
        ? form.value.traceId
        : undefined,
      // custom_metric
      metric_name: form.value.panelType === 'custom_metric'
        ? form.value.metricName
        : undefined,
      tag_filter: form.value.panelType === 'custom_metric' && Object.keys(activeTagFilter).length > 0
        ? activeTagFilter
        : undefined,
      agg: form.value.panelType === 'custom_metric'
        ? form.value.metricAgg
        : undefined,
      viz: form.value.panelType === 'custom_metric'
        ? form.value.metricViz
        : undefined,
      step: form.value.panelType === 'custom_metric' && form.value.metricStep
        ? form.value.metricStep
        : undefined,
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
