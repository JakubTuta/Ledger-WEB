<template>
  <v-dialog
    v-model="isOpen"
    max-width="600"
    :fullscreen="$vuetify.display.smAndDown"
    persistent
  >
    <v-card>
      <v-card-title class="text-h6">
        Create New API Key
      </v-card-title>

      <v-card-text>
        <v-form
          ref="formRef"
          v-model="isFormValid"
          @submit.prevent="handleCreate"
        >
          <v-text-field
            v-model="name"
            label="API Key Name"
            variant="outlined"
            :disabled="loading"
            :rules="apiKeyNameRules"
            :color="name && apiKeyNameRules.every(rule => rule(name) === true)
              ? 'success'
              : name && apiKeyNameRules.some(rule => rule(name) !== true)
                ? 'error'
                : undefined"
            validate-on="input"
            hint="A descriptive name for your API key (e.g., 'Production API Key')"
            persistent-hint
          >
            <template #append-inner>
              <v-icon
                v-if="name && apiKeyNameRules.every(rule => rule(name) === true)"
                color="success"
              >
                mdi-check-circle
              </v-icon>

              <v-icon
                v-else-if="name && apiKeyNameRules.some(rule => rule(name) !== true)"
                color="error"
              >
                mdi-close-circle
              </v-icon>
            </template>
          </v-text-field>

          <v-select
            v-model="selectedProjectId"
            label="Project"
            variant="outlined"
            class="my-6"
            :disabled="loading || !!createdKey"
            :items="projectsStore.projects"
            item-title="name"
            item-value="project_id"
            :rules="[(v: any) => !!v || 'Project is required']"
            hint="Select the project for this API key"
            persistent-hint
          >
            <template #item="{'props': itemProps, item}">
              <v-list-item
                v-bind="itemProps"
                :subtitle="`${item.raw.environment} • ${item.raw.slug}`"
              />
            </template>

            <template #selection="{item}">
              <span>{{ item.raw.name }}</span>

              <span class="text-caption text-grey ml-2">({{ item.raw.environment }})</span>
            </template>
          </v-select>

          <v-alert
            v-if="createdKey"
            type="warning"
            variant="flat"
          >
            <div class="text-subtitle-2 mb-4">
              {{ createdKey.warning }}
            </div>

            <v-text-field
              :model-value="createdKey.full_key"
              label="Your API Key"
              variant="outlined"
              readonly
              density="compact"
              :type="showApiKey
                ? 'text'
                : 'password'"
            >
              <template #append-inner>
                <v-btn
                  :icon="showApiKey
                    ? 'mdi-eye-off'
                    : 'mdi-eye'"
                  variant="text"
                  size="small"
                  @click="showApiKey = !showApiKey"
                />

                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  size="small"
                  @click="copyToClipboard"
                />
              </template>
            </v-text-field>
          </v-alert>

          <v-expansion-panels
            v-if="createdKey"
            variant="accordion"
            class="mt-4"
          >
            <v-expansion-panel title="OpenTelemetry setup">
              <template #text>
                <div class="text-caption text-medium-emphasis mb-2">
                  Use this key with the Ledger Python SDK, or point any language's stock
                  OpenTelemetry SDK at these environment variables:
                </div>

                <v-sheet
                  color="surface-variant"
                  rounded
                  class="pa-3"
                  style="font-family: monospace; font-size: 12px; position: relative;"
                >
                  <v-btn
                    icon="mdi-content-copy"
                    variant="text"
                    size="x-small"
                    style="position: absolute; top: 4px; right: 4px;"
                    @click="copyOtelSnippet"
                  />

                  <div>OTEL_EXPORTER_OTLP_ENDPOINT=https://ledger-server.jtuta.cloud</div>

                  <div>OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf</div>

                  <div>OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer {{ createdKey.full_key }}</div>
                </v-sheet>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>

          <v-alert
            v-if="error"
            type="error"
            density="compact"
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
          {{ createdKey
            ? 'Close'
            : 'Cancel' }}
        </v-btn>

        <v-btn
          v-if="!createdKey"
          color="primary"
          :loading="loading"
          :disabled="!isFormValid || !selectedProjectId"
          @click="handleCreate"
        >
          Create API Key
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { apiKeyNameRules } from '~/utils/validation'

const props = defineProps<{
  modelValue: boolean
  projectId?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': []
}>()

const apiKeysStore = useApiKeysStore()
const projectsStore = useProjectsStore()

const formRef = ref()
const name = ref('')
const selectedProjectId = ref<number | null>(null)
const isFormValid = ref(false)
const loading = ref(false)
const error = ref('')
const createdKey = ref<{
  key_id: number
  full_key: string
  key_prefix: string
  warning: string
} | null>(null)
const showApiKey = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    selectedProjectId.value = props.projectId || (projectsStore.projects.length > 0
      ? projectsStore.projects[0].project_id
      : null)
  }
  else {
    resetForm()
  }
})

function resetForm() {
  name.value = ''
  selectedProjectId.value = null
  error.value = ''
  createdKey.value = null
  showApiKey.value = false
  if (formRef.value) {
    formRef.value.reset()
  }
}

async function handleCreate() {
  if (!isFormValid.value || loading.value || !selectedProjectId.value)
    return

  error.value = ''
  loading.value = true

  try {
    const result = await apiKeysStore.createApiKey(selectedProjectId.value, { name: name.value })

    if (result.success && result.apiKey) {
      createdKey.value = {
        key_id: result.apiKey.key_id,
        full_key: (result.apiKey as any).full_key || '',
        key_prefix: result.apiKey.key_prefix,
        warning: 'Save this key now! It will not be shown again.',
      }
      emit('created')
    }
    else {
      error.value = result.error || 'Failed to create API key'
    }
  }
  catch (err: any) {
    error.value = err.message || 'Failed to create API key'
  }
  finally {
    loading.value = false
  }
}

function handleCancel() {
  isOpen.value = false
}

async function copyToClipboard() {
  if (!createdKey.value)
    return

  try {
    await navigator.clipboard.writeText(createdKey.value.full_key)
  }
  catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

async function copyOtelSnippet() {
  if (!createdKey.value)
    return

  const snippet = [
    'OTEL_EXPORTER_OTLP_ENDPOINT=https://ledger-server.jtuta.cloud',
    'OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf',
    `OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer ${createdKey.value.full_key}`,
  ].join('\n')

  try {
    await navigator.clipboard.writeText(snippet)
  }
  catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}
</script>
