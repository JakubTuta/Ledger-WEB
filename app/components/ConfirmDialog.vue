<template>
  <v-dialog
    v-model="isOpen"
    max-width="500"
    persistent
  >
    <v-card>
      <v-card-title class="text-h6">
        {{ title }}
      </v-card-title>

      <v-card-text>
        {{ message }}
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn
          variant="text"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ cancelText }}
        </v-btn>

        <v-btn
          color="error"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
}>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  isOpen.value = false
  emit('cancel')
}
</script>
