<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-4">
      <div />

      <CreateProjectDialog />
    </div>

    <v-progress-linear
      v-if="projectsStore.isLoading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <v-list
      v-if="projects.length > 0"
      lines="three"
    >
      <v-list-item
        v-for="project in projects"
        :key="project.project_id"
        class="mb-2 border rounded"
      >
        <template #prepend>
          <v-avatar
            :color="getEnvironmentColor(project.environment)"
            class="text-white"
          >
            <v-icon icon="mdi-folder" />
          </v-avatar>
        </template>

        <v-list-item-title class="font-weight-bold">
          {{ project.name }}
        </v-list-item-title>

        <v-list-item-subtitle>
          <div class="d-flex align-center mt-1 flex-wrap gap-2">
            <v-chip
              size="small"
              :color="getEnvironmentColor(project.environment)"
              variant="flat"
            >
              {{ project.environment }}
            </v-chip>

            <span class="text-caption">
              Slug: {{ project.slug }}
            </span>

            <span class="text-caption">
              •
            </span>

            <span class="text-caption">
              Quota: {{ formatQuota(project.logs_daily_quota) }}/day
            </span>
          </div>
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>

    <v-alert
      v-else-if="!projectsStore.isLoading"
      type="info"
      variant="flat"
    >
      No projects found. Create your first project to get started.
    </v-alert>
  </div>
</template>

<script setup lang="ts">
const projectsStore = useProjectsStore()
const { projects } = storeToRefs(projectsStore)

function getEnvironmentColor(environment: string): string {
  const colors: Record<string, string> = {
    production: 'error',
    staging: 'warning',
    development: 'info',
  }

  return colors[environment.toLowerCase()] || 'grey'
}

function formatQuota(quota: number): string {
  if (quota >= 1_000_000) {
    return `${(quota / 1_000_000).toFixed(1)}M`
  }
  if (quota >= 1_000) {
    return `${(quota / 1_000).toFixed(1)}K`
  }

  return quota.toString()
}
</script>
