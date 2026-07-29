<template>
  <div>
    <v-progress-linear
      v-if="notificationsStore.isLoading && !notificationsStore.hasData"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <div v-else>
      <!-- Global Settings -->
      <v-card
        variant="outlined"
        class="mb-6"
      >
        <v-card-text>
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-h6 mb-1">
                Enable Notifications
              </div>

              <div class="text-caption text-medium-emphasis">
                Receive real-time notifications for error and critical exceptions
              </div>
            </div>

            <v-switch
              v-model="globalEnabled"
              color="primary"
              hide-details
              :disabled="notificationsStore.isLoading"
              @update:model-value="handleGlobalToggle"
            />
          </div>
        </v-card-text>
      </v-card>

      <!-- Per-Project Settings -->
      <div
        v-if="globalEnabled"
        class="mb-4"
      >
        <div class="text-subtitle-1 font-weight-bold mb-3">
          Project-specific Settings
        </div>

        <v-alert
          v-if="projects.length === 0"
          type="info"
          variant="flat"
        >
          No projects found. Create a project to configure notifications.
        </v-alert>

        <v-expansion-panels
          v-else
          variant="accordion"
        >
          <v-expansion-panel
            v-for="project in projects"
            :key="project.project_id"
            class="mb-2"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div class="d-flex align-center gap-3">
                  <v-avatar
                    :color="getEnvironmentColor(project.environment)"
                    size="32"
                    class="text-white"
                  >
                    <v-icon
                      icon="mdi-folder"
                      size="20"
                    />
                  </v-avatar>

                  <div>
                    <div class="font-weight-bold">
                      {{ project.name }}
                    </div>

                    <div class="text-caption text-medium-emphasis">
                      <v-chip
                        size="x-small"
                        :color="getEnvironmentColor(project.environment)"
                        variant="flat"
                        class="mr-2"
                      >
                        {{ project.environment }}
                      </v-chip>
                      {{ getProjectSettingsSummary(project.project_id) }}
                    </div>
                  </div>
                </div>

                <v-switch
                  v-model="projectSettings[project.project_id].enabled"
                  color="primary"
                  hide-details
                  density="compact"
                  :disabled="notificationsStore.isLoading"
                  @click.stop
                  @update:model-value="handleProjectToggle(project.project_id)"
                />
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <div
                v-if="projectSettings[project.project_id].enabled"
                class="pt-4"
              >
                <!-- Notification Levels -->
                <div>
                  <div class="text-subtitle-2 mb-2">
                    Notification Levels
                  </div>

                  <div class="text-caption text-medium-emphasis mb-3">
                    Leave empty to receive all exception levels (error and critical)
                  </div>

                  <div class="d-flex flex-wrap gap-2">
                    <v-chip
                      v-for="level in availableLevels"
                      :key="level.value"
                      :color="level.color"
                      :variant="isLevelSelected(project.project_id, level.value)
                        ? 'flat'
                        : 'outlined'"
                      @click="toggleLevel(project.project_id, level.value)"
                    >
                      <v-icon
                        v-if="isLevelSelected(project.project_id, level.value)"
                        start
                        icon="mdi-check"
                      />
                      {{ level.label }}
                    </v-chip>
                  </div>
                </div>
              </div>

              <v-alert
                v-else
                type="info"
                variant="flat"
                density="compact"
                class="mt-4"
              >
                Enable notifications for this project to configure exception levels
              </v-alert>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- Success Alert -->
      <v-alert
        v-if="showSuccessAlert"
        type="success"
        variant="flat"
        class="mt-4"
      >
        Notification preferences updated successfully
      </v-alert>

      <!-- Error Alert -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="flat"
        class="mt-4"
      >
        {{ errorMessage }}
      </v-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NotificationLevel, ProjectNotificationSettings } from '~/types/notifications'

const notificationsStore = useNotificationsStore()
const projectsStore = useProjectsStore()
const { projects } = storeToRefs(projectsStore)

const globalEnabled = ref(false)
const projectSettings = ref<Record<number, ProjectNotificationSettings>>({})
const showSuccessAlert = ref(false)
const errorMessage = ref('')

const availableLevels = [
  { value: 'critical' as NotificationLevel, label: 'Critical', color: 'error' },
  { value: 'error' as NotificationLevel, label: 'Error', color: 'error' },
]

function getEnvironmentColor(environment: string): string {
  const colors: Record<string, string> = {
    production: 'error',
    staging: 'warning',
    development: 'info',
  }

  return colors[environment.toLowerCase()] || 'grey'
}

function getProjectSettingsSummary(projectId: number): string {
  const settings = projectSettings.value[projectId]
  if (!settings || !settings.enabled)
    return 'Disabled'

  if (settings.levels.length === 0) {
    return 'All exception levels'
  }

  if (settings.levels.length === 1) {
    return `${settings.levels[0].charAt(0).toUpperCase() + settings.levels[0].slice(1)} only`
  }

  return 'Error and Critical'
}

function isLevelSelected(projectId: number, level: NotificationLevel): boolean {
  return projectSettings.value[projectId]?.levels.includes(level) || false
}

async function toggleLevel(projectId: number, level: NotificationLevel) {
  const settings = projectSettings.value[projectId]
  if (!settings)
    return

  const index = settings.levels.indexOf(level)
  if (index > -1) {
    settings.levels.splice(index, 1)
  }
  else {
    settings.levels.push(level)
  }

  await savePreferences()
}

async function handleGlobalToggle() {
  await savePreferences()
}

async function handleProjectToggle(_projectId: number) {
  await savePreferences()
}

async function savePreferences() {
  errorMessage.value = ''
  showSuccessAlert.value = false

  const updates = {
    enabled: globalEnabled.value,
    projects: Object.fromEntries(
      Object.entries(projectSettings.value).map(([id, settings]) => [id.toString(), settings]),
    ),
  }

  const result = await notificationsStore.updatePreferences(updates)

  if (result.success) {
    showSuccessAlert.value = true
    setTimeout(() => {
      showSuccessAlert.value = false
    }, 3000)
  }
  else {
    errorMessage.value = result.error || 'Failed to update preferences'
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  }
}

function initializeProjectSettings() {
  projects.value.forEach((project) => {
    const projectIdStr = project.project_id.toString()
    const existingSettings = notificationsStore.preferences?.projects[projectIdStr]

    projectSettings.value[project.project_id] = existingSettings || {
      enabled: false,
      levels: [],
      types: ['exception'],
    }
  })
}

function loadPreferences() {
  if (notificationsStore.preferences) {
    globalEnabled.value = notificationsStore.preferences.enabled
    initializeProjectSettings()
  }
}

watch(() => notificationsStore.preferences, () => {
  loadPreferences()
}, { deep: true })

watch(projects, () => {
  initializeProjectSettings()
}, { immediate: true })

onMounted(async () => {
  await notificationsStore.fetchPreferences()
  loadPreferences()
})
</script>
