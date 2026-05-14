<template>
  <v-dialog
    v-model="dialogOpen"
    max-width="520"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span>Configure Metric Panel</span>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="dialogOpen = false"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-autocomplete
          v-model="form.metric_name"
          label="Metric name"
          variant="outlined"
          density="compact"
          class="mb-3"
          :items="metricNames"
          :loading="customMetricsStore.namesLoading"
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
          v-model="form.agg"
          label="Aggregation"
          variant="outlined"
          density="compact"
          class="mb-3"
          :items="aggOptions"
          item-title="label"
          item-value="value"
        />

        <v-btn-toggle
          v-model="form.viz"
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
          v-model="form.step"
          label="Step (auto)"
          variant="outlined"
          density="compact"
          clearable
          :items="stepOptions"
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3">
        <v-spacer />

        <v-btn
          variant="text"
          @click="dialogOpen = false"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          @click="handleSave"
        >
          Apply
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Panel } from '~/types/panel'

const props = defineProps<{
  modelValue: boolean
  panel: Panel
  projectId: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const customMetricsStore = useCustomMetricsStore()
const panelsStore = usePanelsStore()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const saving = ref(false)

const form = reactive({
  metric_name: props.panel.metric_name ?? '',
  agg: props.panel.agg ?? 'avg',
  viz: props.panel.viz ?? 'line',
  step: props.panel.step ?? '',
})

const tagFilter = reactive<Record<string, string>>({ ...(props.panel.tag_filter ?? {}) })

watch(() => props.panel, (p) => {
  form.metric_name = p.metric_name ?? ''
  form.agg = p.agg ?? 'avg'
  form.viz = p.viz ?? 'line'
  form.step = p.step ?? ''
  Object.keys(tagFilter).forEach(k => delete tagFilter[k])
  Object.assign(tagFilter, p.tag_filter ?? {})
})

const metricNames = computed(() => customMetricsStore.names)

const tagInfo = computed(() => (form.metric_name
  ? customMetricsStore.tagsByMetric.get(form.metric_name)
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

const aggOptions = [
  { label: 'Sum', value: 'sum' },
  { label: 'Average', value: 'avg' },
  { label: 'Rate', value: 'rate' },
  { label: 'P50', value: 'p50' },
  { label: 'P95', value: 'p95' },
  { label: 'P99', value: 'p99' },
]

const stepOptions = ['1m', '5m', '15m', '1h', '1d']

async function handleSave() {
  saving.value = true
  try {
    const activeTagFilter = Object.fromEntries(
      Object.entries(tagFilter).filter(([, v]) => !!v),
    )
    await panelsStore.updatePanel(props.panel.id, {
      metric_name: form.metric_name || null,
      agg: form.agg as any,
      viz: form.viz as any,
      step: form.step || null,
      tag_filter: Object.keys(activeTagFilter).length > 0
        ? activeTagFilter
        : null,
    } as any)
    emit('saved')
    dialogOpen.value = false
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  customMetricsStore.fetchNames('')
  if (props.panel.metric_name) {
    customMetricsStore.fetchTags(props.panel.metric_name)
  }
})
</script>
