<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span class="text-h6">{{ isEdit
          ? 'Edit alert rule'
          : 'New alert rule' }}</span>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="close"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form
          ref="formRef"
          @submit.prevent="handleSubmit"
        >
          <v-text-field
            v-model="name"
            label="Name"
            variant="outlined"
            density="compact"
            :rules="[v => !!v || 'Name required']"
            class="mb-3"
          />

          <v-select
            v-model="projectId"
            label="Project"
            variant="outlined"
            density="compact"
            :items="projectOptions"
            item-title="name"
            item-value="id"
            :rules="[v => !!v || 'Project required']"
            hide-details
            class="mb-3"
          />

          <div class="text-overline mb-1">
            Severity
          </div>

          <div class="d-flex mb-3 gap-2">
            <v-card
              v-for="opt in severityOptions"
              :key="opt.value"
              :variant="severity === opt.value
                ? 'tonal'
                : 'outlined'"
              :color="severity === opt.value
                ? opt.color
                : undefined"
              class="d-flex flex-column align-center flex-grow-1 cursor-pointer pa-2"
              @click="severity = opt.value"
            >
              <v-icon
                :icon="opt.icon"
                :color="opt.color"
                size="20"
              />

              <span class="text-caption mt-1">{{ opt.title }}</span>
            </v-card>
          </div>

          <v-select
            v-model="metric"
            label="Metric"
            variant="outlined"
            density="compact"
            :items="metricOptions"
            item-title="label"
            item-value="key"
            :rules="[v => !!v || 'Metric required']"
            class="my-3"
            @update:model-value="onMetricChange"
          />

          <div class="d-flex mb-1 gap-3">
            <v-select
              v-model="comparator"
              label="Operator"
              variant="outlined"
              density="compact"
              :items="comparatorOptions"
              item-title="title"
              item-value="value"
              style="max-width: 170px"
              hide-details
            />

            <v-text-field
              v-model.number="threshold"
              label="Value"
              type="number"
              variant="outlined"
              density="compact"
              :rules="[v => v !== null && v !== '' || 'Value required']"
              hide-details
            />

            <v-select
              v-model="unit"
              label="Unit"
              variant="outlined"
              density="compact"
              :items="unitOptions"
              style="max-width: 110px"
              hide-details
            />
          </div>

          <div class="text-overline mb-1 mt-4">
            Send to
          </div>

          <div
            v-if="connectorOptions.length === 0"
            class="text-caption text-medium-emphasis mb-2"
          >
            No connectors yet. Connect one on the Alerts page first.
          </div>

          <div class="d-flex flex-wrap gap-2">
            <v-chip
              v-for="c in connectorOptions"
              :key="c.id"
              :color="connectorIds.includes(c.id)
                ? 'primary'
                : undefined"
              :variant="connectorIds.includes(c.id)
                ? 'flat'
                : 'outlined'"
              :prepend-icon="kindIcon(c.kind)"
              link
              @click="toggleConnector(c.id)"
            >
              {{ c.name }}

              <v-icon
                v-if="connectorIds.includes(c.id)"
                icon="mdi-check"
                size="14"
                class="ml-1"
              />
            </v-chip>
          </div>

          <div
            v-if="connectorError"
            class="text-caption text-error mt-1"
          >
            Select at least one connector
          </div>

          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2"
            :text="errorMessage"
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3">
        <v-spacer />

        <v-btn
          variant="text"
          @click="close"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          @click="handleSubmit"
        >
          {{ isEdit
            ? 'Save'
            : 'Create rule' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { AlertComparator, AlertRule, AlertUnit, ConnectorKind } from '~/types/alerts'
import { METRIC_CATALOG } from '~/types/alerts'

const props = defineProps<{
  modelValue: boolean
  defaultProjectId: number | null
  rule?: AlertRule
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'saved': []
}>()

const alertsStore = useAlertsStore()
const projectsStore = useProjectsStore()
const { projects } = storeToRefs(projectsStore)
const { connectors } = storeToRefs(alertsStore)

const formRef = ref()
const name = ref('')
const projectId = ref<number | null>(null)
const severity = ref(1)
const metric = ref('')
const comparator = ref<AlertComparator>('>')
const threshold = ref<number | null>(null)
const unit = ref<AlertUnit>('count')
const connectorIds = ref<number[]>([])
const saving = ref(false)
const errorMessage = ref('')
const connectorError = ref(false)

const isEdit = computed(() => !!props.rule)

const projectOptions = computed(() => projects.value.map(p => ({ id: p.project_id, name: p.name })))
const severityOptions = [
  { title: 'Critical', value: 2, icon: 'mdi-fire', color: 'error' },
  { title: 'Warning', value: 1, icon: 'mdi-alert', color: 'warning' },
  { title: 'Info', value: 0, icon: 'mdi-information', color: 'info' },
]
const metricOptions = METRIC_CATALOG
const comparatorOptions = [
  { title: 'more than', value: '>' },
  { title: 'less than', value: '<' },
  { title: 'more or equal', value: '>=' },
  { title: 'less or equal', value: '<=' },
]
const connectorOptions = computed(() => connectors.value.filter(c => c.enabled))

function kindIcon(kind: ConnectorKind): string {
  return { webhook: 'mdi-webhook', email: 'mdi-email', in_app: 'mdi-bell' }[kind]
}

function toggleConnector(id: number) {
  if (connectorIds.value.includes(id))
    connectorIds.value = connectorIds.value.filter(x => x !== id)
  else
    connectorIds.value = [...connectorIds.value, id]
  if (connectorIds.value.length > 0)
    connectorError.value = false
}

const unitOptions = computed<AlertUnit[]>(() => {
  const def = METRIC_CATALOG.find(m => m.key === metric.value)

  return def
    ? def.units
    : ['count']
})

watch(() => props.modelValue, (open) => {
  if (open)
    resetForm()
})

function resetForm() {
  errorMessage.value = ''
  connectorError.value = false
  if (props.rule) {
    name.value = props.rule.name
    projectId.value = props.rule.project_id
    severity.value = props.rule.severity
    metric.value = props.rule.metric
    comparator.value = props.rule.comparator
    threshold.value = props.rule.threshold
    unit.value = props.rule.unit
    connectorIds.value = [...props.rule.connector_ids]
  }
  else {
    name.value = ''
    projectId.value = props.defaultProjectId
    severity.value = 1
    metric.value = METRIC_CATALOG[0]!.key
    comparator.value = '>'
    threshold.value = null
    unit.value = METRIC_CATALOG[0]!.units[0]!
    connectorIds.value = []
  }
}

function onMetricChange() {
  if (!unitOptions.value.includes(unit.value))
    unit.value = unitOptions.value[0]!
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid)
    return
  if (connectorIds.value.length === 0) {
    connectorError.value = true

    return
  }

  saving.value = true
  errorMessage.value = ''

  const result = isEdit.value
    ? await alertsStore.updateRule(props.rule!.id, props.rule!.project_id, {
        name: name.value,
        metric: metric.value,
        comparator: comparator.value,
        threshold: threshold.value!,
        unit: unit.value,
        severity: severity.value,
        connector_ids: connectorIds.value,
      })
    : await alertsStore.createRule({
        project_id: projectId.value!,
        name: name.value,
        metric: metric.value,
        comparator: comparator.value,
        threshold: threshold.value!,
        unit: unit.value,
        severity: severity.value,
        connector_ids: connectorIds.value,
      })

  saving.value = false

  if (result.success) {
    emit('saved')
    close()
  }
  else {
    errorMessage.value = result.error || 'Failed to save rule'
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>
