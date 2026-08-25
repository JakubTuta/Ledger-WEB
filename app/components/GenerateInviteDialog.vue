<template>
  <v-dialog
    v-model="isOpen"
    max-width="500"
    :fullscreen="$vuetify.display.smAndDown"
    persistent
  >
    <v-card>
      <v-card-title class="text-h6">
        Generate Invite Code
      </v-card-title>

      <v-card-subtitle class="pb-0">
        {{ projectName }}
      </v-card-subtitle>

      <v-card-text>
        <div
          v-if="loading"
          class="d-flex justify-center py-6"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>

        <template v-else-if="inviteData">
          <v-alert
            type="warning"
            variant="flat"
            class="mb-4"
          >
            Code expires in 1 hour. Copy now — anyone with this code can join the project.
          </v-alert>

          <v-text-field
            :model-value="inviteData.code"
            label="Invite Code"
            variant="outlined"
            readonly
            density="compact"
            class="mb-2"
          >
            <template #append-inner>
              <v-btn
                :icon="copied
                  ? 'mdi-check'
                  : 'mdi-content-copy'"
                variant="text"
                size="small"
                :color="copied
                  ? 'success'
                  : undefined"
                @click="copyToClipboard"
              />
            </template>
          </v-text-field>

          <div class="text-caption text-grey">
            Expires at: {{ formatExpiry(inviteData.expires_at) }}
          </div>
        </template>

        <v-alert
          v-else-if="error"
          type="error"
          density="compact"
        >
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn
          variant="text"
          @click="handleClose"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { InviteCodeResponse } from '~/types/sharing'

const props = defineProps<{
  modelValue: boolean
  projectId: number
  projectName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const sharingStore = useSharingStore()

const loading = ref(false)
const error = ref('')
const inviteData = ref<InviteCodeResponse | null>(null)
const copied = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    await generateCode()
  }
  else {
    reset()
  }
})

async function generateCode() {
  loading.value = true
  error.value = ''
  inviteData.value = null

  const result = await sharingStore.generateInviteCode(props.projectId)

  if (result.success && result.data) {
    inviteData.value = result.data
  }
  else {
    error.value = result.error || 'Failed to generate invite code'
  }

  loading.value = false
}

function reset() {
  loading.value = false
  error.value = ''
  inviteData.value = null
  copied.value = false
}

function handleClose() {
  isOpen.value = false
}

async function copyToClipboard() {
  if (!inviteData.value)
    return

  try {
    await navigator.clipboard.writeText(inviteData.value.code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

function formatExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleString()
}
</script>
