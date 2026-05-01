<template>
  <v-dialog
    v-model="isOpen"
    max-width="500"
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
                variant="tonal"
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
            hint="Choose what data to display"
            class="mb-4"
          >
            <template #item="{'props': itemProps, item}">
              <v-list-item v-bind="itemProps">
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
import type { BottleneckStatistic, CreatePanelRequest, Panel, PanelType, TimeRangePreset } from '~/types/panel'

const props = defineProps<{
  modelValue: boolean
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

const availableRoutes = computed(() => {
  return selectedProject.value?.available_routes || []
})

const panelTypeOptions = [
  { label: 'Logs', value: 'logs', icon: 'mdi-text-box-outline' },
  { label: 'Metrics', value: 'metrics', icon: 'mdi-chart-line' },
  { label: 'Error List', value: 'error_list', icon: 'mdi-format-list-bulleted' },
  { label: 'Bottleneck Analysis', value: 'bottleneck', icon: 'mdi-speedometer' },
  { label: 'Error Heatmap', value: 'error_heatmap', icon: 'mdi-grid' },
]

const statisticOptions = [
  { label: 'Average', value: 'avg', description: 'Average response time in milliseconds' },
  { label: 'Minimum', value: 'min', description: 'Fastest response time' },
  { label: 'Maximum', value: 'max', description: 'Slowest response time' },
  { label: 'Median', value: 'median', description: 'Middle response time value' },
  { label: 'Count', value: 'count', description: 'Number of requests (traffic volume)' },
]

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

  if (form.value.panelType === 'bottleneck') {
    return form.value.selectedRoutes.length > 0 && !!form.value.selectedStatistic
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
  }
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
