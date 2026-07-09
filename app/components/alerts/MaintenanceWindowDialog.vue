<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span class="text-h6">New maintenance window</span>

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

          <v-text-field
            v-model="startsAt"
            label="Starts at"
            type="datetime-local"
            variant="outlined"
            density="compact"
            :rules="[v => !!v || 'Start time required']"
            class="mb-3"
          />

          <v-text-field
            v-model="endsAt"
            label="Ends at"
            type="datetime-local"
            variant="outlined"
            density="compact"
            :rules="[v => !!v || 'End time required']"
            class="mb-3"
          />

          <v-select
            v-model="recurrence"
            label="Recurrence"
            variant="outlined"
            density="compact"
            :items="recurrenceOptions"
            item-title="title"
            item-value="value"
            hide-details
          />

          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
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
          Create
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { MaintenanceRecurrence } from '~/types/alerts'

const props = defineProps<{
  modelValue: boolean
  projectId: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'saved': []
}>()

const alertsStore = useAlertsStore()

const recurrenceOptions = [
  { title: 'One-off', value: 'none' },
  { title: 'Daily (time-of-day only)', value: 'daily' },
  { title: 'Weekly (day + time-of-day)', value: 'weekly' },
]

const formRef = ref()
const name = ref('')
const startsAt = ref('')
const endsAt = ref('')
const recurrence = ref<MaintenanceRecurrence>('none')
const saving = ref(false)
const errorMessage = ref('')

watch(() => props.modelValue, (open) => {
  if (open)
    resetForm()
})

function resetForm() {
  errorMessage.value = ''
  name.value = ''
  startsAt.value = ''
  endsAt.value = ''
  recurrence.value = 'none'
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid || !props.projectId)
    return

  saving.value = true
  errorMessage.value = ''

  const result = await alertsStore.createMaintenanceWindow({
    project_id: props.projectId,
    name: name.value,
    starts_at: new Date(startsAt.value).toISOString(),
    ends_at: new Date(endsAt.value).toISOString(),
    recurrence: recurrence.value,
  })

  saving.value = false

  if (result.success) {
    emit('saved')
    close()
  }
  else {
    errorMessage.value = result.error || 'Failed to create maintenance window'
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>
