<template>
  <div class="health-strip">
    <!-- Loading -->
    <div
      v-if="healthStore.isLoading && summaries.length === 0"
      class="d-flex gap-3 pa-1"
    >
      <v-skeleton-loader
        v-for="n in skeletonCount"
        :key="n"
        type="card"
        width="200"
        height="130"
      />
    </div>

    <!-- No projects -->
    <div
      v-else-if="summaries.length === 0"
      class="text-caption text-medium-emphasis pa-2"
    >
      No project health data
    </div>

    <!-- Cards -->
    <div
      v-else
      class="d-flex gap-3 pa-1 overflow-x-auto"
    >
      <HealthCard
        v-for="summary in summaries"
        :key="summary.project_id"
        :summary="summary"
        :project-name="getProjectName(summary.project_id)"
        :environment="getProjectEnvironment(summary.project_id)"
        @click="emit('project-click', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectHealthSummary } from '~/types/health'

const emit = defineEmits<{
  'project-click': [projectId: string]
}>()

const healthStore = useHealthStore()
const projectsStore = useProjectsStore()

const summaries = computed<ProjectHealthSummary[]>(() =>
  Array.from(healthStore.summaries.values()),
)

const skeletonCount = computed(() =>
  Math.min(projectsStore.projects.length || 3, 5),
)

function getProjectName(projectId: string): string {
  return projectsStore.projects.find(p => String(p.project_id) === projectId)?.name ?? projectId
}

function getProjectEnvironment(projectId: string): string {
  return projectsStore.projects.find(p => String(p.project_id) === projectId)?.environment ?? ''
}
</script>

<style scoped>
.health-strip {
  width: 100%;
}

.overflow-x-auto {
  overflow-x: auto;
  scrollbar-width: thin;
}

.overflow-x-auto::-webkit-scrollbar {
  height: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 2px;
}
</style>
