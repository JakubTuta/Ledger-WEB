<template>
  <div class="mb-3">
    <v-switch
      :model-value="includeClientErrors"
      label="Include 4xx client errors"
      color="primary"
      density="compact"
      hide-details
      :loading="isSaving"
      :disabled="isSaving"
      @update:model-value="save"
    />

    <div class="text-caption text-medium-emphasis">
      Off lists only exceptions, error-level logs and 5xx responses.
    </div>

    <div
      v-if="saveError"
      class="text-caption text-error mt-1"
    >
      {{ saveError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Panel } from '~/types/panel'

const props = defineProps<{
  panel: Panel
}>()

const panelsStore = usePanelsStore()

const isSaving = ref(false)
const saveError = ref('')

const includeClientErrors = computed(() => props.panel.include_client_errors ?? true)

async function save(include: boolean | null) {
  isSaving.value = true
  saveError.value = ''

  const result = await panelsStore.setErrorListClientErrors(props.panel.id, include === true)

  if (!result.success)
    saveError.value = result.error ?? 'Failed to save the 4xx setting'

  isSaving.value = false
}
</script>
