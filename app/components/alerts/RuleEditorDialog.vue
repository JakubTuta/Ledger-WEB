<template>
  <v-dialog
    v-model="dialogOpen"
    max-width="560"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span>{{ isEdit
          ? 'Edit Rule'
          : 'New Alert Rule' }}</span>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="dialogOpen = false"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form
          ref="formRef"
          @submit.prevent="handleSubmit"
        >
          <v-text-field
            v-model="form.name"
            label="Rule name"
            variant="outlined"
            density="compact"
            class="mb-3"
            :rules="[v => !!v || 'Name is required']"
          />

          <v-select
            v-if="!isEdit"
            v-model="form.metric"
            label="Metric"
            variant="outlined"
            density="compact"
            class="mb-3"
            :items="metricOptions"
            item-title="label"
            item-value="value"
            :rules="[v => !!v || 'Metric is required']"
          />

          <div class="d-flex ga-3 mb-3">
            <v-btn-toggle
              v-if="!isEdit"
              v-model="form.comparator"
              mandatory
              density="compact"
              color="primary"
              variant="outlined"
            >
              <v-btn
                v-for="op in comparatorOptions"
                :key="op"
                :value="op"
                size="small"
              >
                {{ op }}
              </v-btn>
            </v-btn-toggle>

            <v-text-field
              v-model.number="form.threshold"
              label="Threshold"
              variant="outlined"
              density="compact"
              type="number"
              style="max-width: 140px"
              :rules="[v => v !== null && v !== undefined && v !== '' || 'Required']"
            />
          </div>

          <v-text-field
            v-model.number="form.cooldown_seconds"
            label="Cooldown (seconds)"
            variant="outlined"
            density="compact"
            type="number"
            class="mb-3"
          />

          <div
            v-if="!isEdit"
            class="mb-3"
          >
            <div class="text-caption mb-1">
              Window: {{ formatSeconds(form.window_seconds) }}
            </div>

            <v-slider
              v-model="form.window_seconds"
              min="60"
              max="3600"
              step="60"
              color="primary"
              hide-details
            />
          </div>

          <v-select
            v-if="!isEdit"
            v-model="form.severity"
            label="Severity"
            variant="outlined"
            density="compact"
            class="mb-3"
            :items="severityOptions"
            item-title="label"
            item-value="value"
          />
        </v-form>
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
          @click="handleSubmit"
        >
          {{ isEdit
            ? 'Save'
            : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { AlertRule, CreateAlertRuleRequest, UpdateAlertRuleRequest } from '~/types/alerts'

const props = defineProps<{
  modelValue: boolean
  projectId: number
  rule?: AlertRule
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const alertsStore = useAlertsStore()

const isEdit = computed(() => !!props.rule)
const dialogOpen = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const formRef = ref()
const saving = ref(false)

const form = reactive({
  name: '',
  metric: '',
  comparator: '>' as '>' | '<' | '>=' | '<=',
  threshold: 0,
  window_seconds: 300,
  cooldown_seconds: 300,
  severity: 1,
})

watch(() => props.rule, (rule) => {
  if (rule) {
    form.name = rule.name
    form.metric = rule.metric
    form.comparator = rule.comparator
    form.threshold = rule.threshold
    form.window_seconds = rule.window_seconds
    form.cooldown_seconds = rule.cooldown_seconds
    form.severity = rule.severity
  }
  else {
    form.name = ''
    form.metric = ''
    form.comparator = '>'
    form.threshold = 0
    form.window_seconds = 300
    form.cooldown_seconds = 300
    form.severity = 1
  }
}, { immediate: true })

const builtInMetrics = [
  { label: 'Error rate', value: 'error_rate' },
  { label: 'Log volume', value: 'log_volume' },
  { label: 'Endpoint p95 latency', value: 'endpoint_p95' },
]

const metricOptions = computed(() => builtInMetrics)

const comparatorOptions = ['>', '<', '>=', '<=']

const severityOptions = [
  { label: 'Info', value: 0 },
  { label: 'Warning', value: 1 },
  { label: 'Critical', value: 2 },
]

function formatSeconds(s: number): string {
  if (s >= 3600)
    return `${s / 3600}h`
  if (s >= 60)
    return `${s / 60}m`

  return `${s}s`
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid)
    return

  saving.value = true
  try {
    if (isEdit.value && props.rule) {
      const data: UpdateAlertRuleRequest = {
        name: form.name,
        threshold: form.threshold,
        cooldown_seconds: form.cooldown_seconds,
      }
      await alertsStore.updateRule(props.rule.id, props.projectId, data)
    }
    else {
      const data: CreateAlertRuleRequest = {
        project_id: props.projectId,
        name: form.name,
        metric: form.metric,
        comparator: form.comparator,
        threshold: form.threshold,
        window_seconds: form.window_seconds,
        cooldown_seconds: form.cooldown_seconds,
        severity: form.severity,
      }
      await alertsStore.createRule(data)
    }

    emit('saved')
    dialogOpen.value = false
  }
  catch (error: any) {
    console.error('Error saving alert rule:', error)
  }
  finally {
    saving.value = false
  }
}

</script>
