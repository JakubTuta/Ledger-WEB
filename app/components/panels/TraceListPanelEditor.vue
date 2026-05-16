<template>
  <v-dialog
    v-model="dialogOpen"
    max-width="480"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span>Configure Trace List Panel</span>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="dialogOpen = false"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
          <v-text-field
          v-model="form.service_filter"
          label="Service (optional)"
          variant="outlined"
          density="compact"
          class="mb-3"
          clearable
          placeholder="e.g. orders-api"
        />

        <v-text-field
          v-model="form.operation_filter"
          label="Operation (optional)"
          variant="outlined"
          density="compact"
          class="mb-3"
          clearable
          placeholder="e.g. GET /users/{id}"
        />

        <v-text-field
          v-model.number="form.min_duration_ms"
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
          v-model="form.has_error"
          label="Error filter"
          variant="outlined"
          density="compact"
          class="mb-3"
          :items="errorFilterOptions"
          item-title="label"
          item-value="value"
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
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const panelsStore = usePanelsStore()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const saving = ref(false)

const form = reactive({
  service_filter: props.panel.service_filter ?? '',
  operation_filter: props.panel.operation_filter ?? '',
  min_duration_ms: props.panel.min_duration_ms ?? null as number | null,
  has_error: props.panel.has_error ?? null as boolean | null,
})

watch(() => props.panel, (p) => {
  form.service_filter = p.service_filter ?? ''
  form.operation_filter = p.operation_filter ?? ''
  form.min_duration_ms = p.min_duration_ms ?? null
  form.has_error = p.has_error ?? null
})

const errorFilterOptions = [
  { label: 'All traces', value: null },
  { label: 'Errors only', value: true },
  { label: 'Success only', value: false },
]

async function handleSave() {
  saving.value = true
  try {
    await panelsStore.updatePanel(props.panel.id, {
      service_filter: form.service_filter || null,
      operation_filter: form.operation_filter || null,
      min_duration_ms: form.min_duration_ms ?? null,
      has_error: form.has_error,
    } as any)
    emit('saved')
    dialogOpen.value = false
  }
  finally {
    saving.value = false
  }
}
</script>
