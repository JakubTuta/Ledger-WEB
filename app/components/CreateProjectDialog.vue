<template>
  <v-dialog
    v-model="dialogModel"
    max-width="600"
    :fullscreen="$vuetify.display.smAndDown"
  >
    <template #activator="{props}">
      <v-btn
        v-bind="props"
        color="primary"
        prepend-icon="mdi-plus"
      >
        Create Project
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="text-h5 font-weight-bold">
        Create New Project
      </v-card-title>

      <v-card-text>
        <v-form
          ref="formRef"
          v-model="isFormValid"
          @submit.prevent="handleSubmit"
        >
          <v-text-field
            v-model="projectName"
            label="Project Name"
            :rules="nameRules"
            required
            autofocus
            @update:model-value="updateSlug"
          />

          <v-text-field
            v-model="projectSlug"
            class="mt-4"
            label="Slug"
            :rules="slugRules"
            hint="Auto-generated from project name (alphanumeric and hyphens only)"
            persistent-hint
            required
          />

          <v-select
            v-model="projectEnvironment"
            class="mt-4"
            :items="environmentOptions"
            label="Environment"
            :rules="environmentRules"
            required
          />

          <v-alert
            v-if="errorMessage"
            class="mt-4"
            type="error"
            closable
            @click:close="errorMessage = ''"
          >
            {{ errorMessage }}
          </v-alert>

          <v-alert
            v-if="successMessage"
            class="mt-4"
            type="success"
            closable
            @click:close="successMessage = ''"
          >
            {{ successMessage }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-btn
          variant="text"
          @click="closeDialog"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          :disabled="!isFormValid || isLoading"
          :loading="isLoading"
          @click="handleSubmit"
        >
          Create Project
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { generateSlug } from '~/utils/slug'

const dialogModel = ref(false)
const formRef = ref<any>(null)
const isFormValid = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const projectName = ref('')
const projectSlug = ref('')
const projectEnvironment = ref('production')

const environmentOptions = [
  { title: 'Production', value: 'production' },
  { title: 'Staging', value: 'staging' },
  { title: 'Development', value: 'development' },
]

const nameRules = [
  (v: string) => !!v || 'Project name is required',
  (v: string) => (v && v.length >= 2) || 'Project name must be at least 2 characters',
  (v: string) => (v && v.length <= 100) || 'Project name must be less than 100 characters',
]

const slugRules = [
  (v: string) => !!v || 'Slug is required',
  (v: string) => (v && v.length >= 2) || 'Slug must be at least 2 characters',
  (v: string) => /^[a-z0-9-]+$/.test(v) || 'Slug must contain only lowercase letters, numbers, and hyphens',
]

const environmentRules = [
  (v: string) => !!v || 'Environment is required',
]

const projectsStore = useProjectsStore()

function updateSlug() {
  projectSlug.value = generateSlug(projectName.value)
}

async function handleSubmit() {
  if (!formRef.value)
    return

  const { valid } = await formRef.value.validate()
  if (!valid)
    return

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  const result = await projectsStore.createProject({
    name: projectName.value,
    slug: projectSlug.value,
    environment: projectEnvironment.value,
  })

  isLoading.value = false

  if (result.success) {
    successMessage.value = 'Project created successfully!'

    setTimeout(() => {
      closeDialog()
    }, 1500)
  }
  else {
    errorMessage.value = result.error || 'Failed to create project'
  }
}

function closeDialog() {
  dialogModel.value = false
  resetForm()
}

function resetForm() {
  projectName.value = ''
  projectSlug.value = ''
  projectEnvironment.value = 'production'
  errorMessage.value = ''
  successMessage.value = ''
  formRef.value?.resetValidation()
}
</script>
