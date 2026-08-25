<template>
  <v-dialog
    v-model="isOpen"
    max-width="500"
    :fullscreen="$vuetify.display.smAndDown"
    persistent
  >
    <v-card>
      <v-card-title class="text-h6">
        Join Project
      </v-card-title>

      <v-card-text>
        <v-form
          ref="formRef"
          v-model="isFormValid"
          @submit.prevent="handleJoin"
        >
          <v-text-field
            v-model="code"
            label="Invite Code"
            variant="outlined"
            :disabled="loading || !!successData"
            :rules="inviteCodeRules"
            :color="code && inviteCodeRules.every(rule => rule(code) === true)
              ? 'success'
              : code && inviteCodeRules.some(rule => rule(code) !== true)
                ? 'error'
                : undefined"
            validate-on="input"
            hint="Enter the invite code you received (e.g. XXXX-XXXX-XXXX)"
            persistent-hint
            placeholder="XXXX-XXXX-XXXX"
          >
            <template #append-inner>
              <v-icon
                v-if="code && inviteCodeRules.every(rule => rule(code) === true)"
                color="success"
              >
                mdi-check-circle
              </v-icon>

              <v-icon
                v-else-if="code && inviteCodeRules.some(rule => rule(code) !== true)"
                color="error"
              >
                mdi-close-circle
              </v-icon>
            </template>
          </v-text-field>
        </v-form>

        <v-alert
          v-if="successData"
          type="success"
          variant="flat"
          class="mt-4"
        >
          Joined <strong>{{ successData.project_name }}</strong> as {{ successData.role }}.
        </v-alert>

        <v-alert
          v-if="error"
          type="error"
          density="compact"
          class="mt-4"
        >
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn
          variant="text"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ successData
            ? 'Close'
            : 'Cancel' }}
        </v-btn>

        <v-btn
          v-if="!successData"
          color="primary"
          :loading="loading"
          :disabled="!isFormValid"
          @click="handleJoin"
        >
          Join
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { AcceptInviteResponse } from '~/types/sharing'
import { inviteCodeRules } from '~/utils/validation'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'joined': []
}>()

const sharingStore = useSharingStore()

const formRef = ref()
const code = ref('')
const isFormValid = ref(false)
const loading = ref(false)
const error = ref('')
const successData = ref<AcceptInviteResponse | null>(null)

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    reset()
  }
})

function reset() {
  code.value = ''
  error.value = ''
  successData.value = null
  loading.value = false
  if (formRef.value) {
    formRef.value.reset()
  }
}

async function handleJoin() {
  if (!isFormValid.value || loading.value)
    return

  error.value = ''
  loading.value = true

  const result = await sharingStore.acceptInviteCode(code.value)

  if (result.success && result.project) {
    successData.value = result.project
    emit('joined')
    setTimeout(() => {
      isOpen.value = false
    }, 1500)
  }
  else {
    error.value = result.error || 'Failed to join project'
  }

  loading.value = false
}

function handleCancel() {
  isOpen.value = false
}
</script>
