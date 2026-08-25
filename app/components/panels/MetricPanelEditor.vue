<template>
  <v-dialog
    v-model="dialogOpen"
    max-width="620"
  >
    <v-card>
      <v-card-title class="text-subtitle-1">
        Configure metric panel
      </v-card-title>

      <v-card-text>
        <v-alert
          v-if="namesError"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          {{ namesError }}

          <template #append>
            <v-btn
              size="small"
              variant="text"
              :loading="namesLoading"
              @click="() => metricsStore.fetchNames(panel.project_id, true)"
            >
              Retry
            </v-btn>
          </template>
        </v-alert>

        <v-alert
          v-else-if="!namesLoading && metricNames.length === 0"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          This project has not received any custom metrics yet. Emit one with
          <code>ledger.metric_increment("orders_processed")</code>, then reopen
          this dialog.
        </v-alert>

        <v-autocomplete
          v-model="form.metric_name"
          :items="metricNameItems"
          :loading="namesLoading"
          item-title="title"
          item-value="value"
          label="Metric"
          placeholder="Pick a metric this project has sent"
          density="comfortable"
          clearable
          class="mb-2"
        >
          <template #item="{'props': itemProps, item}">
            <v-list-item
              v-bind="itemProps"
              :subtitle="item.raw.subtitle"
            />
          </template>
        </v-autocomplete>

        <v-select
          v-model="form.metric_aggregation"
          :items="aggregationItems"
          label="Aggregation"
          density="comfortable"
          class="mb-2"
        />

        <v-select
          v-model="form.metric_interval"
          :items="intervalItems"
          label="Bucket size"
          density="comfortable"
          clearable
          hint="Leave empty to pick automatically from the panel's time range"
          persistent-hint
          class="mb-4"
        />

        <v-select
          v-model="form.metric_group_by"
          :items="tagKeyItems"
          :loading="tagsLoading"
          :disabled="!form.metric_name || tagKeyItems.length === 0"
          label="Split into series by tag"
          density="comfortable"
          multiple
          chips
          closable-chips
          :hint="groupByHint"
          persistent-hint
          class="mb-4"
        />

        <div class="text-caption text-medium-emphasis mb-2">
          Filter by tag
        </div>

        <div
          v-for="tagKey in tagKeys"
          :key="tagKey.key"
          class="mb-2"
        >
          <v-select
            v-model="form.metric_tag_filters[tagKey.key]"
            :items="tagKey.values"
            :label="tagKey.key"
            density="compact"
            clearable
            :hint="tagKey.truncated
              ? 'Showing the most common values only'
              : undefined"
            :persistent-hint="tagKey.truncated"
          />
        </div>

        <div
          v-if="form.metric_name && tagKeys.length === 0 && !tagsLoading"
          class="text-caption text-medium-emphasis"
        >
          This metric has no tags.
        </div>
      </v-card-text>

      <v-card-actions>
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
          :disabled="!form.metric_name"
          @click="handleSave"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { MetricAggregation, MetricInterval } from '~/types/metrics'
import type { Panel } from '~/types/panel'
import { aggregationsFor, METRIC_INTERVALS, metricKindLabel } from '~/types/metrics'

const props = defineProps<{
  modelValue: boolean
  panel: Panel
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const metricsStore = useMetricsStore()
const panelsStore = usePanelsStore()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const saving = ref(false)

const form = reactive({
  metric_name: null as string | null,
  metric_aggregation: 'avg' as MetricAggregation,
  metric_group_by: [] as string[],
  metric_tag_filters: {} as Record<string, string | null>,
  metric_interval: null as MetricInterval | null,
})

const metricNames = computed(() => metricsStore.getNames(props.panel.project_id).value)
const namesLoading = computed(() => metricsStore.isNamesLoading(props.panel.project_id).value)
const namesError = computed(() => metricsStore.getNamesError(props.panel.project_id).value)

const selectedMetric = computed(() => metricNames.value.find(metric => metric.name === form.metric_name))

const tagKeys = computed(() => (form.metric_name
  ? metricsStore.getTags(props.panel.project_id, form.metric_name).value
  : []))
const tagsLoading = computed(() => (form.metric_name
  ? metricsStore.isTagsLoading(props.panel.project_id, form.metric_name).value
  : false))

const metricNameItems = computed(() => metricNames.value.map(metric => ({
  title: metric.name,
  value: metric.name,
  subtitle: `${metricKindLabel(metric.type)} · ${metric.series_count} series`,
})))

const aggregationItems = computed(() => {
  const kind = selectedMetric.value?.type ?? 'gauge'

  return aggregationsFor(kind).map(aggregation => ({
    title: aggregation,
    value: aggregation,
  }))
})

const intervalItems = METRIC_INTERVALS.map(interval => ({ title: interval, value: interval }))

const tagKeyItems = computed(() => tagKeys.value.map(tagKey => tagKey.key))

const groupByHint = computed(() => {
  if (!form.metric_name)
    return 'Pick a metric first'
  if (tagKeyItems.value.length === 0)
    return 'This metric has no tags to split by'

  return 'One line per distinct value of the chosen tags'
})

watch(() => props.panel, (panel) => {
  form.metric_name = panel.metric_name ?? null
  form.metric_aggregation = (panel.metric_aggregation as MetricAggregation) ?? 'avg'
  form.metric_group_by = [...(panel.metric_group_by ?? [])]
  form.metric_tag_filters = { ...(panel.metric_tag_filters ?? {}) }
  form.metric_interval = (panel.metric_interval as MetricInterval) ?? null
}, { immediate: true })

watch(dialogOpen, (open) => {
  if (open)
    metricsStore.fetchNames(props.panel.project_id)
})

watch(() => form.metric_name, (name, previous) => {
  if (name)
    metricsStore.fetchTags(props.panel.project_id, name)

  // A tag key on the old metric almost certainly does not exist on the new one,
  // so carrying the selections over would silently query for nothing.
  if (previous !== null && name !== previous) {
    form.metric_group_by = []
    form.metric_tag_filters = {}
  }

  const allowed = aggregationsFor(selectedMetric.value?.type ?? 'gauge')
  if (!allowed.includes(form.metric_aggregation))
    form.metric_aggregation = allowed[0] as MetricAggregation
})

async function handleSave() {
  saving.value = true

  try {
    const tagFilters = Object.fromEntries(
      Object.entries(form.metric_tag_filters).filter(([, value]) => !!value),
    ) as Record<string, string>

    await panelsStore.updatePanel(props.panel.id, {
      metric_name: form.metric_name,
      metric_aggregation: form.metric_aggregation,
      metric_group_by: form.metric_group_by,
      metric_tag_filters: tagFilters,
      metric_interval: form.metric_interval,
    } as any)

    emit('saved')
    dialogOpen.value = false
  }
  finally {
    saving.value = false
  }
}
</script>
