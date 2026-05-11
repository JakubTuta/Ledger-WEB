<template>
  <div style="max-width: 600px; width: 100%;">
    <v-form ref="nameFormRef">
      <v-text-field
        v-model="name"
        label="Name"
        variant="outlined"
        :disabled="nameLoading"
        :rules="nameRules"
        :color="name && nameRules.every(rule => rule(name) === true)
          ? 'success'
          : name && nameRules.some(rule => rule(name) !== true)
            ? 'error'
            : undefined"
        validate-on="input"
      >
        <template #append-inner>
          <v-icon
            v-if="name && nameRules.every(rule => rule(name) === true) && name !== authStore.user?.name"
            color="success"
          >
            mdi-check-circle
          </v-icon>

          <v-icon
            v-else-if="name && nameRules.some(rule => rule(name) !== true)"
            color="error"
          >
            mdi-close-circle
          </v-icon>
        </template>

        <template
          v-if="name !== authStore.user?.name"
          #append
        >
          <v-btn
            color="primary"
            :loading="nameLoading"
            :disabled="!isNameValid || nameLoading"
            @click="handleUpdateName"
          >
            Update
          </v-btn>
        </template>
      </v-text-field>

      <v-alert
        v-if="nameSuccess"
        type="success"
        density="compact"
        class="mb-4"
        closable
        @click:close="nameSuccess = ''"
      >
        {{ nameSuccess }}
      </v-alert>

      <v-alert
        v-if="nameError"
        type="error"
        density="compact"
        class="mb-4"
        closable
        @click:close="nameError = ''"
      >
        {{ nameError }}
      </v-alert>
    </v-form>

    <v-text-field
      :model-value="authStore.user?.email"
      label="Email"
      type="email"
      variant="outlined"
      class="mb-6"
      readonly
    />
  </div>

  <v-divider class="my-6" />

  <ChangePasswordForm />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { nameRules } from '~/utils/validation'

const authStore = useAuthStore()

const nameFormRef = ref()
const name = ref('')
const nameLoading = ref(false)
const nameSuccess = ref('')
const nameError = ref('')

const isNameValid = computed(() => {
  return name.value && nameRules.every(rule => rule(name.value) === true)
})

watch(() => authStore.user?.name, (newName) => {
  name.value = newName || ''
}, { immediate: true })

async function handleUpdateName() {
  if (!isNameValid.value || nameLoading.value)
    return

  nameLoading.value = true
  nameSuccess.value = ''
  nameError.value = ''

  try {
    const result = await authStore.updateName(name.value)

    if (result.success) {
      nameSuccess.value = result.message || 'Name updated successfully'
      setTimeout(() => {
        nameSuccess.value = ''
      }, 3000)
    }
    else {
      nameError.value = result.error || 'Failed to update name'
      name.value = authStore.user?.name || ''
      setTimeout(() => {
        nameError.value = ''
      }, 5000)
    }
  }
  catch (error: any) {
    nameError.value = error.message || 'Failed to update name'
    name.value = authStore.user?.name || ''
    setTimeout(() => {
      nameError.value = ''
    }, 5000)
  }
  finally {
    nameLoading.value = false
  }
}
</script>
