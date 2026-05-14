<template>
  <div>
    <v-alert
      v-if="errorMessage"
      type="error"
      density="compact"
      closable
      class="mb-4"
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>

    <v-alert
      v-if="projects.length === 0 && !projectsStore.isLoading"
      type="info"
    >
      No projects found. Create a project to manage features.
    </v-alert>

    <div
      v-for="(project, index) in projects"
      :key="project.project_id"
      :class="{'mb-4': index < projects.length - 1}"
    >
      <v-card variant="elevated">
        <v-card-title class="d-flex align-center">
          <span>{{ project.name }}</span>

          <v-chip
            size="x-small"
            :color="project.environment === 'production'
              ? 'error'
              : 'primary'"
            variant="flat"
            class="ml-2"
          >
            {{ project.environment }}
          </v-chip>
        </v-card-title>

        <v-card-text>
          <v-list density="compact">
            <v-list-item
              v-for="feature in featureList"
              :key="feature.key"
              :title="feature.label"
              :subtitle="feature.description"
            >
              <template #append>
                <v-switch
                  :model-value="project.features?.[feature.key] ?? false"
                  color="primary"
                  hide-details
                  density="compact"
                  :loading="pending.has(`${project.project_id}:${feature.key}`)"
                  :disabled="pending.has(`${project.project_id}:${feature.key}`)"
                  @update:model-value="(v: boolean | null) => toggleFeature(project.project_id, feature.key, !!v)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectFeatures } from '~/types/project'

type FeatureKey = keyof ProjectFeatures

const projectsStore = useProjectsStore()
const { projects } = storeToRefs(projectsStore)

const pending = ref<Set<string>>(new Set())
const errorMessage = ref('')

const featureList: { key: FeatureKey, label: string, description: string }[] = [
  { key: 'tracing', label: 'Tracing', description: 'Required for Trace List and Single Trace panels.' },
  { key: 'custom_metrics', label: 'Custom Metrics', description: 'Required for Custom Metric panels.' },
  { key: 'alert_rules', label: 'Alert Rules', description: 'Enable alert rules for this project.' },
]

async function toggleFeature(projectId: number, key: FeatureKey, enabled: boolean) {
  const lockKey = `${projectId}:${key}`
  if (pending.value.has(lockKey))
    return

  pending.value.add(lockKey)
  errorMessage.value = ''

  const result = await projectsStore.updateFeature(projectId, key, enabled)
  if (!result.success) {
    errorMessage.value = result.error || 'Failed to update feature'
  }

  pending.value.delete(lockKey)
}
</script>
