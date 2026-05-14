<template>
  <div>
    <div
      v-if="isLoading"
      class="pa-4"
    >
      <v-skeleton-loader
        v-for="i in 3"
        :key="i"
        type="card"
        class="mb-3"
      />
    </div>

    <template v-else>
      <div
        v-for="project in projects"
        :key="project.project_id"
        class="mb-4"
      >
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1 pa-3">
            {{ project.name }}
            <span class="text-caption text-medium-emphasis ml-1">{{ project.environment }}</span>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-3">
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Severity</th>

                  <th
                    v-for="kind in channelKinds"
                    :key="kind"
                    class="text-center"
                  >
                    <div class="d-flex align-center justify-center gap-1">
                      <v-icon
                        :icon="kindIcon(kind)"
                        size="16"
                      />
                      {{ kind }}
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="severity in severities"
                  :key="severity"
                >
                  <td>
                    <v-chip
                      :color="severityColor(severity)"
                      size="x-small"
                      variant="flat"
                    >
                      {{ severity }}
                    </v-chip>
                  </td>

                  <td
                    v-for="kind in channelKinds"
                    :key="kind"
                    class="text-center"
                  >
                    <v-checkbox
                      :model-value="isEnabled(project.project_id, severity, kind)"
                      density="compact"
                      hide-details
                      color="primary"
                      class="d-flex justify-center"
                      @update:model-value="toggle(project.project_id, severity, kind, $event)"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </div>

      <div
        v-if="projects.length === 0"
        class="text-medium-emphasis pa-4 text-center"
      >
        No projects available.
      </div>

      <div class="d-flex mt-4 justify-end">
        <v-btn
          color="primary"
          :loading="saving"
          prepend-icon="mdi-content-save"
          @click="save"
        >
          Save preferences
        </v-btn>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AlertChannelKind, AlertSeverity } from '~/types/alerts'
import type { NotificationPreferencesUpdate } from '~/types/notifications'

const projectsStore = useProjectsStore()
const { projects } = storeToRefs(projectsStore)
const { client } = useApiStore()

const isLoading = ref(false)
const saving = ref(false)

const channelKinds: AlertChannelKind[] = ['in_app', 'email', 'webhook']
const severities: AlertSeverity[] = ['info', 'warning', 'critical']

// Matrix: projectId -> severity -> kind -> enabled
type Matrix = Map<number, Map<string, Map<string, boolean>>>
const matrix = ref<Matrix>(new Map())

function isEnabled(projectId: number, severity: string, kind: string): boolean {
  return matrix.value.get(projectId)?.get(severity)?.get(kind) ?? true
}

function toggle(projectId: number, severity: string, kind: string, value: unknown) {
  if (!matrix.value.has(projectId))
    matrix.value.set(projectId, new Map())
  const proj = matrix.value.get(projectId)!
  if (!proj.has(severity))
    proj.set(severity, new Map())
  proj.get(severity)!.set(kind, value as boolean)
  matrix.value = new Map(matrix.value)
}

function kindIcon(kind: AlertChannelKind): string {
  const map: Record<string, string> = {
    in_app: 'mdi-bell',
    email: 'mdi-email',
    webhook: 'mdi-webhook',
  }

  return map[kind] ?? 'mdi-send'
}

function severityColor(severity: AlertSeverity): string {
  const map: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    critical: 'error',
  }

  return map[severity] ?? 'default'
}

async function loadPreferences() {
  isLoading.value = true
  try {
    const response = await client.get('/api/v1/alerts/notification-preferences')
    const prefs = response.data
    const newMatrix: Matrix = new Map()
    if (prefs.projects) {
      for (const [projectIdStr, settings] of Object.entries(prefs.projects)) {
        const projectId = Number(projectIdStr)
        const projMap = new Map<string, Map<string, boolean>>()
        if ((settings as any).channel_matrix) {
          for (const [sev, kinds] of Object.entries((settings as any).channel_matrix)) {
            const kindMap = new Map<string, boolean>()
            for (const [kind, enabled] of Object.entries(kinds as Record<string, boolean>)) {
              kindMap.set(kind, enabled)
            }
            projMap.set(sev, kindMap)
          }
        }
        newMatrix.set(projectId, projMap)
      }
    }
    matrix.value = newMatrix
  }
  catch (error) {
    console.error('Error loading notification preferences:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const projectsData: Record<string, any> = {}
    for (const project of projects.value) {
      const projMatrix = matrix.value.get(project.project_id)
      const channelMatrix: Record<string, Record<string, boolean>> = {}
      for (const severity of severities) {
        channelMatrix[severity] = {}
        for (const kind of channelKinds) {
          channelMatrix[severity][kind] = projMatrix?.get(severity)?.get(kind) ?? true
        }
      }
      projectsData[String(project.project_id)] = { channel_matrix: channelMatrix }
    }

    const payload: NotificationPreferencesUpdate = {
      enabled: true,
      projects: projectsData as any,
    }

    await client.put('/api/v1/alerts/notification-preferences', payload)
  }
  catch (error) {
    console.error('Error saving notification preferences:', error)
  }
  finally {
    saving.value = false
  }
}

onMounted(async () => {
  await projectsStore.fetchProjects()
  await loadPreferences()
})
</script>
